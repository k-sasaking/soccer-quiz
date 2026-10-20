// パスワードのハッシュ化と照合。Node.js 標準の scrypt を使う（追加のライブラリは不要）。
// 保存する形：scrypt$N$r$p$<salt(base64)>$<hash(base64)>
// パラメータも一緒に保存するので、あとで強さを変えても古いハッシュを照合できる。

import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

function derive(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, PARAMS);
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, n, r, p, salt, hash] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const key = await derive(password, Buffer.from(salt, "base64"), { N: Number(n), r: Number(r), p: Number(p) });
  // かかる時間で一致した文字数が分からないよう、比較は timingSafeEqual で行う
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// 登録されていないメールアドレスでも照合と同じだけ時間をかけるためのダミー
// （応答時間の差で、登録済みかどうかを調べられないようにする）
let dummyHash: Promise<string> | undefined;
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword("dummy-password");
  await verifyPassword(password, await dummyHash);
}
