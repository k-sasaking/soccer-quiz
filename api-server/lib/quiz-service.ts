// docs/api.md の各 API の中身（HTTP には依存しない）
// データは Prisma で DB（Neon / PostgreSQL）に読み書きする。テーブルは docs/db.md・prisma/schema.prisma。
// 挑戦は始めた利用者のもの。userId（ログイン中の利用者の users.id）が違う挑戦は、存在しないものとして扱う。

import { ApiError, playSessionNotFound, questionNotFound } from "./errors";
import type { Prisma } from "./generated/prisma/client";
import { prisma } from "./prisma";

const LABELS = ["A", "B", "C", "D"];
const CHOICE_COUNTS = [3, 4] as const;

// ---- レスポンスの形 ----

export type ChoiceView = { choiceNo: number; label: string; body: string };

export type PlaySessionView = {
  id: string;
  choiceCount: number;
  questionTotal: number;
  answeredCount: number;
  nextOrderNo: number | null;
  status: "inProgress" | "finished";
  createdAt: string;
  finishedAt: string | null;
};

export type QuestionView = {
  orderNo: number;
  questionTotal: number;
  body: string;
  choices: ChoiceView[];
  isAnswered: boolean;
};

export type AnswerView = {
  orderNo: number;
  isCorrect: boolean;
  selectedChoice: ChoiceView;
  correctChoice: ChoiceView;
  explanation: {
    quote: string;
    source: { fileName: string; sectionNo: number; sectionTitle: string };
    text: string;
  };
  answeredAt: string;
  nextOrderNo: number | null;
};

export type ResultView = {
  playSessionId: string;
  choiceCount: number;
  score: number;
  questionTotal: number;
  correctRate: number;
  finishedAt: string;
  reviews: {
    orderNo: number;
    questionBody: string;
    isCorrect: boolean;
    selectedChoice: ChoiceView;
    correctChoice: ChoiceView;
  }[];
};

// ---- DB の読み込み ----

// 挑戦と、その出題順（session_answers）。どの API でも最初に読む
const sessionSelect = {
  id: true,
  publicId: true,
  choiceCount: true,
  createdAt: true,
  finishedAt: true,
  answers: {
    select: { orderNo: true, questionId: true, selectedChoiceId: true },
    orderBy: { orderNo: "asc" },
  },
} satisfies Prisma.PlaySessionSelect;

type SessionRow = Prisma.PlaySessionGetPayload<{ select: typeof sessionSelect }>;
type SessionAnswerRow = SessionRow["answers"][number];

// 回答1件と、正解・解説を組み立てるのに必要なもの
const answerDetailInclude = {
  selectedChoice: true,
  question: {
    include: {
      choices: { where: { isCorrect: true } },
      sourceSection: { include: { source: true } },
    },
  },
} satisfies Prisma.SessionAnswerInclude;

type AnswerDetailRow = Prisma.SessionAnswerGetPayload<{ include: typeof answerDetailInclude }>;

type ChoiceRow = { choiceNo: number; body: string };

function toChoiceView(choice: ChoiceRow): ChoiceView {
  return { choiceNo: choice.choiceNo, label: LABELS[choice.choiceNo - 1], body: choice.body };
}

function correctChoiceOf(question: { id: bigint; choices: ChoiceRow[] }): ChoiceRow {
  const correct = question.choices[0];
  if (!correct) throw new Error(`question ${question.id} has no correct choice`);
  return correct;
}

// ---- 挑戦の状態 ----

// 他人の挑戦は、あるかどうかを外から確かめられないよう 403 ではなく 404 にする
async function getSession(userId: string, publicId: string): Promise<SessionRow> {
  const session = await prisma.playSession.findFirst({
    where: { publicId, userId: BigInt(userId) },
    select: sessionSelect,
  });
  if (!session) throw playSessionNotFound();
  return session;
}

function getSessionAnswer(session: SessionRow, orderNo: number): SessionAnswerRow {
  const answer = session.answers[orderNo - 1];
  if (!answer) throw questionNotFound();
  return answer;
}

function nextOrderNo(session: SessionRow): number | null {
  return session.answers.find((a) => a.selectedChoiceId === null)?.orderNo ?? null;
}

// 前の問題に答えていない問題は、見ることも答えることもできない
function assertUnlocked(session: SessionRow, orderNo: number) {
  const next = nextOrderNo(session);
  if (next !== null && orderNo > next) {
    throw new ApiError(409, "QUESTION_LOCKED", "前の問題に回答してから進んでください。");
  }
}

function toSessionView(session: SessionRow): PlaySessionView {
  return {
    id: session.publicId,
    choiceCount: session.choiceCount,
    questionTotal: session.answers.length,
    answeredCount: session.answers.filter((a) => a.selectedChoiceId !== null).length,
    nextOrderNo: nextOrderNo(session),
    status: session.finishedAt === null ? "inProgress" : "finished",
    createdAt: session.createdAt.toISOString(),
    finishedAt: session.finishedAt?.toISOString() ?? null,
  };
}

function toAnswerView(row: AnswerDetailRow, next: number | null): AnswerView {
  const selected = row.selectedChoice;
  if (!selected || !row.answeredAt) throw new Error(`answer ${row.playSessionId}/${row.orderNo} is not answered`);
  const { question } = row;
  const section = question.sourceSection;
  const source = section.source;

  return {
    orderNo: row.orderNo,
    isCorrect: selected.isCorrect,
    selectedChoice: toChoiceView(selected),
    correctChoice: toChoiceView(correctChoiceOf(question)),
    explanation: {
      quote: question.quote,
      source: { fileName: source.fileName, sectionNo: section.sectionNo, sectionTitle: section.title },
      text: `「${question.quote}」（${source.fileName} 「${section.sectionNo}. ${section.title}」より）`,
    },
    answeredAt: row.answeredAt.toISOString(),
    nextOrderNo: next,
  };
}

async function loadAnswerView(session: SessionRow, orderNo: number): Promise<AnswerView> {
  const row = await prisma.sessionAnswer.findUniqueOrThrow({
    where: { playSessionId_orderNo: { playSessionId: session.id, orderNo } },
    include: answerDetailInclude,
  });
  return toAnswerView(row, nextOrderNo(session));
}

// Fisher-Yates でシャッフルした新しい配列を返す
function shuffle<T>(list: T[]): T[] {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---- API ----

// 1. GET /quiz
export async function getQuiz() {
  const questionTotal = await prisma.question.count({ where: { deletedAt: null } });
  return { questionTotal, choiceCounts: [...CHOICE_COUNTS] };
}

// 2. POST /play-sessions
export async function createPlaySession(userId: string, choiceCount: number): Promise<PlaySessionView> {
  if (choiceCount !== 3 && choiceCount !== 4) {
    throw new ApiError(422, "INVALID_CHOICE_COUNT", "選択肢の数は3または4を指定してください。", [
      { field: "choiceCount", reason: "3 または 4 を指定してください。" },
    ]);
  }
  const targets = await prisma.question.findMany({ where: { deletedAt: null }, select: { id: true } });
  if (targets.length === 0) {
    throw new ApiError(409, "NO_QUESTIONS", "出題できる問題がありません。");
  }

  // 挑戦と、シャッフルした順の全問ぶんの回答行（未回答）を一緒に作る。public_id は DB が発行する
  const session = await prisma.playSession.create({
    data: {
      userId: BigInt(userId),
      choiceCount,
      answers: {
        createMany: { data: shuffle(targets).map((q, i) => ({ orderNo: i + 1, questionId: q.id })) },
      },
    },
    select: sessionSelect,
  });
  return toSessionView(session);
}

// 3. GET /play-sessions/{playSessionId}
export async function getPlaySession(userId: string, publicId: string): Promise<PlaySessionView> {
  return toSessionView(await getSession(userId, publicId));
}

// 4. PATCH /play-sessions/{playSessionId}
export async function finishPlaySession(userId: string, publicId: string, status: string): Promise<PlaySessionView> {
  const session = await getSession(userId, publicId);
  if (status !== "finished") {
    throw new ApiError(422, "INVALID_STATUS", "状態は finished にのみ変更できます。", [
      { field: "status", reason: "\"finished\" を指定してください。" },
    ]);
  }
  if (session.finishedAt !== null) return toSessionView(session);
  if (nextOrderNo(session) !== null) {
    throw new ApiError(409, "UNANSWERED_QUESTIONS", "すべての問題に回答してから終了してください。");
  }

  // 終了日時は DB の時刻で記録する（created_at も DB の時刻なので、CHECK「finished_at >= created_at」を
  // サーバーの時計のずれで破らない）。同時に終了しても、記録されるのは最初の1回だけ
  await prisma.$executeRaw`
    UPDATE play_sessions SET finished_at = now()
    WHERE id = ${session.id} AND finished_at IS NULL`;
  return toSessionView(await getSession(userId, publicId));
}

// 5. GET /play-sessions/{playSessionId}/questions/{orderNo}
export async function getSessionQuestion(userId: string, publicId: string, orderNo: number): Promise<QuestionView> {
  const session = await getSession(userId, publicId);
  const answer = getSessionAnswer(session, orderNo);
  assertUnlocked(session, orderNo);

  const question = await prisma.question.findUniqueOrThrow({
    where: { id: answer.questionId },
    select: {
      body: true,
      choices: {
        where: { choiceNo: { lte: session.choiceCount } },
        orderBy: { choiceNo: "asc" },
        select: { choiceNo: true, body: true },
      },
    },
  });
  return {
    orderNo,
    questionTotal: session.answers.length,
    body: question.body,
    choices: question.choices.map(toChoiceView),
    isAnswered: answer.selectedChoiceId !== null,
  };
}

// 6. PUT /play-sessions/{playSessionId}/questions/{orderNo}/answer
// created が true なら初回の登録（201）、false なら同じ回答の再送（200）
export async function putAnswer(
  userId: string,
  publicId: string,
  orderNo: number,
  choiceNo: number,
): Promise<{ created: boolean; answer: AnswerView }> {
  const session = await getSession(userId, publicId);
  const answer = getSessionAnswer(session, orderNo);

  if (choiceNo < 1 || choiceNo > session.choiceCount) {
    throw new ApiError(422, "CHOICE_OUT_OF_RANGE", "選択肢の番号が範囲外です。", [
      { field: "choiceNo", reason: `1〜${session.choiceCount} を指定してください。` },
    ]);
  }
  const choice = await prisma.choice.findUniqueOrThrow({
    where: { questionId_choiceNo: { questionId: answer.questionId, choiceNo } },
    select: { id: true },
  });

  // すでに回答済みなら、同じ回答の再送だけ受け付ける
  const resend = async (latest: SessionRow, selectedChoiceId: bigint) => {
    if (selectedChoiceId !== choice.id) {
      throw new ApiError(409, "ALREADY_ANSWERED", "この問題はすでに回答済みです。");
    }
    return { created: false, answer: await loadAnswerView(latest, orderNo) };
  };

  if (answer.selectedChoiceId !== null) return resend(session, answer.selectedChoiceId);
  if (session.finishedAt !== null) {
    throw new ApiError(409, "ALREADY_FINISHED", "この挑戦はすでに終了しています。");
  }
  assertUnlocked(session, orderNo);

  // 未回答のときだけ書き込む。同時に2つの回答が届いても、記録されるのは先に届いた1つだけ
  const { count } = await prisma.sessionAnswer.updateMany({
    where: { playSessionId: session.id, orderNo, selectedChoiceId: null },
    data: { selectedChoiceId: choice.id, answeredAt: new Date() },
  });
  if (count === 0) {
    const latest = await getSession(userId, publicId);
    return resend(latest, getSessionAnswer(latest, orderNo).selectedChoiceId!);
  }

  answer.selectedChoiceId = choice.id;
  return { created: true, answer: await loadAnswerView(session, orderNo) };
}

// 7. GET /play-sessions/{playSessionId}/questions/{orderNo}/answer
export async function getAnswer(userId: string, publicId: string, orderNo: number): Promise<AnswerView> {
  const session = await getSession(userId, publicId);
  const answer = getSessionAnswer(session, orderNo);
  if (answer.selectedChoiceId === null) {
    throw new ApiError(404, "ANSWER_NOT_FOUND", "この問題にはまだ回答していません。");
  }
  return loadAnswerView(session, orderNo);
}

// 8. GET /play-sessions/{playSessionId}/result
export async function getResult(userId: string, publicId: string): Promise<ResultView> {
  const session = await getSession(userId, publicId);
  if (session.finishedAt === null) {
    throw new ApiError(409, "NOT_FINISHED", "挑戦が終了していないため、結果を表示できません。");
  }

  const rows = await prisma.sessionAnswer.findMany({
    where: { playSessionId: session.id },
    orderBy: { orderNo: "asc" },
    include: {
      selectedChoice: true,
      question: { select: { id: true, body: true, choices: { where: { isCorrect: true } } } },
    },
  });

  // 正解数は持たず、選んだ選択肢の is_correct から求める（docs/db.md「正規化」）
  const reviews = rows.map((row) => {
    const selected = row.selectedChoice;
    if (!selected) throw new Error(`answer ${row.playSessionId}/${row.orderNo} is not answered`);
    return {
      orderNo: row.orderNo,
      questionBody: row.question.body,
      isCorrect: selected.isCorrect,
      selectedChoice: toChoiceView(selected),
      correctChoice: toChoiceView(correctChoiceOf(row.question)),
    };
  });
  const score = reviews.filter((r) => r.isCorrect).length;

  return {
    playSessionId: session.publicId,
    choiceCount: session.choiceCount,
    score,
    questionTotal: reviews.length,
    correctRate: Math.round((score / reviews.length) * 100),
    finishedAt: session.finishedAt.toISOString(),
    reviews,
  };
}
