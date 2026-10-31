import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { DELIVERY_RETENTION_DAYS, listDeliveries } from "@/lib/webhooks/service";

/** Riwayat pengiriman terbaru satu tujuan. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (ctx.dbUser.role !== "admin") return NextResponse.json({ error: "Hanya admin desa yang dapat mengelola webhook." }, { status: 403 });
    const raw = (await params).id;
    if (!/^\d{1,10}$/.test(raw)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    const limit = Number(new URL(req.url).searchParams.get("limit") ?? 30);
    const items = await listDeliveries(prisma, { villageId: ctx.village.id, endpointId: Number(raw), limit: Number.isFinite(limit) ? limit : 30 });
    if (!items) return NextResponse.json({ error: "Tujuan tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ retentionDays: DELIVERY_RETENTION_DAYS, items });
  } catch (e) {
    console.error("GET /api/developer/webhooks/[id]/deliveries error:", e);
    return NextResponse.json({ error: "Gagal memuat riwayat" }, { status: 500 });
  }
}
