import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { bumdesScope } from "@/lib/bumdes/api-context";
import { updateCashTransaction } from "@/lib/bumdes/service";

/** Mengubah transaksi kas dengan alasan (wajib). Isi lama disimpan di riwayat; jurnal lama dibatalkan dan diganti. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("PATCH /api/bumdes/transactions/[id]", "Gagal mengubah transaksi", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const s = await bumdesScope(guard.ctx, { write: true });
    if (!s.ok) return s.response;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Transaksi tidak valid." }, { status: 400 });
    const r = await updateCashTransaction(prisma, { bumdesId: s.bumdes.id, id, userId: s.ctx.userId, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, s.ctx, "update", "bumdes_transactions", id, { revision: r.data.revision });
    return NextResponse.json({ success: true, id, revision: r.data.revision });
  });
}
