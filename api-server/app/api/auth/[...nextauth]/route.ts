// next-auth の API（ログイン・ログアウト・セッション取得・CSRF トークン）
// /api/auth/signin, /api/auth/callback/credentials, /api/auth/signout, /api/auth/session など
import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
