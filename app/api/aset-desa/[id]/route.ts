import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { getItem, updateItem } from "@/lib/aset-desa/service";
import { failResponse, parseIntId } from "@/lib/aset-desa/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Barang tidak ditemukan" }, { status: 404 });
    const item = await getItem(prisma, guard.ctx.village.id, id);
    return item ? NextResponse.json({ item }) : NextResponse.json({ error: "Barang tidak ditemukan" }, { status: 404 });
  } catch (e) {
    console.error("GET /api/aset-desa/[id] error:", e);
    return NextResponse.json({ error: "Gagal memuat barang" }, { status: 500 });
  }
}

/** Ubah data barang yang masih tercatat (isi lengkap seperti saat membuat). */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Barang tidak ditemukan" }, { status: 404 });
    const body = await req.json().catch(() => null);
    const r = await updateItem(prisma, { villageId: ctx.village.id, id, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "inventory_items", id, { name: r.data.name, category: r.data.category, quantity: r.data.quantity });
    return NextResponse.json({ success: true, item: r.data });
  } catch (e) {
    console.error("PATCH /api/aset-desa/[id] error:", e);
    return NextResponse.json({ error: "Gagal menyimpan perubahan" }, { status: 500 });
  }
}
