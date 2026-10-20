// Prisma CLI（generate / migrate / db push）の設定。
// .env は自動では読まれないので、ここで dotenv を使って読み込む。
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // npx prisma db seed / prisma migrate reset のときに実行する
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // CLI は接続プーラーを通さない DIRECT_URL を使う（なければ DATABASE_URL）
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
