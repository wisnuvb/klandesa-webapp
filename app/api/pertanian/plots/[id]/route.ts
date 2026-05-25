import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { parseFarmPlotInput } from "@/lib/pertanian/schemas";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { id } = await params;
    const plotId = Number(id);
    const body = await req.json().catch(() => null);
    const input = parseFarmPlotInput(body);
    if (!input) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const existing = await prisma.farmPlot.findFirst({
      where: { id: plotId, villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Lahan tidak ditemukan" }, { status: 404 });
    }

    await prisma.farmPlot.update({
      where: { id: plotId },
      data: {
        name: input.name,
        location: input.location,
        areaHa: input.areaHa,
        cropType: input.cropType,
        ownerName: input.ownerName,
        rt: input.rt,
        rw: input.rw,
        potentialId: input.potentialId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/pertanian/plots/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const loaded = await requireVillageApiContext(_req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { id } = await params;
    const plotId = Number(id);
    const existing = await prisma.farmPlot.findFirst({
      where: { id: plotId, villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Lahan tidak ditemukan" }, { status: 404 });
    }

    await prisma.farmPlot.delete({ where: { id: plotId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/pertanian/plots/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
