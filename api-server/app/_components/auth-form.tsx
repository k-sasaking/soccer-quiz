"use client";

// ログイン画面・新規登録画面のフォーム（メールアドレスとパスワード）
// - ログイン … next-auth の signIn("credentials") を呼ぶ
// - 新規登録 … POST /api/v1/users で登録してから、そのままログインする

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";

import { errorMessage, registerUser } from "@/lib/api-client";

import { ErrorNotice } from "./error-notice";

type Props = { mode: "login" | "signup" };

const PASSWORD_MIN_LENGTH = 8;

// signIn が返すエラー（lib/auth.ts の authorize の結果）を、画面に出す文に直す
function signInErrorMessage(error: string): string {
  if (error === "RATE_LIMITED") return "ログインの試行が多すぎます。しばらく時間をおいてから、もう一度お試しください。";
  return "メールアドレスかパスワードが違います。";
}

export function AuthForm({ mode }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === "signup";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      if (isSignup) await registerUser(email, password);
      const result = await signIn("credentials", { email, password, redirect: false });
      if (!result || result.error) {
        setError(signInErrorMessage(result?.error ?? ""));
        return;
      }
      // Cookie にログイン状態が入ったので、クイズ画面をサーバーから読み直す
      window.location.assign("/");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card">
      <p className="eyebrow">{isSignup ? "SIGN UP" : "LOGIN"}</p>
      <h1>{isSignup ? "新規登録" : "ログイン"}</h1>
      <p className="lead">
        {isSignup
          ? "メールアドレスとパスワードを登録すると、クイズに挑戦できます。"
          : "メールアドレスとパスワードでログインしてください。"}
      </p>

      <ErrorNotice message={error} />

      <form className="auth-form" onSubmit={submit}>
        <label className="field">
          <span className="field-label">メールアドレス</span>
          <input
            className="field-input"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">
            パスワード{isSignup && <span className="field-hint">（{PASSWORD_MIN_LENGTH}文字以上）</span>}
          </span>
          <input
            className="field-input"
            type="password"
            name="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={isSignup ? PASSWORD_MIN_LENGTH : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "送信中…" : isSignup ? "登録してはじめる" : "ログイン"}
        </button>
      </form>

      <p className="auth-switch">
        {isSignup ? (
          <>
            登録済みの方は <Link href="/login">ログイン</Link>
          </>
        ) : (
          <>
            はじめての方は <Link href="/signup">新規登録</Link>
          </>
        )}
      </p>
    </section>
  );
}
