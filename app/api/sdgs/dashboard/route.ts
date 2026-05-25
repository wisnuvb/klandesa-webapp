import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { collectVillageMetrics } from "@/lib/sdgs/collect-metrics";
import { computeSdgsDashboard } from "@/lib/sdgs/scoring-engine";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { metrics, idmVillageCode } = await collectVillageMetrics(village.id);
    const dashboard = computeSdgsDashboard(metrics, idmVillageCode);

    return NextResponse.json({ success: true, data: dashboard });
  } catch (err) {
    console.error("GET /api/sdgs/dashboard error:", err);
    return NextResponse.json(
      { error: "Gagal memuat dashboard SDGs" },
      { status: 500 },
    );
  }
}
