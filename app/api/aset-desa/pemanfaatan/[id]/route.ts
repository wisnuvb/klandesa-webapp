import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { amendAgreement, deleteDraft, getAgreement, updateDraft } from "@/lib/aset-desa/land-service";

type Ctx = { params: Promise<{ id: string }> };
const notFound = () => NextResponse.json({ error: "Perjanjian tidak ditemukan" }, { status: 404 });

export async function GET(req: NextRequest, { params }: Ctx) {
  return attempt("GET /api/aset-desa/pemanfaatan/[id]", "Gagal memuat perjanjian", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const d = await getAgreement(prisma, guard.ctx.village.id, id);
    return d ? NextResponse.json(d) : notFound();
  });
}

/** Draf: ubah isi lengkap. Perjanjian berlaku: hanya kontak, ketentuan lain, rujukan penilaian, dan izin yang menyusul. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return attempt("PATCH /api/aset-desa/pemanfaatan/[id]", "Gagal menyimpan perjanjian", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const body = await req.json().catch(() => null);
    const cur = await prisma.landAgreement.findFirst({ where: { id, villageId: ctx.village.id }, select: { status: true } });
    if (!cur) return notFound();
    const r = cur.status === "DRAF" ? await updateDraft(prisma, { villageId: ctx.village.id, id, input: body }) : await amendAgreement(prisma, { villageId: ctx.village.id, id, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "land_agreements", id, { status: r.data.status, kind: r.data.kind });
    return NextResponse.json({ success: true, agreement: r.data });
  });
}

/** Hapus draf (perjanjian yang pernah berlaku disimpan sebagai riwayat). */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/aset-desa/pemanfaatan/[id]", "Gagal menghapus draf", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await deleteDraft(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "land_agreements", id, { status: "DRAF" });
    return NextResponse.json({ success: true });
  });
}
