import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { addPayment } from "@/lib/blt/service";

/** Mencatat pembayaran: { beneficiaryId, monthFrom, monthTo?, method, paidOn, receivedBy?, note? }. Jumlah dihitung server: nilai per bulan × jumlah bulan. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/blt/[id]/pembayaran", "Gagal mencatat pembayaran BLT", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Program BLT tidak ditemukan." }, { status: 404 });
    const body = await req.json().catch(() => null);
    const r = await addPayment(prisma, { villageId: ctx.village.id, programId: id, userId: ctx.userId ?? null, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "blt_payments", r.data.id, { programId: id, amount: r.data.amount });
    return NextResponse.json({ success: true, id: r.data.id, amount: r.data.amount }, { status: 201 });
  });
}
