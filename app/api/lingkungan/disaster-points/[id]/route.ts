import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { parseDisasterPointInput } from "@/lib/lingkungan/schemas";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { id } = await ctx.params;
    const rowId = Number(id);
    if (!Number.isFinite(rowId)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const existing = await prisma.disasterPoint.findFirst({
      where: { id: rowId, villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Titik bencana tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const input = parseDisasterPointInput(body);
    if (!input) {
      return NextResponse.json({ error: "Data titik bencana tidak valid" }, { status: 400 });
    }

    const updated = await prisma.disasterPoint.update({
      where: { id: rowId },
      data: {
        name: input.name,
        disasterType: input.disasterType,
        riskLevel: input.riskLevel ?? existing.riskLevel,
        lat: input.lat,
        lng: input.lng,
        rt: input.rt,
        rw: input.rw,
        notes: input.notes,
        evacuationPlan: input.evacuationPlan,
        status: input.status ?? existing.status,
        lastCheckedAt: input.lastCheckedAt
          ? new Date(input.lastCheckedAt)
          : existing.lastCheckedAt,
      },
    });

    return NextResponse.json({ ok: true, row: updated });
  } catch (e) {
    console.error("PATCH /api/lingkungan/disaster-points/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { id } = await ctx.params;
    const rowId = Number(id);
    if (!Number.isFinite(rowId)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const existing = await prisma.disasterPoint.findFirst({
      where: { id: rowId, villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Titik bencana tidak ditemukan" }, { status: 404 });
    }

    await prisma.disasterPoint.delete({ where: { id: rowId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/lingkungan/disaster-points/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
