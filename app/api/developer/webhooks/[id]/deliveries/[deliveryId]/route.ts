import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { retryDelivery } from "@/lib/webhooks/service";

/** Kirim ulang satu pengiriman yang sudah menyerah. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; deliveryId: string }> }) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (ctx.dbUser.role !== "admin") return NextResponse.json({ error: "Hanya admin desa yang dapat mengelola webhook." }, { status: 403 });
    const p = await params;
    if (!/^\d{1,10}$/.test(p.id) || !/^\d{1,18}$/.test(p.deliveryId)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    const r = await retryDelivery(prisma, { villageId: ctx.village.id, endpointId: Number(p.id), deliveryId: BigInt(p.deliveryId) });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    await auditWeb(req, ctx, "retry", "webhook_deliveries", p.deliveryId, { endpointId: Number(p.id) });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/developer/webhooks/[id]/deliveries/[deliveryId] error:", e);
    return NextResponse.json({ error: "Gagal mengirim ulang" }, { status: 500 });
  }
}
