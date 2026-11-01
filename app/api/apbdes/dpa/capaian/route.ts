import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, yearOf } from "@/lib/apbdes/http";
import { saveRealizedVolume } from "@/lib/apbdes/dpa";

/** Capaian volume output kegiatan untuk Laporan Realisasi Kegiatan: { year, activityCode, volume }. */
export async function PUT(req: NextRequest) {
  return attempt("PUT /api/apbdes/dpa/capaian", "Gagal menyimpan capaian", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = (await req.json().catch(() => null)) as { year?: unknown; activityCode?: unknown; volume?: unknown } | null;
    const r = await saveRealizedVolume(prisma, { villageId: ctx.village.id, year: yearOf(body?.year, 0), activityCode: String(body?.activityCode ?? ""), volume: body?.volume ?? null });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "apbdes_activity_plans", r.data.id, { realizedVolume: body?.volume });
    return NextResponse.json({ success: true });
  });
}
