import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { deleteRecord, updateRecord } from "@/lib/custom-data/service";
import { failResponse, parseBigId } from "@/lib/custom-data/http";
import { emitRecordEvent } from "@/lib/custom-data/events";

type Ctx = { params: Promise<{ id: string }> };

/** Ubah baris: { data: { kunciKolom: nilai }, residentId? }. Kolom yang tak disebut tetap; nilai kosong mengosongkan kolom opsional. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const recordId = parseBigId((await params).id);
    if (recordId == null) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    const body = await req.json().catch(() => null);

    const r = await updateRecord(prisma, { villageId: ctx.village.id, recordId, userId: ctx.userId ?? null, data: body?.data, residentId: body?.residentId });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "custom_records", String(recordId), { tableId: r.data.tableId, fields: Object.keys(body?.data ?? {}) });
    emitRecordEvent(ctx.village.id, "data-kustom.baris.diubah", r.data.tableId, recordId);
    return NextResponse.json({ success: true, record: r.data });
  } catch (e) {
    console.error("PATCH /api/custom-data/records/[id] error:", e);
    return NextResponse.json({ error: "Gagal menyimpan perubahan" }, { status: 500 });
  }
}

/** Hapus baris (hapus lunak: tidak tampil lagi di aplikasi maupun API). */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const recordId = parseBigId((await params).id);
    if (recordId == null) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    const tableId = await deleteRecord(prisma, { villageId: ctx.village.id, recordId, userId: ctx.userId ?? null });
    if (tableId == null) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    await auditWeb(req, ctx, "delete", "custom_records", String(recordId), { tableId });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/custom-data/records/[id] error:", e);
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}
