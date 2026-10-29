import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { notifyAccount } from "@/lib/mobile/notify";
import { auditFee, ownCharge, requireFeeActor, withStatus } from "@/lib/mobile/fees";
import { isOwnReportPhotoUrl } from "@/lib/mobile/report-logic";
import { validatePayment } from "@/lib/mobile/fees-logic";
import { getSpacesConfig } from "@/lib/spaces";

/** Bendahara mencatat pembayaran yang diterima (langsung berstatus terkonfirmasi). Bukti foto opsional. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireFeeActor(req, "write");
  if (!g.ok) return g.response;
  const a = g.actor;
  const id = Number((await params).id);
  const own = Number.isInteger(id) ? await ownCharge(a, id) : null;
  if (!own) return mobileError("INVALID_REQUEST", "Tagihan tidak ditemukan.", 404);
  if (own.charge.waivedAt) return mobileError("INVALID_REQUEST", "Tagihan ini dibebaskan.", 409);

  const [st] = await withStatus([own.charge], new Map([[own.schedule.id, own.schedule.dueDay]]));
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const v = validatePayment(body, st!.outstanding);
  if (!v.ok) return mobileError("INVALID_REQUEST", v.message, 400);
  const proof = body?.proofUrl;
  if (proof != null && proof !== "" && !isOwnReportPhotoUrl(proof, getSpacesConfig().cdnBaseUrl, a.villageCode, "mobile-fees")) {
    return mobileError("INVALID_REQUEST", "Foto bukti tidak valid. Unggah ulang dari aplikasi.", 400);
  }
  const now = new Date();
  const p = await prisma.feePayment.create({
    data: {
      villageId: a.villageId, chargeId: own.charge.id, amount: v.amount, method: v.method, note: v.note,
      proofUrl: typeof proof === "string" && proof ? proof : null, status: "confirmed", source: "officer",
      paidAt: now, recordedByType: a.byType, recordedById: a.byId, decidedAt: now,
    },
    select: { id: true },
  });
  void auditFee(req, a, "record_fee_payment", "fee_payments", p.id, { chargeId: own.charge.id, amount: v.amount, method: v.method, hasProof: Boolean(proof) });
  if (own.charge.headResidentId) {
    const acc = await prisma.citizenAccount.findUnique({ where: { residentId: own.charge.headResidentId }, select: { id: true, status: true } });
    if (acc?.status === "ACTIVE") {
      void notifyAccount("citizen", acc.id, a.villageId, { type: "system", deepLink: "/tagihan", title: "Pembayaran tercatat", body: `${own.schedule.name}: Rp${v.amount.toLocaleString("id-ID")} sudah dicatat.` });
    }
  }
  return NextResponse.json({ id: p.id }, { status: 201 });
}
