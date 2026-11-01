import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, parseIntId, permissions } from "@/lib/apbdes/http";
import { postWagesToBku, unpostWagesFromBku } from "@/lib/pktd/service";

type Ctx = { params: Promise<{ id: string }> };
const notFound = () => NextResponse.json({ error: "Kegiatan PKTD tidak ditemukan." }, { status: 404 });

/** Mencatat upah yang dibayar satu tanggal bayar ke Buku Kas Umum: { paidOn, activityCode, accountCode, channel, voucherNo }. Perlu izin mencatat di keuangan desa. */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/pktd/[id]/bku", "Gagal mencatat ke Buku Kas Umum", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!permissions(ctx, "apbdes").create) return forbidden("Anda tidak berwenang mencatat ke Buku Kas Umum.");
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await postWagesToBku(prisma, { villageId: ctx.village.id, activityId: id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "apbdes_entries", r.data.entryId, { source: "pktd_work_days", activityId: id, voucherNo: r.data.voucherNo, amount: r.data.amount, activityCode: r.data.activityCode, accountCode: r.data.accountCode, channel: r.data.channel, paidOn: r.data.paidOn, days: r.data.days });
    return NextResponse.json({ success: true, entryId: r.data.entryId }, { status: 201 });
  });
}

/** Membatalkan pencatatan Buku Kas Umum (?entry=id catatan): menghapus catatan kas yang dibuat dari pembayaran itu. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/pktd/[id]/bku", "Gagal membatalkan pencatatan Buku Kas Umum", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!permissions(ctx, "apbdes").delete) return forbidden("Anda tidak berwenang membatalkan catatan Buku Kas Umum.");
    const id = parseIntId((await params).id);
    const entryId = parseIntId(req.nextUrl.searchParams.get("entry") ?? "");
    if (!id || !entryId) return notFound();
    const r = await unpostWagesFromBku(prisma, { villageId: ctx.village.id, activityId: id, entryId });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "apbdes_entries", entryId, { source: "pktd_work_days", activityId: id, voucherNo: r.data.voucherNo, amount: r.data.amount, activityCode: r.data.activityCode, accountCode: r.data.accountCode, channel: r.data.channel, paidOn: r.data.paidOn, days: r.data.days });
    return NextResponse.json({ success: true });
  });
}
