// CORS（docs/api.md「CORS」）。許可したオリジンの画面からだけ API を呼べるようにする。
// 許可するオリジンは CORS_ALLOWED_ORIGINS（カンマ区切り）で変えられる。

import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_ALLOWED_ORIGINS = "https://k-sasaking.github.io";

function allowedOrigins(): string[] {
  return (process.env.CORS_ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowed = origin !== null && allowedOrigins().includes(origin);

  // プリフライト（ブラウザが本番の要求の前に送る確認）には、本文なしの 204 で答える
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set("Vary", "Origin");
    if (allowed) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, X-Request-Id");
      response.headers.set("Access-Control-Max-Age", "600");
    }
    return response;
  }

  const response = NextResponse.next();
  response.headers.set("Vary", "Origin");
  if (allowed) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Expose-Headers", "X-Request-Id, Location, Retry-After");
  }
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
