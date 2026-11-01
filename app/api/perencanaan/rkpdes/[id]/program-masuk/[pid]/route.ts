import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { removeIncoming } from "@/lib/rkpdes/service";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; pid: string }> }) {
  return attempt("DELETE /api/perencanaan/rkpdes/[id]/program-masuk/[pid]", "Gagal menghapus program", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const documentId = parseIntId(p.id);
    const programId = parseIntId(p.pid);
    if (!documentId || !programId) return NextResponse.json({ error: "Program tidak ditemukan." }, { status: 404 });
    const r = await removeIncoming(prisma, { villageId: ctx.village.id, documentId, programId });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "rkpdes_incoming_programs", programId, { documentId });
    return NextResponse.json({ success: true });
  });
}
