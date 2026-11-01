import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { rpjmdesGate } from "@/lib/rpjm/http";
import { removeProgram, saveProgram } from "@/lib/rpjm/service";

type Ctx = { params: Promise<{ id: string; pid: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return attempt("PATCH /api/perencanaan/rpjm/[id]/program/[pid]", "Gagal menyimpan program", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const denied = rpjmdesGate(ctx, "update");
    if (denied) return denied;
    const p = await params;
    const planId = parseIntId(p.id);
    const programId = parseIntId(p.pid);
    if (!planId || !programId) return NextResponse.json({ error: "Program tidak ditemukan." }, { status: 404 });
    const body = await req.json().catch(() => null);
    const r = await saveProgram(prisma, { villageId: ctx.village.id, planId, programId, userId: ctx.userId ?? null, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "rpjm_programs", programId, { planId });
    return NextResponse.json({ success: true });
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/perencanaan/rpjm/[id]/program/[pid]", "Gagal menghapus program", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const denied = rpjmdesGate(ctx, "delete");
    if (denied) return denied;
    const p = await params;
    const planId = parseIntId(p.id);
    const programId = parseIntId(p.pid);
    if (!planId || !programId) return NextResponse.json({ error: "Program tidak ditemukan." }, { status: 404 });
    const r = await removeProgram(prisma, { villageId: ctx.village.id, planId, programId, userId: ctx.userId ?? null });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "rpjm_programs", programId, { planId });
    return NextResponse.json({ success: true });
  });
}
