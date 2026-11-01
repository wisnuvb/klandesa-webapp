import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { removeWorker } from "@/lib/pktd/service";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; wid: string }> }) {
  return attempt("DELETE /api/pktd/[id]/pekerja/[wid]", "Gagal menghapus pekerja", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const id = parseIntId(p.id);
    const wid = parseIntId(p.wid);
    if (!id || !wid) return NextResponse.json({ error: "Pekerja tidak ditemukan." }, { status: 404 });
    const r = await removeWorker(prisma, { villageId: ctx.village.id, activityId: id, id: wid });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "pktd_workers", wid, { activityId: id });
    return NextResponse.json({ success: true });
  });
}
