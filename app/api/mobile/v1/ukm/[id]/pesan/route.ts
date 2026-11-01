import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { getCitizenResident } from "@/lib/mobile/citizen-data";
import { checkMobileRateLimit } from "@/lib/mobile/rate-limit";
import { auditAs } from "@/lib/mobile/audit-actor";
import { displayName } from "@/lib/mobile/social-logic";
import { createOrder } from "@/lib/ukm-order/service";
import { notifyOrderParty } from "@/lib/ukm-order/notify";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Warga memesan produk yang tayang: { quantity?, note? }. Pesanan tercatat (status "Diminta") dan penjual diberi tahu.
 * Jawaban memuat `whatsappUrl` hanya bila pemilik mengizinkan kontak (contactVisible) dan produk masih tayang; selain itu null.
 * Tidak ada pembayaran online.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const me = await getCitizenResident(ctx);
  const id = Number((await params).id);
  if (!me || !Number.isInteger(id) || id <= 0) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  const rl = checkMobileRateLimit(`ukm-order:${ctx.accountId}`, { max: 10, windowMs: 10 * 60_000 });
  if (!rl.ok) return mobileError("RATE_LIMITED", "Terlalu banyak permintaan. Coba lagi sebentar.", 429, { retryAfterSec: rl.retryAfterSec });

  const body = await req.json().catch(() => null);
  const r = await createOrder(prisma, { villageId: ctx.villageId, villageName: ctx.village.name, buyerResidentId: me.id, productId: id, input: body });
  if (!r.ok) {
    const code = r.status === 429 ? "RATE_LIMITED" : "INVALID_REQUEST";
    return mobileError(code, r.errors[0] ?? "Pesanan tidak dapat dibuat.", r.status, r.fieldErrors ? { fieldErrors: r.fieldErrors } : undefined);
  }
  void auditAs(req, ctx.villageId, { type: "citizen", residentId: me.id }, "create", "ukm_order_requests", r.data.id, { productId: r.data.productId, quantity: r.data.quantity });
  const seller = await prisma.ukmOrderRequest.findUnique({ where: { id: r.data.id }, select: { sellerResidentId: true } });
  void notifyOrderParty({
    villageId: ctx.villageId,
    residentId: seller?.sellerResidentId ?? null,
    orderId: r.data.id,
    title: "Pesanan baru",
    body: `${displayName(me.name)} memesan ${r.data.quantity}${r.data.unit ? ` ${r.data.unit}` : ""} ${r.data.productName}.`,
  });
  return NextResponse.json({ order: r.data }, { status: 201 });
}
