import { NextRequest, NextResponse } from "next/server";
import { getCronSecret } from "@/lib/regional-news/config";
import { isValidCronAuth } from "@/lib/regional-news/cron-auth";
import { prisma } from "@/lib/prisma";
import { reconcileAndClear } from "@/lib/kependudukan/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Job harian: rekonsiliasi rumah tangga dan wilayah untuk semua desa yang fiturnya aktif (jaring pengaman bila
 * sinkronisasi saat ubah data pernah gagal, atau data diubah di luar aplikasi). Idempoten.
 * Dijalankan dengan `Authorization: Bearer $CRON_SECRET`.
 */
export async function POST(req: NextRequest) {
  const secret = getCronSecret();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET belum dikonfigurasi" }, { status: 503 });
  if (!isValidCronAuth(req.headers.get("authorization"), secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const villages = await prisma.village.findMany({ where: { settings: { path: "$.kependudukanV2", equals: true } }, select: { id: true } });
  let changed = 0;
  let failed = 0;
  for (const v of villages) {
    try {
      const r = await reconcileAndClear(v.id);
      if (Object.values(r).some((n) => n > 0)) changed++;
    } catch (e) {
      failed++;
      console.error(`[cron kependudukan-reconcile] desa ${v.id} gagal:`, e instanceof Error ? e.message : e);
    }
  }
  return NextResponse.json({ ok: failed === 0, villages: villages.length, changed, failed });
}
