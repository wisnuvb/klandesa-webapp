import { NextRequest, NextResponse } from "next/server";
import { clientIpOf } from "@/lib/rbac/client-ip";
import { checkRegionalRateLimit } from "@/lib/regional-rate-limit";
import { fetchWilayah, isValidParent, parseLevel } from "@/lib/aspirasi/wilayah";

export const runtime = "nodejs";

/** Daftar wilayah untuk pemilih desa (publik, proksi wilayah.id dengan cache panjang). */
export async function GET(req: NextRequest) {
  const rl = checkRegionalRateLimit(clientIpOf(req), "aspirasi_wilayah", { maxRequests: 120 });
  if (!rl.ok) return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  const level = parseLevel(req.nextUrl.searchParams.get("level"));
  const parent = req.nextUrl.searchParams.get("parent") ?? "";
  if (!level || !isValidParent(level, parent)) return NextResponse.json({ error: "Parameter tidak valid." }, { status: 400 });
  const items = await fetchWilayah(level, parent);
  return NextResponse.json({ items }, { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } });
}
