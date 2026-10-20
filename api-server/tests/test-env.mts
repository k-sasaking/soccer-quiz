// テスト用の接続先（.env.test）を読む。
// テストは毎回 play_sessions を全件消すため、本番（.env）と同じ DB を指していたら止める。
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

const root = fileURLToPath(new URL("../", import.meta.url));

function readEnvFile(name: string): Record<string, string> | null {
  const path = `${root}${name}`;
  return existsSync(path) ? parse(readFileSync(path)) : null;
}

// Neon のホスト名から「-pooler」を除いたもの（同じ DB かどうかの比較に使う）
function endpointOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace("-pooler.", ".");
  } catch {
    return null;
  }
}

export function loadTestEnv(): Record<string, string> {
  const test = readEnvFile(".env.test");
  if (!test?.DATABASE_URL) {
    throw new Error(
      "api-server/.env.test に DATABASE_URL がありません。テスト専用の DB（Neon の test ブランチなど）の接続文字列を書いてください。",
    );
  }

  const app = readEnvFile(".env") ?? {};
  const appEndpoints = [app.DATABASE_URL, app.DIRECT_URL].map(endpointOf).filter(Boolean);
  const testEndpoints = [test.DATABASE_URL, test.DIRECT_URL].map(endpointOf).filter(Boolean);
  if (testEndpoints.some((e) => appEndpoints.includes(e))) {
    throw new Error(".env.test が .env と同じ DB を指しています。テストはデータを消すため、別の DB を指定してください。");
  }

  return { DATABASE_URL: test.DATABASE_URL, DIRECT_URL: test.DIRECT_URL ?? test.DATABASE_URL };
}
