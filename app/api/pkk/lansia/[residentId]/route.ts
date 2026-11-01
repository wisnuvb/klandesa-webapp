import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { isSubscriptionBlocked } from "@/lib/gizi/guard";
import { elderHistory } from "@/lib/kia/service";

/** Riwayat pemeriksaan satu lansia (60 terbaru). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ residentId: string }> }) {
  return attempt("GET /api/pkk/lansia/[residentId]", "Gagal memuat riwayat", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const blocked = isSubscriptionBlocked(guard.ctx.village);
    if (blocked) return blocked;
    const id = parseIntId((await params).residentId);
    if (!id) return NextResponse.json({ error: "Warga tidak ditemukan" }, { status: 404 });
    const r = await elderHistory(prisma, guard.ctx.village.id, id);
    return r.ok ? NextResponse.json(r.data, { headers: { "Cache-Control": "no-store" } }) : failResponse(r);
  });
}
