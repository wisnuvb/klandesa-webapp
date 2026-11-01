import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, permissions, yearOf } from "@/lib/apbdes/http";
import { getRegistry } from "@/lib/kepatuhan/service";

/** Register laporan wajib satu tahun anggaran (?year=): tenggat, status, bukti kirim, dan tenggat terdekat. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/kepatuhan", "Gagal memuat kalender kepatuhan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await getRegistry(prisma, { villageId: ctx.village.id, year: yearOf(req.nextUrl.searchParams.get("year")) });
    if (!r.ok) return failResponse(r);
    return NextResponse.json({ ...r.data, can: permissions(ctx) });
  });
}
