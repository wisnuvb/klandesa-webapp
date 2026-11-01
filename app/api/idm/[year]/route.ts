import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { deleteYear } from "@/lib/idm/service";

/** Menghapus seluruh data IDM satu tahun milik desa (skor dan indikator). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ year: string }> }) {
  return attempt("DELETE /api/idm/[year]", "Gagal menghapus data IDM", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const raw = (await params).year;
    const year = /^\d{4}$/.test(raw) ? Number(raw) : NaN;
    const r = await deleteYear(prisma, { villageId: ctx.village.id, year });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "idm_scores", `${ctx.village.id}:${r.data.year}`, { year: r.data.year, indicators: r.data.indicators });
    return NextResponse.json({ success: true });
  });
}
