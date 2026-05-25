import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
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
    const cycleId = Number(id);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
    }

    const existing = await prisma.cropCycle.findFirst({
      where: { id: cycleId, plot: { villageId: village.id } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Siklus tidak ditemukan" }, { status: 404 });
    }

    const b = body as Record<string, unknown>;
    await prisma.cropCycle.update({
      where: { id: cycleId },
      data: {
        ...(typeof b.season === "string" ? { season: b.season.trim() } : {}),
        ...(typeof b.cropName === "string" ? { cropName: b.cropName.trim() } : {}),
        ...(typeof b.status === "string" ? { status: b.status } : {}),
        ...(typeof b.plantedAt === "string"
          ? { plantedAt: new Date(b.plantedAt) }
          : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/pertanian/cycles/[id]", e);
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
    const cycleId = Number(id);
    const existing = await prisma.cropCycle.findFirst({
      where: { id: cycleId, plot: { villageId: village.id } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Siklus tidak ditemukan" }, { status: 404 });
    }

    await prisma.cropCycle.delete({ where: { id: cycleId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/pertanian/cycles/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
