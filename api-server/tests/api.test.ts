import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as catchAllRoute from "@/app/api/v1/[...path]/route";
import * as sessionRoute from "@/app/api/v1/play-sessions/[playSessionId]/route";
import * as answerRoute from "@/app/api/v1/play-sessions/[playSessionId]/questions/[orderNo]/answer/route";
import * as questionRoute from "@/app/api/v1/play-sessions/[playSessionId]/questions/[orderNo]/route";
import * as resultRoute from "@/app/api/v1/play-sessions/[playSessionId]/result/route";
import * as playSessionsRoute from "@/app/api/v1/play-sessions/route";
import * as quizRoute from "@/app/api/v1/quiz/route";
import * as usersRoute from "@/app/api/v1/users/route";
import { encode } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import { withApi } from "@/lib/http";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { clearRateLimits } from "@/lib/rate-limit";
import { authenticate } from "@/lib/users";

// テストは .env.test の DB（本番とは別の Neon の test ブランチ）を使う。vitest.config.mts を参照

type Handler = (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>;

type TestUser = { id: bigint; email: string };

const PASSWORD = "correct-horse-battery";
// パスワードのハッシュ化は遅いので、テスト用の利用者は同じハッシュを使い回す
let passwordHash: string;
// ふだんの API 呼び出しでログインしている利用者
let me: TestUser;

const createTestUser = (email: string) =>
  prisma.user.create({ data: { email, passwordHash }, select: { id: true, email: true } });

// next-auth がログイン時に Cookie に入れるのと同じ形の JWT を作る
async function sessionCookie(user: TestUser, secret = process.env.NEXTAUTH_SECRET!): Promise<string> {
  const token = await encode({ token: { sub: user.id.toString(), email: user.email }, secret });
  return `next-auth.session-token=${token}`;
}

async function call(
  handler: Handler,
  params: Record<string, string> = {},
  init: {
    method?: string;
    body?: unknown;
    rawBody?: string;
    headers?: Record<string, string>;
    // どの利用者としてログインして呼ぶか。null ならログインしていない。省略すると me
    as?: TestUser | null;
  } = {},
) {
  const headers: Record<string, string> = { ...init.headers };
  const user = init.as === undefined ? me : init.as;
  if (user) headers.Cookie ??= await sessionCookie(user);
  let body: string | undefined = init.rawBody;
  if (init.body !== undefined) {
    body = JSON.stringify(init.body);
    headers["Content-Type"] ??= "application/json";
  }
  const request = new Request("http://localhost/api/v1/test", { method: init.method ?? "GET", headers, body });
  const response = await handler(request, { params: Promise.resolve(params) });
  const text = await response.text();
  return { status: response.status, headers: response.headers, text, json: text ? JSON.parse(text) : null };
}

async function startSession(choiceCount = 3, as: TestUser = me): Promise<string> {
  const res = await call(playSessionsRoute.POST as Handler, {}, { method: "POST", body: { choiceCount }, as });
  expect(res.status).toBe(201);
  return res.json.id;
}

// その挑戦の n 問目の正解・不正解の choiceNo（DB から引く）
async function choiceNoFor(id: string, orderNo: number, correct: boolean): Promise<number> {
  const row = await prisma.sessionAnswer.findFirstOrThrow({
    where: { playSession: { publicId: id }, orderNo },
    select: {
      question: {
        select: {
          choices: { where: { choiceNo: { lte: 3 }, isCorrect: correct }, orderBy: { choiceNo: "asc" }, take: 1 },
        },
      },
    },
  });
  return row.question.choices[0].choiceNo;
}

// その挑戦の回答行（DB の session_answers）を出題順に返す
const answerRowsOf = (id: string) =>
  prisma.sessionAnswer.findMany({ where: { playSession: { publicId: id } }, orderBy: { orderNo: "asc" } });

const answer = (id: string, orderNo: number, choiceNo: number) =>
  call(answerRoute.PUT as Handler, { playSessionId: id, orderNo: String(orderNo) }, { method: "PUT", body: { choiceNo } });

const finish = (id: string, body: unknown = { status: "finished" }) =>
  call(sessionRoute.PATCH as Handler, { playSessionId: id }, { method: "PATCH", body });

beforeEach(async () => {
  await prisma.playSession.deleteMany(); // 回答（session_answers）も一緒に消える
  await prisma.user.deleteMany();
  passwordHash ??= await hashPassword(PASSWORD);
  me = await createTestUser("me@example.com");
  clearRateLimits();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("共通仕様", () => {
  it("X-Request-Id を受け取ったらそのまま返し、なければ発行する", async () => {
    const given = await call(quizRoute.GET as Handler, {}, { headers: { "X-Request-Id": "abc-123" } });
    expect(given.headers.get("X-Request-Id")).toBe("abc-123");

    const issued = await call(quizRoute.GET as Handler);
    expect(issued.headers.get("X-Request-Id")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("エラーは共通フォーマットで、requestId はヘッダーと同じ", async () => {
    const res = await call(playSessionsRoute.POST as Handler, {}, { method: "POST", body: {} });
    expect(res.status).toBe(400);
    expect(res.json).toEqual({
      error: {
        code: "INVALID_REQUEST",
        message: expect.any(String),
        details: [{ field: "choiceCount", reason: "必須項目です。" }],
        requestId: res.headers.get("X-Request-Id"),
      },
    });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("実装していないメソッドは 405 と Allow ヘッダー", async () => {
    const res = await call(sessionRoute.DELETE as Handler, {}, { method: "DELETE" });
    expect(res.status).toBe(405);
    expect(res.json.error.code).toBe("METHOD_NOT_ALLOWED");
    expect(res.headers.get("Allow")).toBe("GET, PATCH");
  });

  it("存在しない URL は 404 NOT_FOUND", async () => {
    const res = await call(catchAllRoute.GET as Handler, { path: ["unknown"] } as never);
    expect(res.status).toBe(404);
    expect(res.json.error.code).toBe("NOT_FOUND");
  });

  it("Content-Type が JSON でなければ 415", async () => {
    const res = await call(playSessionsRoute.POST as Handler, {}, {
      method: "POST",
      rawBody: "choiceCount=3",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    expect(res.status).toBe(415);
    expect(res.json.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("壊れた JSON は 400", async () => {
    const res = await call(playSessionsRoute.POST as Handler, {}, {
      method: "POST",
      rawBody: "{",
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
    expect(res.json.error.details).toEqual([{ field: "body", reason: "JSON として読み取れません。" }]);
  });

  it("呼び出しが多すぎると 429 と Retry-After", async () => {
    for (let i = 0; i < 30; i++) await startSession();
    const res = await call(playSessionsRoute.POST as Handler, {}, { method: "POST", body: { choiceCount: 3 } });
    expect(res.status).toBe(429);
    expect(res.json.error.code).toBe("RATE_LIMITED");
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("メンテナンス中は 503 と Retry-After", async () => {
    vi.stubEnv("MAINTENANCE_MODE", "true");
    const res = await call(quizRoute.GET as Handler);
    expect(res.status).toBe(503);
    expect(res.json.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("想定外のエラーは 500 で、詳細はレスポンスに含めない", async () => {
    const broken = withApi(() => {
      throw new Error("SELECT * FROM secret");
    }) as Handler;
    const res = await call(broken);
    expect(res.status).toBe(500);
    expect(res.json.error.code).toBe("INTERNAL_ERROR");
    expect(res.text).not.toContain("secret");
    expect(console.error).toHaveBeenCalled();
  });
});

describe("1. GET /quiz", () => {
  it("問題数と択数を返し、キャッシュしてよい", async () => {
    const res = await call(quizRoute.GET as Handler);
    expect(res.status).toBe(200);
    expect(res.json).toEqual({ questionTotal: 10, choiceCounts: [3, 4] });
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");
  });
});

describe("2. POST /play-sessions", () => {
  it("挑戦を作り、201 と Location を返す", async () => {
    const res = await call(playSessionsRoute.POST as Handler, {}, { method: "POST", body: { choiceCount: 4 } });
    expect(res.status).toBe(201);
    expect(res.headers.get("Location")).toBe(`/api/v1/play-sessions/${res.json.id}`);
    expect(res.json).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      choiceCount: 4,
      questionTotal: 10,
      answeredCount: 0,
      nextOrderNo: 1,
      status: "inProgress",
      createdAt: expect.any(String),
      finishedAt: null,
    });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("挑戦と、全問ぶんの未回答の行を DB に保存する", async () => {
    const id = await startSession(4);
    const session = await prisma.playSession.findUniqueOrThrow({ where: { publicId: id } });
    expect(session).toMatchObject({ choiceCount: 4, finishedAt: null });

    const rows = await answerRowsOf(id);
    expect(rows.map((r) => r.orderNo)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(rows.every((r) => r.selectedChoiceId === null && r.answeredAt === null)).toBe(true);
    // 全問を重複なく並べる
    expect(new Set(rows.map((r) => r.questionId)).size).toBe(10);
  });

  it("出題できる問題がなければ 409 NO_QUESTIONS", async () => {
    const active = await prisma.question.findMany({ where: { deletedAt: null }, select: { id: true } });
    const ids = active.map((q) => q.id);
    await prisma.question.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } });
    try {
      const res = await call(playSessionsRoute.POST as Handler, {}, { method: "POST", body: { choiceCount: 3 } });
      expect(res.status).toBe(409);
      expect(res.json.error.code).toBe("NO_QUESTIONS");
    } finally {
      await prisma.question.updateMany({ where: { id: { in: ids } }, data: { deletedAt: null } });
    }
  });

  it.each([
    ["文字列", "3", 400, "INVALID_REQUEST"],
    ["小数", 3.5, 400, "INVALID_REQUEST"],
    ["3・4以外", 5, 422, "INVALID_CHOICE_COUNT"],
  ])("choiceCount が%sなら %i", async (_label, choiceCount, status, code) => {
    const res = await call(playSessionsRoute.POST as Handler, {}, { method: "POST", body: { choiceCount } });
    expect(res.status).toBe(status);
    expect(res.json.error.code).toBe(code);
  });
});

describe("3. GET /play-sessions/{playSessionId}", () => {
  it("進み具合を返す", async () => {
    const id = await startSession();
    await answer(id, 1, 1);
    const res = await call(sessionRoute.GET as Handler, { playSessionId: id });
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ id, answeredCount: 1, nextOrderNo: 2, status: "inProgress" });
  });

  it.each([
    ["UUID の形でない", "123"],
    ["存在しない", "00000000-0000-4000-8000-000000000000"],
  ])("挑戦IDが%sなら 404", async (_label, playSessionId) => {
    const res = await call(sessionRoute.GET as Handler, { playSessionId });
    expect(res.status).toBe(404);
    expect(res.json.error.code).toBe("PLAY_SESSION_NOT_FOUND");
  });
});

describe("5. GET /play-sessions/{id}/questions/{orderNo}", () => {
  it("択数の数だけ選択肢を返し、正解・解説は含めない", async () => {
    const id = await startSession(3);
    const res = await call(questionRoute.GET as Handler, { playSessionId: id, orderNo: "1" });
    expect(res.status).toBe(200);
    expect(res.json.orderNo).toBe(1);
    expect(res.json.questionTotal).toBe(10);
    expect(res.json.isAnswered).toBe(false);
    expect(res.json.choices.map((c: { label: string }) => c.label)).toEqual(["A", "B", "C"]);
    expect(res.text).not.toMatch(/isCorrect|correctChoice|quote|explanation/);
  });

  it("4択なら D まで返す", async () => {
    const id = await startSession(4);
    const res = await call(questionRoute.GET as Handler, { playSessionId: id, orderNo: "1" });
    expect(res.json.choices.map((c: { label: string }) => c.label)).toEqual(["A", "B", "C", "D"]);
  });

  it("前の問題が未回答なら 409 QUESTION_LOCKED", async () => {
    const id = await startSession();
    const res = await call(questionRoute.GET as Handler, { playSessionId: id, orderNo: "2" });
    expect(res.status).toBe(409);
    expect(res.json.error.code).toBe("QUESTION_LOCKED");
  });

  it.each([
    ["整数でない", "abc", 400, "INVALID_REQUEST"],
    ["0", "0", 404, "QUESTION_NOT_FOUND"],
    ["問題数より大きい", "11", 404, "QUESTION_NOT_FOUND"],
  ])("orderNo が%sなら %i", async (_label, orderNo, status, code) => {
    const id = await startSession();
    const res = await call(questionRoute.GET as Handler, { playSessionId: id, orderNo });
    expect(res.status).toBe(status);
    expect(res.json.error.code).toBe(code);
  });
});

describe("6・7. 回答", () => {
  it("初回は 201、正誤・正解・出典つきの解説を返す", async () => {
    const id = await startSession();
    const correctNo = await choiceNoFor(id, 1, true);
    const res = await answer(id, 1, correctNo);
    expect(res.status).toBe(201);
    expect(res.headers.get("Location")).toBe(`/api/v1/play-sessions/${id}/questions/1/answer`);
    expect(res.json).toMatchObject({
      orderNo: 1,
      isCorrect: true,
      selectedChoice: { choiceNo: correctNo },
      correctChoice: { choiceNo: correctNo },
      explanation: { source: { fileName: "soccer_knowledge.md" } },
      nextOrderNo: 2,
    });
    expect(res.json.explanation.text).toMatch(/^「.+」（soccer_knowledge\.md 「\d\. .+」より）$/);

    // DB に記録されている
    const [row] = await answerRowsOf(id);
    expect(row.selectedChoiceId).not.toBeNull();
    expect(row.answeredAt?.toISOString()).toBe(res.json.answeredAt);
  });

  it("不正解なら正解の選択肢も返す", async () => {
    const id = await startSession();
    const res = await answer(id, 1, await choiceNoFor(id, 1, false));
    expect(res.json.isCorrect).toBe(false);
    expect(res.json.correctChoice.choiceNo).toBe(await choiceNoFor(id, 1, true));
  });

  it("同じ回答の再送は 200、別の回答は 409 ALREADY_ANSWERED", async () => {
    const id = await startSession();
    const first = await answer(id, 1, 1);
    const again = await answer(id, 1, 1);
    expect(again.status).toBe(200);
    expect(again.json).toEqual(first.json);

    const other = await answer(id, 1, 2);
    expect(other.status).toBe(409);
    expect(other.json.error.code).toBe("ALREADY_ANSWERED");
  });

  it("同時に別々の回答が届いても、記録されるのは1つだけ", async () => {
    const id = await startSession();
    const results = await Promise.all([answer(id, 1, 1), answer(id, 1, 2)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);

    const winner = results.find((r) => r.status === 201)!;
    const [row] = await answerRowsOf(id);
    const recorded = await prisma.choice.findUniqueOrThrow({ where: { id: row.selectedChoiceId! } });
    expect(recorded.choiceNo).toBe(winner.json.selectedChoice.choiceNo);
  });

  it("3択で D を選ぶと 422 CHOICE_OUT_OF_RANGE", async () => {
    const id = await startSession(3);
    const res = await answer(id, 1, 4);
    expect(res.status).toBe(422);
    expect(res.json.error.code).toBe("CHOICE_OUT_OF_RANGE");
  });

  it("順番を飛ばして回答すると 409 QUESTION_LOCKED", async () => {
    const id = await startSession();
    const res = await answer(id, 2, 1);
    expect(res.status).toBe(409);
    expect(res.json.error.code).toBe("QUESTION_LOCKED");
  });

  it("choiceNo がなければ 400", async () => {
    const id = await startSession();
    const res = await call(answerRoute.PUT as Handler, { playSessionId: id, orderNo: "1" }, { method: "PUT", body: {} });
    expect(res.status).toBe(400);
    expect(res.json.error.details).toEqual([{ field: "choiceNo", reason: "必須項目です。" }]);
  });

  it("回答前に回答を取得すると 404、回答後は同じ内容を返す", async () => {
    const id = await startSession();
    const params = { playSessionId: id, orderNo: "1" };
    const before = await call(answerRoute.GET as Handler, params);
    expect(before.status).toBe(404);
    expect(before.json.error.code).toBe("ANSWER_NOT_FOUND");

    const put = await answer(id, 1, 2);
    const after = await call(answerRoute.GET as Handler, params);
    expect(after.status).toBe(200);
    expect(after.json).toEqual(put.json);

    const question = await call(questionRoute.GET as Handler, params);
    expect(question.json.isAnswered).toBe(true);
  });
});

describe("4・8. 終了と結果", () => {
  it("全問に答えて終了すると、結果を返す", async () => {
    const id = await startSession();
    // 1問目だけ不正解、残りは正解
    for (let n = 1; n <= 10; n++) await answer(id, n, await choiceNoFor(id, n, n !== 1));

    const notYet = await call(resultRoute.GET as Handler, { playSessionId: id });
    expect(notYet.status).toBe(409);
    expect(notYet.json.error.code).toBe("NOT_FINISHED");

    const finished = await finish(id);
    expect(finished.status).toBe(200);
    expect(finished.json).toMatchObject({ status: "finished", answeredCount: 10, nextOrderNo: null });

    // 何度終了しても同じ
    const again = await finish(id);
    expect(again.status).toBe(200);
    expect(again.json.finishedAt).toBe(finished.json.finishedAt);

    const result = await call(resultRoute.GET as Handler, { playSessionId: id });
    expect(result.status).toBe(200);
    expect(result.json).toMatchObject({ playSessionId: id, choiceCount: 3, score: 9, questionTotal: 10, correctRate: 90 });
    expect(result.json.reviews.map((r: { orderNo: number }) => r.orderNo)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result.json.reviews[0]).toMatchObject({ isCorrect: false, questionBody: expect.any(String) });

    // 終了日時は DB に記録され、開始日時より後
    const session = await prisma.playSession.findUniqueOrThrow({ where: { publicId: id } });
    expect(session.finishedAt?.toISOString()).toBe(finished.json.finishedAt);
    expect(session.finishedAt!.getTime()).toBeGreaterThanOrEqual(session.createdAt.getTime());
  });

  it("未回答が残っていると 409 UNANSWERED_QUESTIONS", async () => {
    const id = await startSession();
    const res = await finish(id);
    expect(res.status).toBe(409);
    expect(res.json.error.code).toBe("UNANSWERED_QUESTIONS");
  });

  it.each([
    ["finished 以外", { status: "inProgress" }, 422, "INVALID_STATUS"],
    ["status がない", {}, 400, "INVALID_REQUEST"],
    ["status 以外の項目がある", { status: "finished", score: 10 }, 400, "INVALID_REQUEST"],
  ])("%sなら %i", async (_label, body, status, code) => {
    const id = await startSession();
    const res = await finish(id, body);
    expect(res.status).toBe(status);
    expect(res.json.error.code).toBe(code);
  });
});

describe("認証・認可", () => {
  it("GET /quiz はログインしなくても見られる", async () => {
    const res = await call(quizRoute.GET as Handler, {}, { as: null });
    expect(res.status).toBe(200);
  });

  it("ログインしていないと、挑戦の API はどれも 401 UNAUTHORIZED", async () => {
    const id = await startSession();
    const session = { playSessionId: id };
    const question = { playSessionId: id, orderNo: "1" };
    const cases: [Handler, Record<string, string>, string, unknown?][] = [
      [playSessionsRoute.POST as Handler, {}, "POST", { choiceCount: 3 }],
      [sessionRoute.GET as Handler, session, "GET"],
      [sessionRoute.PATCH as Handler, session, "PATCH", { status: "finished" }],
      [questionRoute.GET as Handler, question, "GET"],
      [answerRoute.PUT as Handler, question, "PUT", { choiceNo: 1 }],
      [answerRoute.GET as Handler, question, "GET"],
      [resultRoute.GET as Handler, session, "GET"],
    ];
    for (const [handler, params, method, body] of cases) {
      const res = await call(handler, params, { method, body, as: null });
      expect(res.status, `${method} ${JSON.stringify(params)}`).toBe(401);
      expect(res.json.error.code).toBe("UNAUTHORIZED");
    }
    // 何も書き込まれていない
    expect(await prisma.playSession.count()).toBe(1);
    expect((await answerRowsOf(id)).every((r) => r.selectedChoiceId === null)).toBe(true);
  });

  it.each([
    ["壊れたトークン", async () => "next-auth.session-token=broken"],
    ["別の鍵で作ったトークン", async () => sessionCookie(me, "another-secret")],
  ])("%sは 401", async (_label, cookie) => {
    const res = await call(playSessionsRoute.POST as Handler, {}, {
      method: "POST",
      body: { choiceCount: 3 },
      as: null,
      headers: { Cookie: await cookie() },
    });
    expect(res.status).toBe(401);
    expect(res.json.error.code).toBe("UNAUTHORIZED");
  });

  it("挑戦は始めた利用者のものとして保存する", async () => {
    const id = await startSession();
    const session = await prisma.playSession.findUniqueOrThrow({ where: { publicId: id } });
    expect(session.userId).toBe(me.id);
  });

  it("他人の挑戦は、どの API でも存在しないものとして 404", async () => {
    const other = await createTestUser("other@example.com");
    const id = await startSession(3, other);
    const session = { playSessionId: id };
    const question = { playSessionId: id, orderNo: "1" };
    const cases: [Handler, Record<string, string>, string, unknown?][] = [
      [sessionRoute.GET as Handler, session, "GET"],
      [sessionRoute.PATCH as Handler, session, "PATCH", { status: "finished" }],
      [questionRoute.GET as Handler, question, "GET"],
      [answerRoute.PUT as Handler, question, "PUT", { choiceNo: 1 }],
      [answerRoute.GET as Handler, question, "GET"],
      [resultRoute.GET as Handler, session, "GET"],
    ];
    for (const [handler, params, method, body] of cases) {
      const res = await call(handler, params, { method, body });
      expect(res.status, `${method} ${JSON.stringify(params)}`).toBe(404);
      expect(res.json.error.code).toBe("PLAY_SESSION_NOT_FOUND");
    }
    // 他人の回答は書き込まれていない
    expect((await answerRowsOf(id)).every((r) => r.selectedChoiceId === null)).toBe(true);

    // 本人なら見られる
    const own = await call(sessionRoute.GET as Handler, session, { as: other });
    expect(own.status).toBe(200);
  });

  it("ログイン機能を入れる前の、持ち主のいない挑戦は誰も操作できない", async () => {
    const id = await startSession();
    await prisma.playSession.updateMany({ where: { publicId: id }, data: { userId: null } });
    const res = await call(sessionRoute.GET as Handler, { playSessionId: id });
    expect(res.status).toBe(404);
  });
});

describe("9. POST /users", () => {
  const register = (body: unknown) => call(usersRoute.POST as Handler, {}, { method: "POST", body, as: null });

  it("登録すると 201。メールアドレスは小文字にそろえ、パスワードはハッシュだけ保存する", async () => {
    const res = await register({ email: "  New.User@Example.COM ", password: "password123" });
    expect(res.status).toBe(201);
    expect(res.json).toEqual({ email: "new.user@example.com", createdAt: expect.any(String) });
    expect(res.text).not.toMatch(/password|"id"/);

    const user = await prisma.user.findUniqueOrThrow({ where: { email: "new.user@example.com" } });
    expect(user.passwordHash).not.toContain("password123");
    expect(user.passwordHash).toMatch(/^scrypt\$/);
    expect(await verifyPassword("password123", user.passwordHash)).toBe(true);
  });

  it("登録済みのメールアドレスは、大文字・小文字が違っても 409 EMAIL_TAKEN", async () => {
    const res = await register({ email: "ME@example.com", password: "password123" });
    expect(res.status).toBe(409);
    expect(res.json.error.code).toBe("EMAIL_TAKEN");
  });

  it.each([
    ["メールアドレスの形でない", { email: "not-an-email", password: "password123" }, 422, "INVALID_EMAIL"],
    ["パスワードが短い", { email: "a@example.com", password: "short" }, 422, "WEAK_PASSWORD"],
    ["パスワードが長すぎる", { email: "a@example.com", password: "x".repeat(129) }, 422, "WEAK_PASSWORD"],
    ["パスワードがない", { email: "a@example.com" }, 400, "INVALID_REQUEST"],
    ["パスワードが文字列でない", { email: "a@example.com", password: 12345678 }, 400, "INVALID_REQUEST"],
    ["決められた項目以外がある", { email: "a@example.com", password: "password123", role: "admin" }, 400, "INVALID_REQUEST"],
  ])("%sなら %i", async (_label, body, status, code) => {
    const res = await register(body);
    expect(res.status).toBe(status);
    expect(res.json.error.code).toBe(code);
  });

  it("登録が多すぎると 429", async () => {
    for (let i = 0; i < 10; i++) await register({ email: `user${i}@example.com`, password: "x" });
    const res = await register({ email: "user@example.com", password: "password123" });
    expect(res.status).toBe(429);
  });
});

describe("ログイン（メールアドレスとパスワードの照合）", () => {
  it("合っていれば利用者を返す。メールアドレスの大文字・小文字は区別しない", async () => {
    expect(await authenticate("Me@Example.com", PASSWORD)).toEqual({ id: me.id.toString(), email: me.email });
  });

  it.each([
    ["パスワードが違う", "me@example.com", "wrong-password"],
    ["登録されていない", "nobody@example.com", PASSWORD],
  ])("%sなら null", async (_label, email, password) => {
    expect(await authenticate(email, password)).toBeNull();
  });

  it("同じ IP からのログインの試行が多すぎると止める", async () => {
    const provider = authOptions.providers[0] as unknown as {
      options: { authorize: (credentials: Record<string, string>, req: unknown) => Promise<unknown> };
    };
    const req = { headers: { "x-forwarded-for": "203.0.113.5" } };
    const credentials = { email: "me@example.com", password: "wrong-password" };
    for (let i = 0; i < 10; i++) expect(await provider.options.authorize(credentials, req)).toBeNull();
    await expect(provider.options.authorize({ ...credentials, password: PASSWORD }, req)).rejects.toThrow("RATE_LIMITED");
  });

  it("同じパスワードでも、ハッシュは毎回違う（ソルト）", async () => {
    const [a, b] = await Promise.all([hashPassword(PASSWORD), hashPassword(PASSWORD)]);
    expect(a).not.toBe(b);
    expect(await verifyPassword(PASSWORD, a)).toBe(true);
    expect(await verifyPassword("other", a)).toBe(false);
    expect(await verifyPassword(PASSWORD, "garbage")).toBe(false);
  });
});
