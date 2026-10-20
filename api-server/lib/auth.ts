// ログイン（next-auth）の設定と、API でログイン中の利用者を取り出す処理。
// - メールアドレスとパスワードでログインする（Credentials プロバイダー）
// - ログイン状態は署名・暗号化した JWT を Cookie に入れて持つ（DB にセッションは保存しない）
// - 署名・暗号化の鍵は環境変数 NEXTAUTH_SECRET

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getToken } from "next-auth/jwt";

import { ApiError } from "./errors";
import { consumeRateLimit } from "./rate-limit";
import { authenticate, type AuthUser } from "./users";

// ログインの有効期間（最後に操作してから）
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "メールアドレス",
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials, req) {
        // パスワードの総当たりを防ぐため、同じ IP からのログインの試行回数を制限する
        const forwarded = req.headers?.["x-forwarded-for"];
        const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0].trim() || "unknown";
        if (consumeRateLimit("login", ip) !== null) {
          throw new Error("RATE_LIMITED");
        }
        if (typeof credentials?.email !== "string" || typeof credentials.password !== "string") return null;
        return authenticate(credentials.email, credentials.password);
      },
    }),
  ],
  callbacks: {
    // ログインした利用者の ID は token.sub（JWT の標準の項目）に入る。画面からも使えるよう session に移す
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
};

// API の要求の Cookie からログイン中の利用者を取り出す。ログインしていなければ null
export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  // getToken は Next.js の NextRequest か、cookies を持つオブジェクトを受け取る。
  // テストなどで渡される素の Request でも動くよう、Cookie ヘッダーを読み直して渡す
  const cookies = new Map<string, string>();
  for (const pair of (request.headers.get("cookie") ?? "").split(";")) {
    const index = pair.indexOf("=");
    if (index <= 0) continue;
    try {
      cookies.set(pair.slice(0, index).trim(), decodeURIComponent(pair.slice(index + 1).trim()));
    } catch {
      // 壊れた Cookie は無視する
    }
  }
  const token = await getToken({
    req: { cookies, headers: Object.fromEntries(request.headers) } as unknown as Parameters<typeof getToken>[0]["req"],
  });
  if (!token?.sub || !/^[0-9]+$/.test(token.sub) || typeof token.email !== "string") return null;
  return { id: token.sub, email: token.email };
}

// ログインが必要な API で使う。ログインしていなければ 401
export async function requireAuthUser(request: Request): Promise<AuthUser> {
  const user = await getAuthUser(request);
  if (!user) throw new ApiError(401, "UNAUTHORIZED", "ログインしてください。");
  return user;
}
