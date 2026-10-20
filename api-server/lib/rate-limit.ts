// docs/api.md「呼び出し回数の制限」。同じ IP アドレスから1分あたりの回数を数える（固定ウィンドウ）。
// サーバーのメモリに持つ（サーバーを再起動すると数え直し。複数台で動かすときは共有されない）。

export type RateLimitGroup = "createPlaySession" | "createUser" | "login" | "default";

const LIMITS: Record<RateLimitGroup, number> = {
  createPlaySession: 30,
  createUser: 10,
  login: 10,
  default: 300,
};
const WINDOW_MS = 60_000;

type Counter = { windowStart: number; count: number };

const globalStore = globalThis as typeof globalThis & {
  __rateLimitCounters?: Map<string, Counter>;
};
const counters: Map<string, Counter> =
  globalStore.__rateLimitCounters ?? (globalStore.__rateLimitCounters = new Map());

// 上限を超えたら、あと何秒待てばよいかを返す。超えていなければ null
export function consumeRateLimit(group: RateLimitGroup, clientIp: string, now = Date.now()): number | null {
  const key = `${group}:${clientIp}`;
  let counter = counters.get(key);
  if (!counter || now - counter.windowStart >= WINDOW_MS) {
    counter = { windowStart: now, count: 0 };
    counters.set(key, counter);
  }
  counter.count += 1;
  if (counter.count > LIMITS[group]) {
    return Math.ceil((counter.windowStart + WINDOW_MS - now) / 1000);
  }
  return null;
}

// テスト用
export function clearRateLimits() {
  counters.clear();
}
