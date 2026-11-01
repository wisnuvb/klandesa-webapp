import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { removeDecision, updateDecision } from "@/lib/musdes/service";

type Ctx = { params: Promise<{ id: string; did: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return attempt("PATCH /api/musdes/[id]/keputusan/[did]", "Gagal menyimpan keputusan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const meetingId = parseIntId(p.id);
    const decisionId = parseIntId(p.did);
    if (!meetingId || !decisionId) return NextResponse.json({ error: "Keputusan tidak ditemukan." }, { status: 404 });
    const body = await req.json().catch(() => null);
    const r = await updateDecision(prisma, { villageId: ctx.village.id, meetingId, decisionId, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "village_meeting_decisions", decisionId, { meetingId });
    return NextResponse.json({ success: true });
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/musdes/[id]/keputusan/[did]", "Gagal menghapus keputusan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const meetingId = parseIntId(p.id);
    const decisionId = parseIntId(p.did);
    if (!meetingId || !decisionId) return NextResponse.json({ error: "Keputusan tidak ditemukan." }, { status: 404 });
    const r = await removeDecision(prisma, { villageId: ctx.village.id, meetingId, decisionId });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "village_meeting_decisions", decisionId, { meetingId });
    return NextResponse.json({ success: true });
  });
}
