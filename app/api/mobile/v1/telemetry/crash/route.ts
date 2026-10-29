import { NextRequest, NextResponse } from "next/server";
import { mobileError } from "@/lib/mobile/context";
import { sanitizeCrashReport } from "@/lib/mobile/crash-logic";
import { checkMobileRateLimit, clientIp } from "@/lib/mobile/rate-limit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Laporan crash dari app (publik karena crash bisa terjadi sebelum login). Hanya ditulis ke log terstruktur
 * (`msg: "mobile_crash"`), tidak disimpan di DB. Dibatasi per IP dan ukuran.
 */
export async function POST(req: NextRequest) {
  const limited = checkMobileRateLimit(`crash:${clientIp(req)}`, { max: 20, windowMs: 60_000 });
  if (!limited.ok) return mobileError("RATE_LIMITED", "Terlalu banyak laporan.", 429, { retryAfterSec: limited.retryAfterSec });
  if (Number(req.headers.get("content-length") ?? 0) > 16_000) return mobileError("INVALID_REQUEST", "Laporan terlalu besar.", 413);
  const report = sanitizeCrashReport(await req.json().catch(() => null));
  if (!report) return mobileError("INVALID_REQUEST", "Laporan tidak valid.", 400);
  logger.error({ crash: report }, "mobile_crash");
  return new NextResponse(null, { status: 204 });
}
