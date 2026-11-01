import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { removeTeamMember } from "@/lib/rkpdes/service";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; mid: string }> }) {
  return attempt("DELETE /api/perencanaan/rkpdes/[id]/tim/[mid]", "Gagal menghapus anggota tim", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const documentId = parseIntId(p.id);
    const memberId = parseIntId(p.mid);
    if (!documentId || !memberId) return NextResponse.json({ error: "Anggota tim tidak ditemukan." }, { status: 404 });
    const r = await removeTeamMember(prisma, { villageId: ctx.village.id, documentId, memberId });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "rkpdes_team_members", memberId, { documentId });
    return NextResponse.json({ success: true });
  });
}
