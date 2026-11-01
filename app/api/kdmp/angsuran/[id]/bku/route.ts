import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, parseIntId, permissions } from "@/lib/apbdes/http";
import { postInstallmentToBku, unpostInstallmentFromBku } from "@/lib/kdmp/service";

type Ctx = { params: Promise<{ id: string }> };
const notFound = () => NextResponse.json({ error: "Catatan angsuran tidak ditemukan." }, { status: 404 });

/** Mencatat angsuran ke Buku Kas Umum: { activityCode, accountCode, channel, voucherNo }. Perlu izin mencatat di keuangan desa. */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/kdmp/angsuran/[id]/bku", "Gagal mencatat ke Buku Kas Umum", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!permissions(ctx).create) return forbidden("Anda tidak berwenang mencatat ke Buku Kas Umum.");
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await postInstallmentToBku(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "apbdes_entries", r.data.entryId, { source: "kdmp_installments", installmentId: id, voucherNo: r.data.voucherNo, amount: r.data.amount, activityCode: r.data.activityCode, accountCode: r.data.accountCode, channel: r.data.channel, paidOn: r.data.paidOn });
    return NextResponse.json({ success: true, entryId: r.data.entryId }, { status: 201 });
  });
}

/** Membatalkan pencatatan Buku Kas Umum (menghapus catatan kas yang dibuat dari angsuran ini). */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/kdmp/angsuran/[id]/bku", "Gagal membatalkan pencatatan Buku Kas Umum", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!permissions(ctx).delete) return forbidden("Anda tidak berwenang membatalkan catatan Buku Kas Umum.");
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await unpostInstallmentFromBku(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "apbdes_entries", r.data.entryId, { source: "kdmp_installments", installmentId: id, voucherNo: r.data.voucherNo, amount: r.data.amount, activityCode: r.data.activityCode, accountCode: r.data.accountCode, channel: r.data.channel, paidOn: r.data.paidOn });
    return NextResponse.json({ success: true });
  });
}
