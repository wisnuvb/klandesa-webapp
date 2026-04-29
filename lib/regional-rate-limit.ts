/**
 * Rate limit sederhana in-memory untuk endpoint regional (per IP + rute).
 * Untuk produksi multi-instance, ganti dengan Redis / edge limiter.
 */

type Bucket = { count: number; windowStart: number };

const store = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;

function key(ip: string, route: string): string {
  return `${ip}:${route}`;
}

export function checkRegionalRateLimit(
  ip: string,
  route: string,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const k = key(ip || "unknown", route);
  const now = Date.now();
  let b = store.get(k);
  if (!b || now - b.windowStart >= WINDOW_MS) {
    b = { count: 0, windowStart: now };
    store.set(k, b);
  }
  b.count += 1;
  if (b.count > MAX_REQUESTS) {
    const retryAfterSec = Math.ceil(
      (WINDOW_MS - (now - b.windowStart)) / 1000,
    );
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }
  return { ok: true };
}
