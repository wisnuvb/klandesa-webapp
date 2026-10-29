import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { notifyAccount } from "@/lib/mobile/notify";
import { auditFee, ownCharge, requireFeeActor } from "@/lib/mobile/fees";

/** Konfirmasi atau tolak laporan bayar warga. Menolak wajib beralasan. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireFeeActor(req, "write");
  if (!g.ok) return g.response;
  const a = g.actor;
  const id = Number((await params).id);
  const b = (await req.json().catch(() => null)) as { decision?: unknown; note?: unknown } | null;
  const note = typeof b?.note === "string" ? b.note.trim().slice(0, 300) : "";
  if (!Number.isInteger(id) || (b?.decision !== "confirm" && b?.decision !== "reject")) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  const confirm = b.decision === "confirm";
  if (!confirm && note.length < 3) return mobileError("INVALID_REQUEST", "Tulis alasan penolakan (minimal 3 huruf).", 400, { field: "note" });

  const pay = await prisma.feePayment.findFirst({ where: { id, villageId: a.villageId } });
  const own = pay ? await ownCharge(a, pay.chargeId) : null;
  if (!pay || !own) return mobileError("INVALID_REQUEST", "Laporan pembayaran tidak ditemukan.", 404);

  if (confirm) {
    // Dua laporan untuk tagihan yang sama tidak boleh sama-sama mengonfirmasi melebihi nominal tagihan.
    const got = await prisma.feePayment.aggregate({ where: { chargeId: pay.chargeId, status: "confirmed" }, _sum: { amount: true } });
    if ((got._sum.amount ?? 0) + pay.amount > own.charge.amount) return mobileError("INVALID_REQUEST", "Jumlah ini melebihi sisa tagihan. Tolak laporan ini atau catat sesuai sisa.", 409);
  }

  // Bersyarat: dua pengurus menekan bersamaan, hanya satu yang berhasil.
  const res = await prisma.feePayment.updateMany({ where: { id: pay.id, status: "pending" }, data: { status: confirm ? "confirmed" : "rejected", decidedAt: new Date(), decisionNote: note || null } });
  if (res.count !== 1) return mobileError("INVALID_REQUEST", "Laporan ini sudah diputuskan.", 409);

  void auditFee(req, a, confirm ? "confirm_fee_payment" : "reject_fee_payment", "fee_payments", pay.id, { chargeId: pay.chargeId, amount: pay.amount, note: note || undefined });
  if (own.charge.headResidentId) {
    const acc = await prisma.citizenAccount.findUnique({ where: { residentId: own.charge.headResidentId }, select: { id: true, status: true } });
    if (acc?.status === "ACTIVE") {
      void notifyAccount("citizen", acc.id, a.villageId, {
        type: "system", deepLink: "/tagihan",
        title: confirm ? "Pembayaran dikonfirmasi" : "Pembayaran belum diterima",
        body: confirm ? `${own.schedule.name}: Rp${pay.amount.toLocaleString("id-ID")} sudah dikonfirmasi.` : `${own.schedule.name}: ${note}`,
      });
    }
  }
  return new NextResponse(null, { status: 204 });
}
