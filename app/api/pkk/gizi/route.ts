import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { giziReport } from "@/lib/gizi/report";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

/** Status gizi balita (hitungan WHO) dari pengukuran posyandu terakhir tiap anak; ?sessionId= untuk satu sesi. Tanpa NIK. */
export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);
    const raw = Number(req.nextUrl.searchParams.get("sessionId"));
    const sessionId = Number.isInteger(raw) && raw > 0 ? raw : undefined;
    return NextResponse.json(await giziReport(prisma, village.id, { sessionId }), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("GET /api/pkk/gizi error:", e);
    return NextResponse.json({ error: "Gagal menghitung status gizi" }, { status: 500 });
  }
}
