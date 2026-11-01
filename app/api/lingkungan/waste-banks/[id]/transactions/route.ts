import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { deposit, withdraw } from "@/lib/lingkungan/waste-bank";
import { failResponse, parseIntId } from "@/lib/tata-kelola/http";

/** Catat transaksi: { kind: "DEPOSIT", accountId, itemId, weightKg, txDate } atau { kind: "WITHDRAW", accountId, amount, txDate }. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const bankId = parseIntId((await params).id);
    if (!bankId) return NextResponse.json({ error: "Bank sampah tidak ditemukan" }, { status: 404 });
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (body?.kind !== "DEPOSIT" && body?.kind !== "WITHDRAW") return NextResponse.json({ error: "Jenis transaksi tidak dikenal", fieldErrors: { kind: "Pilih setor atau tarik." } }, { status: 400 });
    const args = { villageId: ctx.village.id, bankId, userId: ctx.userId ?? null, input: body };
    const r = body.kind === "DEPOSIT" ? await deposit(prisma, args) : await withdraw(prisma, args);
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "waste_bank_txs", r.data.id, { bankId, kind: body.kind, accountId: body.accountId });
    return NextResponse.json({ success: true, ...r.data }, { status: 201 });
  } catch (e) {
    console.error("POST waste-banks/[id]/transactions error:", e);
    return NextResponse.json({ error: "Gagal mencatat transaksi" }, { status: 500 });
  }
}
