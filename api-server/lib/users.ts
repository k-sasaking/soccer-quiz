// 利用者の登録と、メールアドレス・パスワードでの照合（HTTP には依存しない）

import { ApiError } from "./errors";
import { Prisma } from "./generated/prisma/client";
import { burnPasswordCheck, hashPassword, verifyPassword } from "./password";
import { prisma } from "./prisma";

export const PASSWORD_MIN_LENGTH = 8;
// scrypt は長い入力も扱えるが、極端に長い本文で計算させられないよう上限を設ける
export const PASSWORD_MAX_LENGTH = 128;
const EMAIL_MAX_LENGTH = 254;
// 「@ の前後に文字があり、ドメインに . がある」程度の確認（本当に届くかは確かめない）
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type UserView = { email: string; createdAt: string };

// ログインしている利用者（next-auth のセッションに入れる値）
export type AuthUser = { id: string; email: string };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// 9. POST /users … 利用者を登録する
export async function createUser(rawEmail: string, password: string): Promise<UserView> {
  const email = normalizeEmail(rawEmail);
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
    throw new ApiError(422, "INVALID_EMAIL", "メールアドレスの形式が正しくありません。", [
      { field: "email", reason: "メールアドレスの形式で指定してください。" },
    ]);
  }
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    throw new ApiError(422, "WEAK_PASSWORD", `パスワードは${PASSWORD_MIN_LENGTH}文字以上にしてください。`, [
      { field: "password", reason: `${PASSWORD_MIN_LENGTH}〜${PASSWORD_MAX_LENGTH}文字で指定してください。` },
    ]);
  }

  try {
    const user = await prisma.user.create({
      data: { email, passwordHash: await hashPassword(password) },
      select: { email: true, createdAt: true },
    });
    return { email: user.email, createdAt: user.createdAt.toISOString() };
  } catch (error) {
    // 一意制約（users.email）に当たった＝登録済み
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ApiError(409, "EMAIL_TAKEN", "このメールアドレスはすでに登録されています。", [
        { field: "email", reason: "別のメールアドレスを指定してください。" },
      ]);
    }
    throw error;
  }
}

// メールアドレスとパスワードが合っていれば利用者を返す。合わなければ null
// （どちらが違うかは返さない）
export async function authenticate(rawEmail: string, password: string): Promise<AuthUser | null> {
  if (password.length > PASSWORD_MAX_LENGTH) return null;
  const email = normalizeEmail(rawEmail);
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, passwordHash: true } });
  if (!user) {
    await burnPasswordCheck(password);
    return null;
  }
  if (!(await verifyPassword(password, user.passwordHash))) return null;
  return { id: user.id.toString(), email: user.email };
}
