import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { runIntegrationSync } from "@/lib/integrations/sync-service";
import type { IntegrationExportFormat } from "@/lib/integrations/types";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = (await req.json().catch(() => null)) as {
      adapterId?: string;
      format?: string;
    } | null;

    const adapterId = String(body?.adapterId ?? "").trim();
    const format = (body?.format ?? "json") as IntegrationExportFormat;

    if (!adapterId) {
      return NextResponse.json({ error: "adapterId wajib diisi" }, { status: 400 });
    }

    const { exportResult, sync } = await runIntegrationSync(
      village.id,
      adapterId,
      format,
    );

    return NextResponse.json({
      ok: true,
      sync,
      preview: exportResult.body,
      filename: exportResult.filename,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sinkronisasi gagal";
    console.error("POST /api/integrations/sync", e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
