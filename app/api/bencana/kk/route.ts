import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { attempt, permissions } from "@/lib/apbdes/http";
import { searchHouseholds } from "@/lib/incident/service";

/** Cari KK aktif untuk memilih penerima bantuan (?q= minimal 3 huruf/angka). Hanya 4 digit KK terakhir; butuh izin baca warga juga. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/bencana/kk", "Gagal mencari KK", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!permissions(ctx, "residents").read) return NextResponse.json({ error: "Anda tidak berhak mencari data warga." }, { status: 403 });
    const rows = await searchHouseholds(prisma, { villageId: ctx.village.id, q: req.nextUrl.searchParams.get("q") ?? "" });
    return NextResponse.json({ rows });
  });
}
