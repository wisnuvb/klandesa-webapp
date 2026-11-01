import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { parseIsoDate } from "@/lib/form-input";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId, permissions } from "@/lib/apbdes/http";
import { addWorkDays, deleteWorkDays, markPaid } from "@/lib/pktd/service";

type Ctx = { params: Promise<{ id: string }> };
const notFound = () => NextResponse.json({ error: "Kegiatan PKTD tidak ditemukan." }, { status: 404 });

/** Mencatat hari kerja banyak pekerja sekaligus: { workDate, task, wage, workerIds[], paid?, note? }. */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/pktd/[id]/hari", "Gagal mencatat hari kerja", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await addWorkDays(prisma, { villageId: ctx.village.id, activityId: id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "pktd_work_days", id, { created: r.data.created, total: r.data.total, sppId: r.data.sppId });
    return NextResponse.json({ success: true, ...r.data }, { status: 201 });
  });
}

/** Menandai upah satu tanggal kerja sebagai sudah dibayar: { workDate, paidOn }. */
export async function PUT(req: NextRequest, { params }: Ctx) {
  return attempt("PUT /api/pktd/[id]/hari", "Gagal menandai upah dibayar", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await markPaid(prisma, { villageId: ctx.village.id, activityId: id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "pktd_work_days", id, { paid: r.data.updated, sppId: r.data.sppId });
    return NextResponse.json({ success: true, updated: r.data.updated });
  });
}

/** Menghapus catatan satu tanggal kerja (koreksi salah input): ?date=YYYY-MM-DD. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/pktd/[id]/hari", "Gagal menghapus catatan hari kerja", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const date = parseIsoDate(req.nextUrl.searchParams.get("date"));
    if (!date) return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
    const r = await deleteWorkDays(prisma, { villageId: ctx.village.id, activityId: id, date, allowPaid: permissions(ctx).approve });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "pktd_work_days", id, { date: date.toISOString().slice(0, 10), deleted: r.data.deleted, paid: r.data.paid, amount: r.data.amount });
    return NextResponse.json({ success: true, deleted: r.data.deleted });
  });
}
