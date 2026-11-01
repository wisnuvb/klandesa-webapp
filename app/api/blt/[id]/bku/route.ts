import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, parseIntId, permissions } from "@/lib/apbdes/http";
import { postPaymentsToBku, unpostPaymentsFromBku } from "@/lib/blt/service";

type Ctx = { params: Promise<{ id: string }> };
const notFound = () => NextResponse.json({ error: "Program BLT tidak ditemukan." }, { status: 404 });

/** Mencatat pembayaran BLT satu tanggal bayar ke Buku Kas Umum: { paidOn, activityCode, accountCode, channel, voucherNo }. Perlu izin mencatat di keuangan desa. */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/blt/[id]/bku", "Gagal mencatat ke Buku Kas Umum", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!permissions(ctx, "apbdes").create) return forbidden("Anda tidak berwenang mencatat ke Buku Kas Umum.");
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await postPaymentsToBku(prisma, { villageId: ctx.village.id, programId: id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "apbdes_entries", r.data.entryId, { source: "blt_payments", programId: id, voucherNo: r.data.voucherNo, amount: r.data.amount, activityCode: r.data.activityCode, accountCode: r.data.accountCode, channel: r.data.channel, paidOn: r.data.paidOn, payments: r.data.payments });
    return NextResponse.json({ success: true, entryId: r.data.entryId }, { status: 201 });
  });
}

/** Membatalkan pencatatan Buku Kas Umum (?entry=id catatan): menghapus catatan kas yang dibuat dari pembayaran itu. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/blt/[id]/bku", "Gagal membatalkan pencatatan Buku Kas Umum", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!permissions(ctx, "apbdes").delete) return forbidden("Anda tidak berwenang membatalkan catatan Buku Kas Umum.");
    const id = parseIntId((await params).id);
    const entryId = parseIntId(req.nextUrl.searchParams.get("entry") ?? "");
    if (!id || !entryId) return notFound();
    const r = await unpostPaymentsFromBku(prisma, { villageId: ctx.village.id, programId: id, entryId });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "apbdes_entries", entryId, { source: "blt_payments", programId: id, voucherNo: r.data.voucherNo, amount: r.data.amount, activityCode: r.data.activityCode, accountCode: r.data.accountCode, channel: r.data.channel, paidOn: r.data.paidOn, payments: r.data.payments });
    return NextResponse.json({ success: true });
  });
}
