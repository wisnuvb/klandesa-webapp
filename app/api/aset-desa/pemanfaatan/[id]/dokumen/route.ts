import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { addDoc, removeDoc } from "@/lib/aset-desa/land-service";

type Ctx = { params: Promise<{ id: string }> };

/** Lampirkan dokumen Arsip Digital: { kind, archiveId, label? }. */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/aset-desa/pemanfaatan/[id]/dokumen", "Gagal melampirkan dokumen", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Perjanjian tidak ditemukan" }, { status: 404 });
    const r = await addDoc(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, agreementId: id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "land_agreement_docs", r.data.id, { agreementId: id });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}

/** Lepas lampiran: ?docId=. Berkas di Arsip Digital tidak dihapus. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/aset-desa/pemanfaatan/[id]/dokumen", "Gagal melepas lampiran", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    const docId = parseIntId(req.nextUrl.searchParams.get("docId") ?? "");
    if (!id || !docId) return NextResponse.json({ error: "Lampiran tidak ditemukan" }, { status: 404 });
    const r = await removeDoc(prisma, { villageId: ctx.village.id, agreementId: id, docId });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "land_agreement_docs", docId, { agreementId: id });
    return NextResponse.json({ success: true });
  });
}
