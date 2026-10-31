import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { revokeLegal } from "@/lib/tata-kelola/legal";
import { can, denied, failResponse, parseIntId } from "@/lib/tata-kelola/http";

type Ctx = { params: Promise<{ id: string }> };

/** Tandai produk hukum dicabut: { revokedAt, revokedByRef? }. Dipetakan sebagai "create" oleh peta izin, jadi izin "update" dicek di sini. */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!can("produk_hukum", ctx.dbUser.role, ["update"]).update) return denied("Peran Anda tidak berwenang mencabut produk hukum.");
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Produk hukum tidak ditemukan" }, { status: 404 });
    const r = await revokeLegal(prisma, { villageId: ctx.village.id, id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "revoke", "legal_documents", id, { revokedAt: r.data.revokedAt, revokedByRef: r.data.revokedByRef });
    return NextResponse.json({ success: true, item: r.data });
  } catch (e) {
    console.error("POST /api/tata-kelola/produk-hukum/[id]/pencabutan error:", e);
    return NextResponse.json({ error: "Gagal mencabut produk hukum" }, { status: 500 });
  }
}
