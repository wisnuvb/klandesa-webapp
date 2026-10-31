import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { createRecord, listRecords } from "@/lib/custom-data/service";
import { failResponse, parseBigId, parseIntId } from "@/lib/custom-data/http";

type Ctx = { params: Promise<{ id: string }> };

/** Baris tabel, terbaru dulu. Kursor: `cursor` (id) dari `nextCursor`; `limit` 1–100. */
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const tableId = parseIntId((await params).id);
    if (tableId == null) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    const sp = req.nextUrl.searchParams;
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "25", 10) || 25));
    const cursor = sp.get("cursor") ? parseBigId(sp.get("cursor")!) : null;
    if (sp.get("cursor") && cursor == null) return NextResponse.json({ error: "cursor tidak valid" }, { status: 400 });

    const exists = await prisma.customTable.findFirst({ where: { id: tableId, villageId: ctx.village.id, isArchived: false }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Tabel tidak ditemukan" }, { status: 404 });
    return NextResponse.json(await listRecords(prisma, { villageId: ctx.village.id, tableId, cursor, limit }));
  } catch (e) {
    console.error("GET /api/custom-data/tables/[id]/records error:", e);
    return NextResponse.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}

/** Tambah baris: { data: { [kunciKolom]: nilai }, residentId? }. Divalidasi terhadap susunan tabel. */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const tableId = parseIntId((await params).id);
    if (tableId == null) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

    const body = await req.json().catch(() => null);
    const r = await createRecord(prisma, { villageId: ctx.village.id, tableId, userId: ctx.userId ?? null, data: body?.data, residentId: body?.residentId });
    if (!r.ok) return failResponse(r);

    // Audit mencatat id baris dan tabelnya saja; isi baris bisa memuat data pribadi.
    await auditWeb(req, ctx, "create", "custom_records", r.data.id, { tableId });
    return NextResponse.json({ success: true, record: r.data }, { status: 201 });
  } catch (e) {
    console.error("POST /api/custom-data/tables/[id]/records error:", e);
    return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
  }
}
