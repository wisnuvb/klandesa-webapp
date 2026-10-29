import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { auditFee, ownCharge, requireFeeActor } from "@/lib/mobile/fees";

/** Bebaskan tagihan (keringanan) dengan alasan, atau batalkan pembebasan dengan {"undo": true}. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireFeeActor(req, "write");
  if (!g.ok) return g.response;
  const id = Number((await params).id);
  const own = Number.isInteger(id) ? await ownCharge(g.actor, id) : null;
  if (!own) return mobileError("INVALID_REQUEST", "Tagihan tidak ditemukan.", 404);
  const b = (await req.json().catch(() => null)) as { reason?: unknown; undo?: unknown } | null;
  if (b?.undo === true) {
    await prisma.feeCharge.update({ where: { id: own.charge.id }, data: { waivedAt: null, waivedReason: null } });
    void auditFee(req, g.actor, "undo_waive_fee_charge", "fee_charges", own.charge.id);
    return new NextResponse(null, { status: 204 });
  }
  const reason = typeof b?.reason === "string" ? b.reason.trim().slice(0, 300) : "";
  if (reason.length < 3) return mobileError("INVALID_REQUEST", "Tulis alasan keringanan (minimal 3 huruf).", 400, { field: "reason" });
  await prisma.feeCharge.update({ where: { id: own.charge.id }, data: { waivedAt: new Date(), waivedReason: reason } });
  void auditFee(req, g.actor, "waive_fee_charge", "fee_charges", own.charge.id, { reason, amount: own.charge.amount });
  return new NextResponse(null, { status: 204 });
}
