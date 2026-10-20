// Prisma Client の作り方（1つだけ作って全ルートで共有する）。
// Next.js の開発中はファイルを直すたびにモジュールが読み直されるため、globalThis に置いて使い回す。

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("環境変数 DATABASE_URL が設定されていません（api-server/.env を確認してください）");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as typeof globalThis & {
  __prisma?: PrismaClient;
};

export const prisma: PrismaClient = globalForPrisma.__prisma ?? (globalForPrisma.__prisma = createPrismaClient());
