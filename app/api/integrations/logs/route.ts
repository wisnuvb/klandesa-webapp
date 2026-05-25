import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

function serializeLog(row: {
  id: number;
  adapterId: string;
  direction: string;
  status: string;
  recordCount: number;
  payloadMeta: unknown;
  errorMessage: string | null;
  startedAt: Date;
  finishedAt: Date | null;
}) {
  return {
    id: row.id,
    adapterId: row.adapterId,
    direction: row.direction,
    status: row.status,
    recordCount: row.recordCount,
    payloadMeta: row.payloadMeta,
    errorMessage: row.errorMessage,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const limit = Math.min(
      100,
      Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 50)),
    );

    const rows = await prisma.integrationSyncLog.findMany({
      where: { villageId: village.id },
      orderBy: { startedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ rows: rows.map(serializeLog) });
  } catch (e) {
    console.error("GET /api/integrations/logs", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
