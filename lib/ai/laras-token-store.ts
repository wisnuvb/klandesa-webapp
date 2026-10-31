import { prisma } from "@/lib/prisma";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";
import { ACTION_TTL_SEC } from "@/lib/ai/laras-actions";

/**
 * Token usulan dipakai SEKALI. Tanpa tabel baru: memakai penghitung `mobile_rate_limits` dengan batas 1 selama masa
 * berlaku token. Konfirmasi ganda (klik dua kali, tab ganda, permintaan paralel) hanya sekali lolos; yang lain ditolak.
 */
const keyFor = (token: string) => limiterKey("laras:tok", token);

export async function consumeActionToken(token: string): Promise<boolean> {
  const r = await checkRateLimitDb(keyFor(token), { max: 1, windowMs: ACTION_TTL_SEC * 1000 });
  return r.ok;
}

/** Kembalikan token yang belum sempat dieksekusi (mis. galat sementara) agar pengguna bisa mencoba lagi. */
export async function releaseActionToken(token: string): Promise<void> {
  await prisma.mobileRateLimit.deleteMany({ where: { key: keyFor(token) } }).catch(() => undefined);
}
