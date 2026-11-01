import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { localToday } from "@/lib/form-input";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, permissions, yearOf } from "@/lib/apbdes/http";
import { getOverview } from "@/lib/kdmp/service";

/** Ringkasan dukungan KDMP satu tahun (?year=): pagu, penyaluran, angsuran, gerai/gudang, dan temuan. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/kdmp", "Gagal memuat dukungan KDMP", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const year = yearOf(req.nextUrl.searchParams.get("year"));
    const r = await getOverview(prisma, { villageId: ctx.village.id, year, today: localToday() });
    if (!r.ok) return failResponse(r);
    return NextResponse.json({ ...r.data, can: permissions(ctx) });
  });
}
