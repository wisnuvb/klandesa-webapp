import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { runIntegrationExport } from "@/lib/integrations/sync-service";
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
    const format = (body?.format ?? "csv") as IntegrationExportFormat;

    if (!adapterId) {
      return NextResponse.json({ error: "adapterId wajib diisi" }, { status: 400 });
    }

    const result = await runIntegrationExport(village.id, adapterId, format);

    if (format === "json") {
      return NextResponse.json({
        ok: true,
        filename: result.filename,
        recordCount: result.recordCount,
        data: result.body,
      });
    }

    return new NextResponse(String(result.body), {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export gagal";
    console.error("POST /api/integrations/export", e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
