import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { voidPayment } from "@/lib/blt/service";

/** Membatalkan catatan pembayaran yang salah input (jejaknya tetap ada di log audit). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; pid: string }> }) {
  return attempt("DELETE /api/blt/[id]/pembayaran/[pid]", "Gagal membatalkan pembayaran BLT", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const id = parseIntId(p.id);
    const pid = parseIntId(p.pid);
    if (!id || !pid) return NextResponse.json({ error: "Pembayaran tidak ditemukan." }, { status: 404 });
    const r = await voidPayment(prisma, { villageId: ctx.village.id, programId: id, id: pid });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "blt_payments", pid, { programId: id, beneficiaryId: r.data.beneficiaryId, amount: r.data.amount });
    return NextResponse.json({ success: true });
  });
}
