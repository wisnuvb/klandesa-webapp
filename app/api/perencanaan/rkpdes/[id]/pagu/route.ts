import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { removePagu, upsertPagu } from "@/lib/rkpdes/service";

/** Simpan (tambah/ubah) pagu indikatif satu sumber dana. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("PUT /api/perencanaan/rkpdes/[id]/pagu", "Gagal menyimpan pagu", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "RKP Desa tidak ditemukan." }, { status: 404 });
    const body = await req.json().catch(() => null);
    const r = await upsertPagu(prisma, { villageId: ctx.village.id, documentId: id, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "rkpdes_pagu_indicative", id, { source: r.data.source });
    return NextResponse.json({ success: true });
  });
}

/** Hapus pagu satu sumber dana (?source=). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("DELETE /api/perencanaan/rkpdes/[id]/pagu", "Gagal menghapus pagu", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "RKP Desa tidak ditemukan." }, { status: 404 });
    const source = (req.nextUrl.searchParams.get("source") ?? "").slice(0, 12);
    const r = await removePagu(prisma, { villageId: ctx.village.id, documentId: id, source });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "rkpdes_pagu_indicative", id, { source });
    return NextResponse.json({ success: true });
  });
}
