import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { getRevenue } from "@/lib/platform/metrics/revenue";
import { parseRevenueRange } from "@/lib/platform/metrics/period";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** GET /api/admin/revenue?range=30d|90d|12m|ytd (bawaan 30d): deret waktu WIB + rincian per produk + tagihan bermasalah. */
export async function GET(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const raw = req.nextUrl.searchParams.get("range");
  const range = raw ? parseRevenueRange(raw) : "30d";
  if (!range) return NextResponse.json({ error: "Rentang tidak valid. Pilih 30d, 90d, 12m, atau ytd." }, { status: 400 });

  try {
    return NextResponse.json(await getRevenue(range), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    logger.error({ err, range }, "[admin/revenue] gagal menghitung pendapatan");
    return NextResponse.json({ error: "Data pendapatan belum bisa dimuat. Coba lagi sebentar lagi." }, { status: 500 });
  }
}
