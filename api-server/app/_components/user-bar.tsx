"use client";

// 画面上部の、ログイン中のメールアドレスとログアウトボタン
import { signOut } from "next-auth/react";

export function UserBar({ email }: { email: string }) {
  return (
    <div className="userbar">
      <span className="userbar-email">{email}</span>
      <button className="userbar-logout" type="button" onClick={() => signOut({ callbackUrl: "/login" })}>
        ログアウト
      </button>
    </div>
  );
}
