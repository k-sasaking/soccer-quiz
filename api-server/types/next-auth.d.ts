// next-auth のセッションに、利用者の ID（users.id を文字列にしたもの）を足す
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}
