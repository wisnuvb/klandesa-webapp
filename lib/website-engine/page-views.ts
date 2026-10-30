import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const BOT_UA =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|go-http-client|axios|node-fetch/i;

/**
 * Hanya hitung tayangan manusia: tanpa UA, UA bot/penguji, prefetch router Next, dan request HEAD tidak dihitung.
 * Ini angka tayangan halaman, bukan pengunjung unik (sengaja tanpa cookie agar tidak perlu banner persetujuan).
 */
export function isCountablePageView(input: {
  userAgent: string | null | undefined;
  purpose?: string | null;
  nextRouterPrefetch?: string | null;
}): boolean {
  const ua = (input.userAgent ?? "").trim();
  if (!ua || BOT_UA.test(ua)) return false;
  if (input.nextRouterPrefetch) return false;
  const purpose = (input.purpose ?? "").toLowerCase();
  if (purpose === "prefetch" || purpose === "preview") return false;
  return true;
}

/** Tanggal kalender WIB (UTC+7) sebagai nilai DATE; desa Indonesia berpikir dalam hari WIB. */
export function jakartaDay(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()),
  );
}

/** Fire-and-forget: kegagalan pencatatan (mis. tabel belum dimigrasi) tidak boleh merusak halaman publik. */
export async function recordPageView(villageId: number): Promise<void> {
  try {
    const day = jakartaDay();
    await prisma.websiteDailyStat.upsert({
      where: { villageId_day: { villageId, day } },
      create: { villageId, day, pageViews: 1 },
      update: { pageViews: { increment: 1 } },
    });
  } catch (e) {
    logger.warn({ err: e, villageId }, "recordPageView failed");
  }
}

export type PageViewStats = {
  today: number;
  last30Days: number;
  total: number;
  /** Tanggal pertama ada data, supaya UI jujur bahwa hitungan dimulai dari sini */
  since: string | null;
};

/** `null` bila pencatatan tidak tersedia (mis. tabel belum ada) sehingga UI menyembunyikan kartunya. */
export async function getPageViewStats(
  villageId: number,
  now: Date = new Date(),
): Promise<PageViewStats | null> {
  try {
    const today = jakartaDay(now);
    const from30 = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
    const [todayRow, last30, total, first] = await Promise.all([
      prisma.websiteDailyStat.findUnique({
        where: { villageId_day: { villageId, day: today } },
        select: { pageViews: true },
      }),
      prisma.websiteDailyStat.aggregate({
        where: { villageId, day: { gte: from30 } },
        _sum: { pageViews: true },
      }),
      prisma.websiteDailyStat.aggregate({
        where: { villageId },
        _sum: { pageViews: true },
      }),
      prisma.websiteDailyStat.findFirst({
        where: { villageId },
        orderBy: { day: "asc" },
        select: { day: true },
      }),
    ]);
    return {
      today: todayRow?.pageViews ?? 0,
      last30Days: last30._sum.pageViews ?? 0,
      total: total._sum.pageViews ?? 0,
      since: first ? first.day.toISOString().slice(0, 10) : null,
    };
  } catch (e) {
    logger.warn({ err: e, villageId }, "getPageViewStats failed");
    return null;
  }
}
