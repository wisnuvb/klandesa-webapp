import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { actOnOrder, getForAdmin } from "@/lib/ukm-order/service";
import { notifyOrderParty, statusNotice } from "@/lib/ukm-order/notify";

type Ctx = { params: Promise<{ id: string }> };
const notFound = () => NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });

export async function GET(req: NextRequest, { params }: Ctx) {
  return attempt("GET /api/ukm-products/pesanan/[id]", "Gagal memuat pesanan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await getForAdmin(prisma, { villageId: guard.ctx.village.id, villageName: guard.ctx.village.name, orderId: id });
    return r ? NextResponse.json(r) : notFound();
  });
}

/** Admin mengubah status pesanan mana pun di desanya: { action: "konfirmasi" | "selesai" | "batal", note? } (batal wajib beralasan). */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return attempt("PATCH /api/ukm-products/pesanan/[id]", "Gagal mengubah pesanan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await actOnOrder(prisma, { villageId: ctx.village.id, villageName: ctx.village.name, orderId: id, actor: { kind: "ADMIN" }, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "ukm_order_requests", id, { status: { from: r.data.from, to: r.data.to } });
    const o = await prisma.ukmOrderRequest.findUnique({ where: { id }, select: { buyerResidentId: true, sellerResidentId: true } });
    if (o) {
      const n = statusNotice(r.data.to, r.data.order.productName, r.data.order.sellerNote);
      void notifyOrderParty({ villageId: ctx.village.id, residentId: o.buyerResidentId, orderId: id, ...n });
      if (o.sellerResidentId !== null) void notifyOrderParty({ villageId: ctx.village.id, residentId: o.sellerResidentId, orderId: id, title: n.title, body: `Admin desa mengubah pesanan ${r.data.order.productName}: ${n.title.toLowerCase()}.` });
    }
    return NextResponse.json({ success: true, order: r.data.order });
  });
}
