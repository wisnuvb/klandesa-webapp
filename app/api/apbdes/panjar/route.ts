import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { attempt, permissions, yearOf } from "@/lib/apbdes/http";
import { listPanjar } from "@/lib/apbdes/spp";

/** Buku Pembantu Panjar (?year=): panjar swakelola, pertanggungjawaban, pengembalian, saldo, dan jatuh tempo 10 hari kerja. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/apbdes/panjar", "Gagal memuat panjar", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const year = yearOf(req.nextUrl.searchParams.get("year"));
    return NextResponse.json({ year, panjar: await listPanjar(prisma, ctx.village.id, year), can: permissions(ctx) });
  });
}
