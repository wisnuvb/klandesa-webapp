import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientIpOf } from "@/lib/rbac/client-ip";
import { checkRegionalRateLimit } from "@/lib/regional-rate-limit";
import { searchAreas } from "@/lib/aspirasi/service";

/** Cari desa yang sudah punya halaman aspirasi (laporan tayang atau sudah dikelola desa). Publik, berbatas laju. */
export async function GET(req: NextRequest) {
  const rl = checkRegionalRateLimit(clientIpOf(req), "aspirasi_areas", { maxRequests: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 60);
  return NextResponse.json({ items: await searchAreas(prisma, q) });
}
