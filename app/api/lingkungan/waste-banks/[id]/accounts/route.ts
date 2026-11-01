import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { createAccount } from "@/lib/lingkungan/waste-bank";
import { failResponse, parseIntId } from "@/lib/tata-kelola/http";

/** Daftarkan nasabah: { name?, residentId? } (salah satu wajib). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const bankId = parseIntId((await params).id);
    if (!bankId) return NextResponse.json({ error: "Bank sampah tidak ditemukan" }, { status: 404 });
    const r = await createAccount(prisma, { villageId: ctx.village.id, bankId, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "waste_bank_accounts", r.data.id, { bankId });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  } catch (e) {
    console.error("POST waste-banks/[id]/accounts error:", e);
    return NextResponse.json({ error: "Gagal mendaftarkan nasabah" }, { status: 500 });
  }
}
