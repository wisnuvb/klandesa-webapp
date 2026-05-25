import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { retryIntegrationSync } from "@/lib/integrations/sync-service";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { id } = await ctx.params;
    const logId = Number(id);
    if (!Number.isFinite(logId)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const { exportResult, sync } = await retryIntegrationSync(village.id, logId);

    return NextResponse.json({
      ok: true,
      sync,
      preview: exportResult.body,
      filename: exportResult.filename,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Retry gagal";
    console.error("POST /api/integrations/logs/[id]/retry", e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
