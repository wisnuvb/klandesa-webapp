import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { getOverview } from "@/lib/platform/metrics/overview";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** Dasbor owner: KPI, daftar perhatian, grafik, mitra, penggunaan. Baca-saja; hasil di-cache 60 detik per proses. */
export async function GET(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json(await getOverview(), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    logger.error({ err }, "[admin/overview] gagal menghitung ringkasan");
    return NextResponse.json({ error: "Ringkasan belum bisa dimuat. Coba lagi sebentar lagi." }, { status: 500 });
  }
}
