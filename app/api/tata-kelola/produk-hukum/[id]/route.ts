import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { deleteLegal, updateLegal } from "@/lib/tata-kelola/legal";
import { failResponse, parseIntId } from "@/lib/tata-kelola/http";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Produk hukum tidak ditemukan" }, { status: 404 });
    const r = await updateLegal(prisma, { villageId: ctx.village.id, id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "legal_documents", id, { type: r.data.type, number: r.data.number, year: r.data.year });
    return NextResponse.json({ success: true, item: r.data });
  } catch (e) {
    console.error("PATCH /api/tata-kelola/produk-hukum/[id] error:", e);
    return NextResponse.json({ error: "Gagal menyimpan perubahan" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Produk hukum tidak ditemukan" }, { status: 404 });
    const r = await deleteLegal(prisma, ctx.village.id, id);
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "legal_documents", id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/tata-kelola/produk-hukum/[id] error:", e);
    return NextResponse.json({ error: "Gagal menghapus produk hukum" }, { status: 500 });
  }
}
