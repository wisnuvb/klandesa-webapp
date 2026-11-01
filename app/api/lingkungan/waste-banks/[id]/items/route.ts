import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { saveItem } from "@/lib/lingkungan/waste-bank";
import { failResponse, parseIntId } from "@/lib/tata-kelola/http";

/** Tambah jenis sampah, atau ubah bila `itemId` diisi: { name, pricePerKg, active?, itemId? }. Harga baru hanya berlaku untuk setoran berikutnya. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const bankId = parseIntId((await params).id);
    if (!bankId) return NextResponse.json({ error: "Bank sampah tidak ditemukan" }, { status: 404 });
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const itemId = body && body.itemId !== undefined ? parseIntId(String(body.itemId)) : null;
    if (body && body.itemId !== undefined && !itemId) return NextResponse.json({ error: "Jenis sampah tidak ditemukan" }, { status: 404 });
    const r = await saveItem(prisma, { villageId: ctx.village.id, bankId, itemId: itemId ?? undefined, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, itemId ? "update" : "create", "waste_bank_items", r.data.id, { bankId, pricePerKg: body?.pricePerKg });
    return NextResponse.json({ success: true, id: r.data.id }, { status: itemId ? 200 : 201 });
  } catch (e) {
    console.error("POST waste-banks/[id]/items error:", e);
    return NextResponse.json({ error: "Gagal menyimpan jenis sampah" }, { status: 500 });
  }
}
