/**
 * Lightweight per-key rate limiter for the public ticket endpoint (§5):
 * 5 requests/minute and 30/hour. Exceeding either window is rejected (429).
 *
 * This is an in-memory implementation (per server instance). It's correct for
 * a single instance and local/demo use; for multi-instance production it should
 * be backed by a shared store (Upstash/Redis via RATE_LIMIT_REDIS_URL) behind
 * this same function — the call site does not change.
 */

interface Window {
  limit: number;
  windowMs: number;
}

const WINDOWS: ReadonlyArray<Window> = [
  { limit: 5, windowMs: 60_000 },
  { limit: 30, windowMs: 60 * 60_000 },
];

const MAX_WINDOW_MS = Math.max(...WINDOWS.map((w) => w.windowMs));

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the caller may retry, when blocked. */
  retryAfterSeconds?: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < MAX_WINDOW_MS);

  for (const { limit, windowMs } of WINDOWS) {
    const inWindow = recent.filter((t) => now - t < windowMs);
    if (inWindow.length >= limit) {
      const oldest = Math.min(...inWindow);
      hits.set(key, recent);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
      };
    }
  }

  recent.push(now);
  hits.set(key, recent);
  return { allowed: true };
}

/** Test helper: clear all recorded hits. */
export function __resetRateLimit(): void {
  hits.clear();
}
