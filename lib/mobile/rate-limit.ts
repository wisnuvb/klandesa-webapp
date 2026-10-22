/**
 * Rate limit in-memory untuk endpoint auth mobile (per kunci, mis. IP+rute).
 * Seperti lib/regional-rate-limit.ts: untuk multi-instance ganti dengan Redis.
 */
type Bucket = { count: number; windowStart: number };
const store = new Map<string, Bucket>();

export function checkMobileRateLimit(
  key: string,
  opts: { max: number; windowMs: number },
  now = Date.now(),
): { ok: true } | { ok: false; retryAfterSec: number } {
  let b = store.get(key);
  if (!b || now - b.windowStart >= opts.windowMs) {
    b = { count: 0, windowStart: now };
    store.set(key, b);
  }
  b.count += 1;
  if (b.count > opts.max) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((opts.windowMs - (now - b.windowStart)) / 1000)) };
  }
  if (store.size > 5000) {
    for (const [k, v] of store) if (now - v.windowStart >= opts.windowMs) store.delete(k);
  }
  return { ok: true };
}

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  return (xf?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
}
