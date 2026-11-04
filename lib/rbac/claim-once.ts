import { prisma } from "@/lib/prisma";
import { limiterKey } from "@/lib/mobile/rate-limit";

/**
 * Klaim "tepat satu pemenang per jendela waktu" yang ATOMIK, lewat INSERT dengan kunci unik (yang kedua gagal P2002).
 * Berbeda dari `checkRateLimitDb` (menaikkan hitungan lalu membaca terpisah): pada permintaan bersamaan pembatas itu bisa
 * menolak SEMUA penelepon, sedangkan di sini tepat satu lolos. Jendela berbentuk bucket tetap (floor(now / windowMs)); tindakan
 * yang jatuh di dua sisi batas bucket bisa lolos dua kali, jadi pasangkan dengan dedup berbasis waktu bila itu penting.
 * Baris dibersihkan oleh `pruneRateLimits` bersama baris pembatas laju lainnya.
 */
export async function claimOnce(name: string, id: string | number, windowMs: number, now = Date.now()): Promise<boolean> {
  const key = limiterKey(`once:${name}`, id, Math.floor(now / windowMs));
  try {
    await prisma.mobileRateLimit.create({ data: { key, count: 1, windowStart: new Date(now) } });
    return true;
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return false;
    throw e;
  }
}
