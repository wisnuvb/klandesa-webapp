import { NextRequest, NextResponse } from "next/server";
import { getCronSecret } from "@/lib/regional-news/config";
import { isValidCronAuth } from "@/lib/regional-news/cron-auth";
import { prisma } from "@/lib/prisma";
import { processDue, purgeOldDeliveries } from "@/lib/webhooks/deliver";
import { purgeOldProposals } from "@/lib/proposals/service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Job tiap menit: kirim ulang webhook yang jatuh tempo (percobaan pertama sudah dikirim saat kejadian terjadi), lalu
 * buang riwayat pengiriman yang melewati masa simpan. Aman dijalankan bersamaan. `Authorization: Bearer $CRON_SECRET`.
 */
export async function POST(req: NextRequest) {
  const secret = getCronSecret();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET belum dikonfigurasi" }, { status: 503 });
  if (!isValidCronAuth(req.headers.get("authorization"), secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const summary = await processDue(prisma, { limit: 100 });
  const housekeeping = Math.random() < 0.02;
  const purged = housekeeping ? await purgeOldDeliveries(prisma) : 0;
  const proposalsPurged = housekeeping ? await purgeOldProposals(prisma) : 0;
  return NextResponse.json({ ok: true, ...summary, purged, proposalsPurged });
}
