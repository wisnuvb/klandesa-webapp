import { NextRequest, NextResponse } from "next/server";
import { getCronSecret } from "@/lib/regional-news/config";
import { isValidCronAuth } from "@/lib/regional-news/cron-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const GB = 1024 * 1024 * 1024;
/** Toleransi drift float (GB) sebelum ditulis ulang, supaya tidak menulis setiap kali untuk beda sangat kecil. */
const EPSILON_GB = 0.001;

/**
 * Job harian: `village.storageUsed` ditambah manual setiap kali arsip baru dicatat
 * (lihat POST /api/digital-archives). Job ini menghitung ulang dari jumlah nyata
 * `SUM(DigitalArchive.fileSize)` agar drift (transaksi gagal sebagian, migrasi data, dll)
 * tidak menumpuk. Dijalankan dengan `Authorization: Bearer $CRON_SECRET`.
 */
export async function POST(req: NextRequest) {
  const secret = getCronSecret();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET belum dikonfigurasi" }, { status: 503 });
  if (!isValidCronAuth(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sums = await prisma.digitalArchive.groupBy({
    by: ["villageId"],
    _sum: { fileSize: true },
  });
  const realUsedGbByVillage = new Map<number, number>(
    sums.map((s) => [s.villageId, Number(s._sum.fileSize || 0) / GB]),
  );

  const villages = await prisma.village.findMany({
    select: { id: true, storageUsed: true },
  });

  let updated = 0;
  for (const v of villages) {
    const realGb = realUsedGbByVillage.get(v.id) ?? 0;
    if (Math.abs(realGb - v.storageUsed) > EPSILON_GB) {
      await prisma.village.update({
        where: { id: v.id },
        data: { storageUsed: realGb },
      });
      updated++;
    }
  }

  return NextResponse.json({ ok: true, villages: villages.length, updated });
}
