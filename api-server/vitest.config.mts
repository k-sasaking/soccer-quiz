import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { loadTestEnv } from "./tests/test-env.mts";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    // テストは .env ではなく .env.test の DB（本番とは別）を使う。
    // ログインの JWT はテスト用の鍵で作る（tests/api.test.ts の sessionCookie）
    env: { ...loadTestEnv(), NEXTAUTH_SECRET: "test-only-nextauth-secret" },
    globalSetup: ["tests/global-setup.mts"],
    // DB（Neon）への通信があるため、待ち時間を長めにする
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
