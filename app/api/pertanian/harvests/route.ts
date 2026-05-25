import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { parseHarvestInput } from "@/lib/pertanian/schemas";
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

    const body = await req.json().catch(() => null);
    const input = parseHarvestInput(body);
    if (!input) {
      return NextResponse.json({ error: "Data panen tidak valid" }, { status: 400 });
    }

    const cycle = await prisma.cropCycle.findFirst({
      where: { id: input.cycleId, plot: { villageId: village.id } },
    });
    if (!cycle) {
      return NextResponse.json({ error: "Siklus tanam tidak ditemukan" }, { status: 404 });
    }

    const created = await prisma.harvestRecord.create({
      data: {
        cycleId: input.cycleId,
        harvestDate: new Date(input.harvestDate),
        quantityKg: input.quantityKg,
        qualityGrade: input.qualityGrade,
        marketPricePerKg: input.marketPricePerKg,
        notes: input.notes,
      },
    });

    await prisma.cropCycle.update({
      where: { id: input.cycleId },
      data: { status: "harvested" },
    });

    return NextResponse.json({
      ok: true,
      row: {
        id: created.id,
        cycleId: created.cycleId,
        harvestDate: created.harvestDate.toISOString().slice(0, 10),
        quantityKg: created.quantityKg,
        qualityGrade: created.qualityGrade,
        marketPricePerKg:
          created.marketPricePerKg != null ? Number(created.marketPricePerKg) : null,
      },
    });
  } catch (e) {
    console.error("POST /api/pertanian/harvests", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
