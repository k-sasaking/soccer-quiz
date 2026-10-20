// 全 API 共通の処理（docs/api.md「共通仕様」「非機能要件・運用」）
// - X-Request-Id の受け取り・発行
// - メンテナンス中の 503、呼び出し回数の制限（429）
// - エラーを共通フォーマットに変換、想定外のエラーは 500
// - Cache-Control、アクセスログ

import { ApiError, invalidRequest, playSessionNotFound, type ErrorDetail } from "./errors";
import { consumeRateLimit, type RateLimitGroup } from "./rate-limit";

type Options = {
  // 成功時の Cache-Control。エラー時は常に no-store
  cacheControl?: string;
  rateLimitGroup?: RateLimitGroup;
};

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function withApi<C>(
  handler: (request: Request, context: C) => Promise<Response> | Response,
  options: Options = {},
) {
  return async (request: Request, context: C): Promise<Response> => {
    const startedAt = Date.now();
    const received = request.headers.get("x-request-id");
    const requestId = received && REQUEST_ID_PATTERN.test(received) ? received : crypto.randomUUID();

    let response: Response;
    try {
      if (process.env.MAINTENANCE_MODE === "true") {
        throw new ApiError(503, "SERVICE_UNAVAILABLE", "ただいまメンテナンス中です。", undefined, {
          "Retry-After": "60",
        });
      }
      const retryAfter = consumeRateLimit(options.rateLimitGroup ?? "default", clientIp(request));
      if (retryAfter !== null) {
        throw new ApiError(429, "RATE_LIMITED", "しばらく時間をおいてから、もう一度お試しください。", undefined, {
          "Retry-After": String(retryAfter),
        });
      }
      response = await handler(request, context);
      response.headers.set("Cache-Control", options.cacheControl ?? "no-store");
    } catch (error) {
      if (error instanceof ApiError) {
        response = errorResponse(error, requestId);
      } else {
        // 詳細はログにだけ残し、レスポンスには含めない
        console.error(JSON.stringify({ requestId, error: String(error), stack: (error as Error)?.stack }));
        response = errorResponse(
          new ApiError(500, "INTERNAL_ERROR", "サーバーでエラーが発生しました。"),
          requestId,
        );
      }
    }

    response.headers.set("X-Request-Id", requestId);
    console.info(
      JSON.stringify({
        requestId,
        method: request.method,
        path: new URL(request.url).pathname,
        status: response.status,
        durationMs: Date.now() - startedAt,
      }),
    );
    return response;
  };
}

export function json(body: unknown, status = 200, headers?: Record<string, string>): Response {
  return Response.json(body, { status, headers });
}

function errorResponse(error: ApiError, requestId: string): Response {
  return json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
        requestId,
      },
    },
    error.status,
    { ...error.headers, "Cache-Control": "no-store" },
  );
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}

// 実装していないメソッド用（405）
export function methodNotAllowed(allow: string[]) {
  return withApi(() => {
    throw new ApiError(405, "METHOD_NOT_ALLOWED", "このメソッドは使用できません。", undefined, {
      Allow: allow.join(", "),
    });
  });
}

// ---- リクエストの読み取り ----

// 本文を JSON オブジェクトとして読む。JSON でなければ 415、壊れていれば 400
export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json\s*(;|$)/i.test(contentType)) {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type は application/json を指定してください。");
  }
  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    throw invalidRequest([{ field: "body", reason: "JSON として読み取れません。" }]);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw invalidRequest([{ field: "body", reason: "JSON オブジェクトを指定してください。" }]);
  }
  return body as Record<string, unknown>;
}

// 必須の整数項目。なければ・整数でなければ 400
export function requireInteger(body: Record<string, unknown>, field: string): number {
  const value = body[field];
  if (value === undefined) throw invalidRequest([{ field, reason: "必須項目です。" }]);
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw invalidRequest([{ field, reason: "整数で指定してください。" }]);
  }
  return value;
}

// 決められた項目以外があれば 400
export function rejectUnknownFields(body: Record<string, unknown>, allowed: string[]) {
  const details: ErrorDetail[] = Object.keys(body)
    .filter((key) => !allowed.includes(key))
    .map((field) => ({ field, reason: "指定できない項目です。" }));
  if (details.length > 0) throw invalidRequest(details);
}

// 挑戦ID。UUID の形でなければ、存在しない挑戦として 404
export function parsePlaySessionId(value: string): string {
  if (!UUID_PATTERN.test(value)) throw playSessionNotFound();
  return value.toLowerCase();
}

// 出題順。整数でなければ 400
export function parseOrderNo(value: string): number {
  if (!/^[0-9]{1,4}$/.test(value)) {
    throw invalidRequest([{ field: "orderNo", reason: "整数で指定してください。" }]);
  }
  return Number(value);
}
