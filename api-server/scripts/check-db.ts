// Neon（PostgreSQL）に Prisma でつながるかを確かめる。
// 使い方: npm run db:check
import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const [row] = await prisma.$queryRaw<
    { version: string; database: string; user: string; now: Date }[]
  >`SELECT version(), current_database() AS database, current_user AS "user", now()`;

  console.log("接続OK");
  console.log(`  データベース : ${row.database}`);
  console.log(`  ユーザー     : ${row.user}`);
  console.log(`  サーバー時刻 : ${row.now.toISOString()}`);
  console.log(`  PostgreSQL   : ${row.version.split(" on ")[0]}`);
}

main()
  .catch((error) => {
    console.error("接続に失敗しました");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
