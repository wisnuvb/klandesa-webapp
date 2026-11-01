import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { removeProgress } from "@/lib/kdmp/service";

/** Menghapus satu catatan progres (koreksi salah input); progres gerai/gudang dihitung ulang dari catatan terakhir. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; pid: string }> }) {
  return attempt("DELETE /api/kdmp/fasilitas/[id]/progres/[pid]", "Gagal menghapus catatan progres", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const id = parseIntId(p.id);
    const progressId = parseIntId(p.pid);
    if (!id || !progressId) return NextResponse.json({ error: "Catatan progres tidak ditemukan." }, { status: 404 });
    const r = await removeProgress(prisma, { villageId: ctx.village.id, id, progressId });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "kdmp_facility_progress", progressId, { facilityId: id, ...r.data.removed });
    return NextResponse.json({ success: true, progressPct: r.data.progressPct });
  });
}
