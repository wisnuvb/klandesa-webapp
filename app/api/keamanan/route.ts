import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { attempt } from "@/lib/apbdes/http";
import { todayJakarta } from "@/lib/keamanan/calc";
import { hasDetail, keamananCan } from "@/lib/keamanan/http";
import { getOverview } from "@/lib/keamanan/service";

/** Ringkasan keamanan & ketertiban: kejadian (tanpa data pribadi), Satlinmas, ronda malam ini, mediasi, dan temuan. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/keamanan", "Gagal memuat ringkasan keamanan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const overview = await getOverview(prisma, { villageId: ctx.village.id, today: todayJakarta() });
    return NextResponse.json({ ...overview, can: keamananCan(ctx), detail: hasDetail(ctx) });
  });
}
