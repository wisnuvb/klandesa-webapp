import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { rpjmdesGate } from "@/lib/rpjm/http";
import { removeTeamMember } from "@/lib/rpjm/service";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; mid: string }> }) {
  return attempt("DELETE /api/perencanaan/rpjm/[id]/tim/[mid]", "Gagal menghapus anggota tim", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const denied = rpjmdesGate(ctx, "update");
    if (denied) return denied;
    const p = await params;
    const planId = parseIntId(p.id);
    const memberId = parseIntId(p.mid);
    if (!planId || !memberId) return NextResponse.json({ error: "Anggota tim tidak ditemukan." }, { status: 404 });
    const r = await removeTeamMember(prisma, { villageId: ctx.village.id, planId, memberId });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "rpjm_team_members", memberId, { planId });
    return NextResponse.json({ success: true });
  });
}
