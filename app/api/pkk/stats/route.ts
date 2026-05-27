import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { computePkkStats } from "@/lib/pkk/stats";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const stats = await computePkkStats(village.id);

    return NextResponse.json({ stats });
  } catch (e) {
    console.error("GET /api/pkk/stats", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
