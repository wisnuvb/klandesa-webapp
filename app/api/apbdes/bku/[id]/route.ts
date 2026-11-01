import { NextRequest, NextResponse } from "next/server";
import { auditWeb } from "@/lib/audit/web-audit";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { deleteEntry, updateEntry } from "@/lib/apbdes/service";
import { failResponse, attempt, parseIntId } from "@/lib/apbdes/http";

type Ctx = { params: Promise<{ id: string }> };

/** Mengoreksi catatan pada bulan yang masih terbuka. */
export async function PUT(req: NextRequest, { params }: Ctx) {
  return attempt("PUT /api/apbdes/bku/[id]", "Gagal mengubah catatan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Catatan tidak ditemukan" }, { status: 404 });
    const body = await req.json().catch(() => null);
    const r = await updateEntry(prisma, { villageId: ctx.village.id, entryId: id, input: body });
    if (!r.ok) return failResponse(r);
    const b = body as Record<string, unknown>;
    await auditWeb(req, ctx, "update", "apbdes_entries", id, { type: b.type, accountCode: b.accountCode, amount: b.amount });
    return NextResponse.json({ success: true });
  });
}

/** Menghapus catatan pada bulan yang masih terbuka (ditolak bila saldo sesudahnya menjadi minus). */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/apbdes/bku/[id]", "Gagal menghapus catatan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Catatan tidak ditemukan" }, { status: 404 });
    const r = await deleteEntry(prisma, { villageId: ctx.village.id, entryId: id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "apbdes_entries", id);
    return NextResponse.json({ success: true });
  });
}
