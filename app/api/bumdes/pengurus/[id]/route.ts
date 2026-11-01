import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { bumdesScope } from "@/lib/bumdes/api-context";
import { removeOfficer, updateOfficer } from "@/lib/bumdes/service";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("PATCH /api/bumdes/pengurus/[id]", "Gagal mengubah pengurus", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const s = await bumdesScope(guard.ctx, { write: true });
    if (!s.ok) return s.response;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Pengurus tidak ditemukan." }, { status: 404 });
    const r = await updateOfficer(prisma, { bumdesId: s.bumdes.id, id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, s.ctx, "update", "bumdes_officers", id);
    return NextResponse.json({ success: true });
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("DELETE /api/bumdes/pengurus/[id]", "Gagal menghapus pengurus", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const s = await bumdesScope(guard.ctx, { write: true });
    if (!s.ok) return s.response;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Pengurus tidak ditemukan." }, { status: 404 });
    const r = await removeOfficer(prisma, { bumdesId: s.bumdes.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, s.ctx, "delete", "bumdes_officers", id, { role: r.data.role });
    return NextResponse.json({ success: true });
  });
}
