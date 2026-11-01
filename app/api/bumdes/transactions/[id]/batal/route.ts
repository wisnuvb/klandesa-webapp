import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { bumdesScope } from "@/lib/bumdes/api-context";
import { voidCashTransaction } from "@/lib/bumdes/service";

/** Membatalkan transaksi kas: { reason }. Baris tidak dihapus; riwayat dan jurnal pembatalan tersimpan. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/bumdes/transactions/[id]/batal", "Gagal membatalkan transaksi", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const s = await bumdesScope(guard.ctx, { write: true });
    if (!s.ok) return s.response;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Transaksi tidak valid." }, { status: 400 });
    const input = await req.json().catch(() => null);
    const r = await voidCashTransaction(prisma, { bumdesId: s.bumdes.id, id, userId: s.ctx.userId, input });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, s.ctx, "void", "bumdes_transactions", id, { revision: r.data.revision });
    return NextResponse.json({ success: true, id, revision: r.data.revision });
  });
}
