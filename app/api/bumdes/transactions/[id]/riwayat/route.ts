import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { bumdesScope } from "@/lib/bumdes/api-context";
import { transactionHistory } from "@/lib/bumdes/service";

/** Riwayat perubahan dan pembatalan satu transaksi kas. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("GET /api/bumdes/transactions/[id]/riwayat", "Gagal memuat riwayat", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const s = await bumdesScope(guard.ctx);
    if (!s.ok) return s.response;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Transaksi tidak valid." }, { status: 400 });
    const r = await transactionHistory(prisma, s.bumdes.id, id);
    if (!r.ok) return failResponse(r);
    return NextResponse.json(r.data);
  });
}
