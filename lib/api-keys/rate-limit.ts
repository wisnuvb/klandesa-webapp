/**
 * Pembatas laju jendela-tetap per kunci, di memori proses. Dengan beberapa proses (PM2 cluster) batas efektifnya
 * dikalikan jumlah proses; cukup sebagai pengaman penyalahgunaan, bukan kuota penagihan.
 */
export class FixedWindowLimiter {
  private readonly hits = new Map<string, { start: number; count: number }>();
  constructor(
    readonly limit: number,
    readonly windowMs: number,
  ) {}

  check(key: string, now: number = Date.now()): { allowed: boolean; remaining: number; retryAfterSec: number } {
    let h = this.hits.get(key);
    if (!h || now - h.start >= this.windowMs) {
      h = { start: now, count: 0 };
      this.hits.set(key, h);
      if (this.hits.size > 5000) this.sweep(now);
    }
    const retryAfterSec = Math.max(1, Math.ceil((h.start + this.windowMs - now) / 1000));
    if (h.count >= this.limit) return { allowed: false, remaining: 0, retryAfterSec };
    h.count += 1;
    return { allowed: true, remaining: this.limit - h.count, retryAfterSec };
  }

  private sweep(now: number) {
    for (const [k, v] of this.hits) if (now - v.start >= this.windowMs) this.hits.delete(k);
  }
}
