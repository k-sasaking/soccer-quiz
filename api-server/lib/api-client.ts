// 画面から docs/api.md の API を呼ぶためのクライアント（ブラウザで動く）
// レスポンスの型はサーバー側（lib/quiz-service.ts）の定義を型だけ借りる

import type { AnswerView, PlaySessionView, QuestionView, ResultView } from "./quiz-service";

export type { AnswerView, ChoiceView, PlaySessionView, QuestionView, ResultView } from "./quiz-service";

export type QuizInfo = { questionTotal: number; choiceCounts: number[] };

type ErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: { field: string; reason: string }[];
    requestId?: string;
  };
};

// API がエラーを返したとき（4xx / 5xx）、または通信に失敗したとき
export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly code: string,
    readonly requestId: string | null = null,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

const BASE_URL = "/api/v1";

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: string | undefined;
  if (init.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.body);
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { method: init.method ?? "GET", headers, body, cache: "no-store" });
  } catch {
    throw new ApiClientError("サーバーに接続できませんでした。", null, "NETWORK_ERROR");
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const error = (parsed as ErrorBody | null)?.error;
    throw new ApiClientError(
      error?.message ?? `サーバーがエラーを返しました（HTTP ${response.status}）。`,
      response.status,
      error?.code ?? "HTTP_ERROR",
      error?.requestId ?? response.headers.get("X-Request-Id"),
    );
  }
  return parsed as T;
}

// 9. POST /users … 利用者を登録する（このあと next-auth の signIn でログインする）
export const registerUser = (email: string, password: string) =>
  request<{ email: string; createdAt: string }>("/users", { method: "POST", body: { email, password } });

// 1. GET /quiz … 問題数と選べる択数
export const fetchQuiz = () => request<QuizInfo>("/quiz");

// 2. POST /play-sessions … 挑戦を開始する
export const createPlaySession = (choiceCount: number) =>
  request<PlaySessionView>("/play-sessions", { method: "POST", body: { choiceCount } });

// 4. PATCH /play-sessions/{id} … 挑戦を終了する
export const finishPlaySession = (playSessionId: string) =>
  request<PlaySessionView>(`/play-sessions/${playSessionId}`, { method: "PATCH", body: { status: "finished" } });

// 5. GET /play-sessions/{id}/questions/{orderNo} … n 問目（正解・解説なし）
export const fetchQuestion = (playSessionId: string, orderNo: number) =>
  request<QuestionView>(`/play-sessions/${playSessionId}/questions/${orderNo}`);

// 6. PUT /play-sessions/{id}/questions/{orderNo}/answer … 回答して正解・解説を受け取る
export const submitAnswer = (playSessionId: string, orderNo: number, choiceNo: number) =>
  request<AnswerView>(`/play-sessions/${playSessionId}/questions/${orderNo}/answer`, {
    method: "PUT",
    body: { choiceNo },
  });

// 8. GET /play-sessions/{id}/result … 結果と振り返り
export const fetchResult = (playSessionId: string) => request<ResultView>(`/play-sessions/${playSessionId}/result`);

// ログインが切れている（401）とき true
export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 401;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  return "エラーが発生しました。";
}
