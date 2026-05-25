import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { INTEGRATION_ADAPTERS } from "@/lib/integrations/registry";
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

    return NextResponse.json({ adapters: INTEGRATION_ADAPTERS });
  } catch (e) {
    console.error("GET /api/integrations/adapters", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
