import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { removeActivity, saveActivity } from "@/lib/rkpdes/service";

type Ctx = { params: Promise<{ id: string; aid: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return attempt("PATCH /api/perencanaan/rkpdes/[id]/kegiatan/[aid]", "Gagal menyimpan kegiatan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const documentId = parseIntId(p.id);
    const activityId = parseIntId(p.aid);
    if (!documentId || !activityId) return NextResponse.json({ error: "Kegiatan tidak ditemukan." }, { status: 404 });
    const body = await req.json().catch(() => null);
    const r = await saveActivity(prisma, { villageId: ctx.village.id, documentId, activityId, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "rkpdes_activities", activityId, { documentId });
    return NextResponse.json({ success: true });
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/perencanaan/rkpdes/[id]/kegiatan/[aid]", "Gagal menghapus kegiatan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const documentId = parseIntId(p.id);
    const activityId = parseIntId(p.aid);
    if (!documentId || !activityId) return NextResponse.json({ error: "Kegiatan tidak ditemukan." }, { status: 404 });
    const r = await removeActivity(prisma, { villageId: ctx.village.id, documentId, activityId });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "rkpdes_activities", activityId, { documentId });
    return NextResponse.json({ success: true });
  });
}
