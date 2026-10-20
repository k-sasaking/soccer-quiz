// テストの前に1回だけ、テスト用 DB にマイグレーションと初期データを入れる
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadTestEnv } from "./test-env.mts";

export default function setup() {
  const cwd = fileURLToPath(new URL("../", import.meta.url));
  const env = { ...process.env, ...loadTestEnv() };
  execSync("npx prisma migrate deploy", { cwd, env, stdio: "pipe" });
  execSync("npx tsx prisma/seed.ts", { cwd, env, stdio: "inherit" });
}
