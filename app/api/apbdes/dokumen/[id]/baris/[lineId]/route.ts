import { NextRequest, NextResponse } from "next/server";
import { auditWeb } from "@/lib/audit/web-audit";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { deleteLine, updateLine } from "@/lib/apbdes/service";
import { failResponse, attempt, parseIntId } from "@/lib/apbdes/http";

type Ctx = { params: Promise<{ id: string; lineId: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  return attempt("PUT /api/apbdes/dokumen/[id]/baris/[lineId]", "Gagal mengubah baris anggaran", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const [id, lineId] = [parseIntId(p.id), parseIntId(p.lineId)];
    if (!id || !lineId) return NextResponse.json({ error: "Baris tidak ditemukan" }, { status: 404 });
    const body = await req.json().catch(() => null);
    const r = await updateLine(prisma, { villageId: ctx.village.id, documentId: id, lineId, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "apbdes_lines", lineId, { documentId: id, accountCode: r.data.accountCode, amount: r.data.amount });
    return NextResponse.json({ success: true, line: r.data });
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/apbdes/dokumen/[id]/baris/[lineId]", "Gagal menghapus baris anggaran", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const [id, lineId] = [parseIntId(p.id), parseIntId(p.lineId)];
    if (!id || !lineId) return NextResponse.json({ error: "Baris tidak ditemukan" }, { status: 404 });
    const r = await deleteLine(prisma, { villageId: ctx.village.id, documentId: id, lineId });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "apbdes_lines", lineId, { documentId: id });
    return NextResponse.json({ success: true });
  });
}
