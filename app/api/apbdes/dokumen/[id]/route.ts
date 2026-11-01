import { NextRequest, NextResponse } from "next/server";
import { auditWeb } from "@/lib/audit/web-audit";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { deleteDocument, getDocument } from "@/lib/apbdes/service";
import { failResponse, attempt, parseIntId, permissions } from "@/lib/apbdes/http";

type Ctx = { params: Promise<{ id: string }> };

/** Satu dokumen APB Desa beserta barisnya dan keseimbangan anggaran. */
export async function GET(req: NextRequest, { params }: Ctx) {
  return attempt("GET /api/apbdes/dokumen/[id]", "Gagal memuat dokumen", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });
    const r = await getDocument(prisma, ctx.village.id, id);
    if (!r.ok) return failResponse(r);
    return NextResponse.json({ document: r.data, can: permissions(ctx) });
  });
}

/** Menghapus draf (dokumen yang sudah ditetapkan tidak bisa dihapus). */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/apbdes/dokumen/[id]", "Gagal menghapus dokumen", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });
    const r = await deleteDocument(prisma, { villageId: ctx.village.id, documentId: id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "apbdes_documents", id);
    return NextResponse.json({ success: true });
  });
}
