// docs/api.md「エラーの共通フォーマット」のエラーコード

export type ErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "PLAY_SESSION_NOT_FOUND"
  | "QUESTION_NOT_FOUND"
  | "ANSWER_NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "QUESTION_LOCKED"
  | "ALREADY_ANSWERED"
  | "ALREADY_FINISHED"
  | "UNANSWERED_QUESTIONS"
  | "NOT_FINISHED"
  | "NO_QUESTIONS"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "INVALID_CHOICE_COUNT"
  | "CHOICE_OUT_OF_RANGE"
  | "INVALID_STATUS"
  | "EMAIL_TAKEN"
  | "INVALID_EMAIL"
  | "WEAK_PASSWORD"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

export type ErrorDetail = { field: string; reason: string };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: ErrorDetail[],
    readonly headers?: Record<string, string>,
  ) {
    super(message);
  }
}

export const invalidRequest = (details: ErrorDetail[]) =>
  new ApiError(400, "INVALID_REQUEST", "リクエストの内容に誤りがあります。", details);

export const playSessionNotFound = () =>
  new ApiError(404, "PLAY_SESSION_NOT_FOUND", "挑戦が見つかりません。");

export const questionNotFound = () =>
  new ApiError(404, "QUESTION_NOT_FOUND", "問題が見つかりません。");
