import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { loadVillageDetail } from "@/lib/platform/villages/queries";
import { badId, notFound, parseVillageId, type VillageRouteCtx } from "@/lib/platform/villages/route-helpers";

export const dynamic = "force-dynamic";

/** Desa 360: profil, langganan, penyimpanan, akuisisi, hitungan, modul, tagihan terbaru. Tanpa data pribadi. */
export async function GET(req: NextRequest, ctx: VillageRouteCtx) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const id = parseVillageId((await ctx.params).id);
  if (id == null) return badId();

  const data = await loadVillageDetail(id);
  if (!data) return notFound();
  return NextResponse.json(data, { status: 200, headers: { "Cache-Control": "no-store" } });
}
