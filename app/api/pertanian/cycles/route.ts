import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { parseCropCycleInput } from "@/lib/pertanian/schemas";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

function serializeCycle(c: {
  id: number;
  plotId: number;
  season: string;
  cropName: string;
  plantedAt: Date | null;
  harvestExpectedAt: Date | null;
  status: string;
  plot?: { name: string };
  _count?: { harvests: number };
}) {
  return {
    id: c.id,
    plotId: c.plotId,
    plotName: c.plot?.name,
    season: c.season,
    cropName: c.cropName,
    plantedAt: c.plantedAt?.toISOString().slice(0, 10) ?? null,
    harvestExpectedAt: c.harvestExpectedAt?.toISOString().slice(0, 10) ?? null,
    status: c.status,
    harvestCount: c._count?.harvests ?? 0,
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

    const plotIdParam = req.nextUrl.searchParams.get("plotId");
    const where: { plot: { villageId: number }; plotId?: number } = {
      plot: { villageId: village.id },
    };
    if (plotIdParam) {
      const plotId = Number(plotIdParam);
      if (!Number.isFinite(plotId) || plotId <= 0) {
        return NextResponse.json({ error: "plotId tidak valid" }, { status: 400 });
      }
      where.plotId = Math.trunc(plotId);
    }

    const rows = await prisma.cropCycle.findMany({
      where,
      orderBy: [{ plantedAt: "desc" }, { id: "desc" }],
      include: {
        plot: { select: { name: true } },
        _count: { select: { harvests: true } },
      },
    });

    return NextResponse.json({ rows: rows.map(serializeCycle) });
  } catch (e) {
    console.error("GET /api/pertanian/cycles", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = await req.json().catch(() => null);
    const input = parseCropCycleInput(body);
    if (!input) {
      return NextResponse.json({ error: "Data siklus tanam tidak valid" }, { status: 400 });
    }

    const plot = await prisma.farmPlot.findFirst({
      where: { id: input.plotId, villageId: village.id },
    });
    if (!plot) {
      return NextResponse.json({ error: "Lahan tidak ditemukan" }, { status: 404 });
    }

    const created = await prisma.cropCycle.create({
      data: {
        plotId: input.plotId,
        season: input.season,
        cropName: input.cropName,
        plantedAt: input.plantedAt ? new Date(input.plantedAt) : null,
        harvestExpectedAt: input.harvestExpectedAt
          ? new Date(input.harvestExpectedAt)
          : null,
        status: "planted",
      },
      include: {
        plot: { select: { name: true } },
        _count: { select: { harvests: true } },
      },
    });

    return NextResponse.json({ ok: true, row: serializeCycle(created) });
  } catch (e) {
    console.error("POST /api/pertanian/cycles", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
