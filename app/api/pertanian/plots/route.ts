import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { parseFarmPlotInput } from "@/lib/pertanian/schemas";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

function serializePlot(p: {
  id: number;
  name: string;
  location: string | null;
  areaHa: number | null;
  cropType: string | null;
  ownerName: string | null;
  rt: string | null;
  rw: string | null;
  status: string;
  potentialId: number | null;
  _count?: { cropCycles: number };
}) {
  return {
    id: p.id,
    name: p.name,
    location: p.location,
    areaHa: p.areaHa,
    cropType: p.cropType,
    ownerName: p.ownerName,
    rt: p.rt,
    rw: p.rw,
    status: p.status,
    potentialId: p.potentialId,
    cycleCount: p._count?.cropCycles ?? 0,
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

    const rows = await prisma.farmPlot.findMany({
      where: { villageId: village.id },
      orderBy: [{ name: "asc" }],
      include: { _count: { select: { cropCycles: true } } },
    });

    return NextResponse.json({ rows: rows.map(serializePlot) });
  } catch (e) {
    console.error("GET /api/pertanian/plots", e);
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
    const input = parseFarmPlotInput(body);
    if (!input) {
      return NextResponse.json({ error: "Data lahan tidak valid" }, { status: 400 });
    }

    if (input.potentialId) {
      const pot = await prisma.potential.findFirst({
        where: { id: input.potentialId, villageId: village.id },
      });
      if (!pot) {
        return NextResponse.json({ error: "Potensi tidak ditemukan" }, { status: 404 });
      }
    }

    const created = await prisma.farmPlot.create({
      data: {
        villageId: village.id,
        name: input.name,
        location: input.location,
        areaHa: input.areaHa,
        cropType: input.cropType,
        ownerName: input.ownerName,
        rt: input.rt,
        rw: input.rw,
        potentialId: input.potentialId,
      },
      include: { _count: { select: { cropCycles: true } } },
    });

    return NextResponse.json({ ok: true, row: serializePlot(created) });
  } catch (e) {
    console.error("POST /api/pertanian/plots", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
