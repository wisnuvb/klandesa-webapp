import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { INTEGRATION_ADAPTERS } from "@/lib/integrations/registry";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { isAddonActive, integrationsLimit } from "@/lib/modules/resource-limits";
import { loadActiveModuleSubs } from "@/lib/modules/require-module";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const addons = await loadActiveModuleSubs(village.id);
    const hasAddon = isAddonActive("sinkronisasi-data", addons);
    const limit = integrationsLimit(village.subscriptionPlan, village.subscriptionStatus, hasAddon);
    const cap = limit?.adapters ?? null;
    const allAdapters = INTEGRATION_ADAPTERS;
    const adapters = cap !== null ? allAdapters.slice(0, cap) : allAdapters;

    return NextResponse.json({
      adapters,
      limit: cap,
      total: allAdapters.length,
      isOverLimit: cap !== null && allAdapters.length > cap,
      hiddenCount: cap !== null && allAdapters.length > cap ? allAdapters.length - cap : 0,
      scheduledSyncBlocked: limit?.scheduledSyncBlocked ?? false,
    });
  } catch (e) {
    console.error("GET /api/integrations/adapters", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
