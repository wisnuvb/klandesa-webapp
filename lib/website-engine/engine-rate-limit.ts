/** Rate limit khusus PATCH engine website (in-memory; satu instance). */

type Bucket = { count: number; windowStart: number };

const store = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_PATCH_PER_WINDOW = 45;

function rateKey(ip: string): string {
  return `engine:${ip || "unknown"}`;
}

export function checkWebsiteEnginePatchLimit(
  ip: string,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const k = rateKey(ip);
  const now = Date.now();
  let b = store.get(k);
  if (!b || now - b.windowStart >= WINDOW_MS) {
    b = { count: 0, windowStart: now };
    store.set(k, b);
  }
  b.count += 1;
  if (b.count > MAX_PATCH_PER_WINDOW) {
    const retryAfterSec = Math.ceil(
      (WINDOW_MS - (now - b.windowStart)) / 1000,
    );
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }
  return { ok: true };
}
