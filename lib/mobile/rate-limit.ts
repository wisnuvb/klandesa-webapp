import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Rate limit untuk endpoint mobile.
 *
 * - `checkMobileRateLimit`: di memori, per worker. Cukup untuk endpoint berisiko rendah
 *   (webapp berjalan PM2 cluster, jadi batas efektif = batas × jumlah worker).
 * - `checkRateLimitDb`: bersama lintas worker/instance lewat tabel `mobile_rate_limits`.
 *   Wajib untuk login, registrasi, reset password, dan aksi sensitif.
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

/** Kunci pendek & seragam: nama bucket + hash bagian dinamis (tidak menyimpan NIK/email mentah di DB). */
export function limiterKey(bucket: string, ...parts: (string | number)[]): string {
  return `${bucket}:${createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 40)}`;
}

export async function checkRateLimitDb(
  key: string,
  opts: { max: number; windowMs: number },
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - opts.windowMs);
  // Atomik: jendela baru → reset ke 1, jendela berjalan → +1.
  await prisma.$executeRaw`
    INSERT INTO mobile_rate_limits (\`key\`, \`count\`, windowStart) VALUES (${key}, 1, ${now})
    ON DUPLICATE KEY UPDATE
      \`count\` = IF(windowStart < ${cutoff}, 1, \`count\` + 1),
      windowStart = IF(windowStart < ${cutoff}, ${now}, windowStart)`;
  const row = await prisma.mobileRateLimit.findUnique({ where: { key }, select: { count: true, windowStart: true } });
  if (row && row.count > opts.max) {
    const retry = Math.ceil((opts.windowMs - (now.getTime() - row.windowStart.getTime())) / 1000);
    return { ok: false, retryAfterSec: Math.max(1, retry) };
  }
  return { ok: true };
}

/** Hapus baris kedaluwarsa (dipanggil acak, murah). */
export async function pruneRateLimits(): Promise<void> {
  await prisma.mobileRateLimit.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - 24 * 3600 * 1000) } } });
}

/**
 * IP klien. Header X-Forwarded-For bisa dipalsukan klien bila proxy hanya menambah ke daftar,
 * jadi utamakan X-Real-IP (diisi Nginx dari $remote_addr) dan, bila tidak ada, ambil entri TERAKHIR
 * XFF (yang ditambahkan proxy tepercaya), bukan yang pertama.
 */
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const xf = req.headers.get("x-forwarded-for");
  const parts = xf?.split(",").map((s) => s.trim()).filter(Boolean);
  return parts?.length ? parts[parts.length - 1]! : "unknown";
}
