import { NextRequest, NextResponse } from "next/server";
import { buildMobileConfig } from "@/lib/mobile/version";

export const dynamic = "force-dynamic";

/** Publik: dipanggil app saat dibuka untuk force-update. Tidak butuh login. */
export async function GET(req: NextRequest) {
  const cfg = buildMobileConfig(req.headers.get("x-app-version"));
  return NextResponse.json(cfg, { headers: { "Cache-Control": "public, max-age=300" } });
}
