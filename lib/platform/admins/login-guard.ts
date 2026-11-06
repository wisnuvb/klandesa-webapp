import { prisma } from "@/lib/prisma";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";

/**
 * Pembatas KEGAGALAN verifikasi 2FA login platform. Beda dari pola `requireStepUp` (yang hanya menghitung lalu menolak
 * percobaan yang gagal): di sini batas diperiksa SEBELUM kode dinilai, jadi setelah terkunci bahkan kode yang benar
 * ditolak dan penyerang yang tahu sandi tidak bisa menebak 1.000.000 kemungkinan.
 */
export const TOTP_FAIL_WINDOW_MS = 15 * 60_000;
export const TOTP_FAIL_MAX_PER_ADMIN = 5;
export const TOTP_FAIL_MAX_PER_IP = 12;

type Opts = { max: number; windowMs: number };

/** Detik sampai boleh mencoba lagi bila terkunci; null bila belum. Tidak menaikkan hitungan. */
export async function lockedForSec(key: string, o: Opts, now = Date.now()): Promise<number | null> {
  const row = await prisma.mobileRateLimit.findUnique({ where: { key }, select: { count: true, windowStart: true } });
  if (!row) return null;
  const age = now - row.windowStart.getTime();
  if (age >= o.windowMs || row.count < o.max) return null;
  return Math.max(1, Math.ceil((o.windowMs - age) / 1000));
}

/**
 * Reservasi satu percobaan secara ATOMIK SEBELUM dinilai (cek-lalu-bertindak tidak aman untuk permintaan paralel).
 * Hitungan naik dalam satu pernyataan upsert; hitungan dibaca dalam transaksi yang sama sementara baris masih terkunci, jadi
 * `count` persis milik permintaan ini. Hanya `count <= max` yang boleh menilai kredensial. Sukses → `clearFailures`/`refundAttempt`.
 */
export type Reservation = { ok: true; count: number } | { ok: false; count: number; retryAfterSec: number };

export async function reserveAttempt(key: string, o: Opts, nowMs = Date.now()): Promise<Reservation> {
  const now = new Date(nowMs);
  const cutoff = new Date(nowMs - o.windowMs);
  const row = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO mobile_rate_limits (\`key\`, \`count\`, windowStart) VALUES (${key}, 1, ${now})
      ON DUPLICATE KEY UPDATE
        \`count\` = IF(windowStart < ${cutoff}, 1, \`count\` + 1),
        windowStart = IF(windowStart < ${cutoff}, ${now}, windowStart)`;
    return tx.mobileRateLimit.findUnique({ where: { key }, select: { count: true, windowStart: true } });
  });
  const count = row?.count ?? 1;
  if (count > o.max) {
    const age = nowMs - (row?.windowStart.getTime() ?? nowMs);
    return { ok: false, count, retryAfterSec: Math.max(1, Math.ceil((o.windowMs - age) / 1000)) };
  }
  return { ok: true, count };
}

/** Kembalikan satu reservasi (percobaan sah yang berhasil tidak boleh menghabiskan jatah, mis. batas per-IP). */
export async function refundAttempt(key: string): Promise<void> {
  await prisma.$executeRaw`UPDATE mobile_rate_limits SET \`count\` = GREATEST(\`count\` - 1, 0) WHERE \`key\` = ${key}`;
}

/** Catat satu kegagalan; mengembalikan hitungan kegagalan beruntun dalam jendela ini. */
export async function recordFailure(key: string, o: Opts): Promise<number> {
  await checkRateLimitDb(key, o);
  const row = await prisma.mobileRateLimit.findUnique({ where: { key }, select: { count: true } });
  return row?.count ?? 1;
}

export async function clearFailures(key: string): Promise<void> {
  await prisma.mobileRateLimit.deleteMany({ where: { key } });
}

export const totpFailKeyAdmin = (platformUserId: number) => limiterKey("platform-totp-fail-admin", platformUserId);
export const totpFailKeyIp = (ip: string) => limiterKey("platform-totp-fail-ip", ip);
export const stepUpFailKeyAdmin = (platformUserId: number) => limiterKey("platform-stepup-fail", platformUserId);
export const loginFailKeyAdmin = (platformUserId: number) => limiterKey("platform-login-fail-admin", platformUserId);

/**
 * Reservasi percobaan 2FA (per admin + per IP) secara atomik. Urutan: IP dulu (agar sumber yang sudah terkunci tidak menghabiskan
 * jatah admin), lalu admin; bila admin terkunci, reservasi IP dikembalikan. `count` = percobaan beruntun admin termasuk ini.
 */
export async function reserveTotpAttempt(platformUserId: number, ip: string): Promise<{ ok: true; count: number } | { ok: false; retryAfterSec: number }> {
  const byIp = await reserveAttempt(totpFailKeyIp(ip), { max: TOTP_FAIL_MAX_PER_IP, windowMs: TOTP_FAIL_WINDOW_MS });
  if (!byIp.ok) return { ok: false, retryAfterSec: byIp.retryAfterSec };
  const byAdmin = await reserveAttempt(totpFailKeyAdmin(platformUserId), { max: TOTP_FAIL_MAX_PER_ADMIN, windowMs: TOTP_FAIL_WINDOW_MS });
  if (!byAdmin.ok) {
    await refundAttempt(totpFailKeyIp(ip));
    return { ok: false, retryAfterSec: byAdmin.retryAfterSec };
  }
  return { ok: true, count: byAdmin.count };
}

/** Sukses: hitungan admin dihapus, jatah IP dikembalikan. */
export async function releaseTotpSuccess(platformUserId: number, ip: string): Promise<void> {
  await clearFailures(totpFailKeyAdmin(platformUserId));
  await refundAttempt(totpFailKeyIp(ip));
}

/** Buka semua kunci laju milik satu admin (dipakai aksi `unlock`). Kunci yang memuat IP tidak bisa dihitung ulang dan hangus sendiri. */
export async function clearAdminLocks(platformUserId: number, email: string): Promise<number> {
  const keys = [
    totpFailKeyAdmin(platformUserId),
    loginFailKeyAdmin(platformUserId),
    stepUpFailKeyAdmin(platformUserId),
    limiterKey("web-login-email", email.toLowerCase()),
  ];
  const r = await prisma.mobileRateLimit.deleteMany({ where: { key: { in: keys } } });
  return r.count;
}
