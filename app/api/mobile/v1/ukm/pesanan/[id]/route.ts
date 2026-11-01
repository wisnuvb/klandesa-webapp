import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { getCitizenResident } from "@/lib/mobile/citizen-data";
import { checkMobileRateLimit } from "@/lib/mobile/rate-limit";
import { auditAs } from "@/lib/mobile/audit-actor";
import { actOnOrder, getForParty } from "@/lib/ukm-order/service";
import { notifyOrderParty, statusNotice } from "@/lib/ukm-order/notify";

type Ctx = { params: Promise<{ id: string }> };

/** Satu pesanan milik saya (sebagai pembeli atau penjual) beserta riwayat status. Pesanan orang lain = tidak ditemukan. */
export async function GET(req: NextRequest, { params }: Ctx) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const me = await getCitizenResident(ctx);
  const id = Number((await params).id);
  if (!me || !Number.isInteger(id) || id <= 0) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  const r = await getForParty(prisma, { villageId: ctx.villageId, villageName: ctx.village.name, orderId: id, residentId: me.id });
  if (!r) return mobileError("INVALID_REQUEST", "Pesanan tidak ditemukan.", 404);
  return NextResponse.json(r);
}

/** Ubah status: { action: "konfirmasi" | "selesai" | "batal", note? }. Pembeli hanya "batal" saat masih Diminta; penjual semuanya (batal wajib beralasan). */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const me = await getCitizenResident(ctx);
  const id = Number((await params).id);
  if (!me || !Number.isInteger(id) || id <= 0) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  const rl = checkMobileRateLimit(`ukm-order-act:${ctx.accountId}`, { max: 30, windowMs: 10 * 60_000 });
  if (!rl.ok) return mobileError("RATE_LIMITED", "Terlalu banyak permintaan. Coba lagi sebentar.", 429, { retryAfterSec: rl.retryAfterSec });

  // Peran ditentukan dari data, bukan dari badan permintaan.
  const own = await prisma.ukmOrderRequest.findFirst({ where: { id, villageId: ctx.villageId, OR: [{ buyerResidentId: me.id }, { sellerResidentId: me.id }] }, select: { buyerResidentId: true } });
  if (!own) return mobileError("INVALID_REQUEST", "Pesanan tidak ditemukan.", 404);
  const kind = own.buyerResidentId === me.id ? "PEMBELI" : "PENJUAL";
  const body = await req.json().catch(() => null);
  const r = await actOnOrder(prisma, { villageId: ctx.villageId, villageName: ctx.village.name, orderId: id, actor: { kind, residentId: me.id }, input: body });
  if (!r.ok) return mobileError("INVALID_REQUEST", r.errors[0] ?? "Pesanan tidak dapat diubah.", r.status, r.fieldErrors ? { fieldErrors: r.fieldErrors } : undefined);
  void auditAs(req, ctx.villageId, { type: "citizen", residentId: me.id }, "update", "ukm_order_requests", id, { status: { from: r.data.from, to: r.data.to }, as: kind });
  const n = statusNotice(r.data.to, r.data.order.productName, kind === "PENJUAL" ? r.data.order.sellerNote : null);
  void notifyOrderParty({ villageId: ctx.villageId, residentId: r.data.notifyResidentId, orderId: id, title: kind === "PEMBELI" ? "Pesanan dibatalkan pembeli" : n.title, body: kind === "PEMBELI" ? `Pesanan ${r.data.order.productName} dibatalkan oleh pembeli.` : n.body });
  return NextResponse.json({ order: r.data.order });
}
