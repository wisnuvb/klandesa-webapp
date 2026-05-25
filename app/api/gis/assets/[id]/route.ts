import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { parseVillageAssetInput } from "@/lib/gis/schemas";
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
    const assetId = Number(id);
    if (!Number.isFinite(assetId)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const existing = await prisma.villageAsset.findFirst({
      where: { id: assetId, villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Aset tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const input = parseVillageAssetInput(body);
    if (!input) {
      return NextResponse.json({ error: "Data aset tidak valid" }, { status: 400 });
    }

    const updated = await prisma.villageAsset.update({
      where: { id: assetId },
      data: {
        name: input.name,
        assetType: input.assetType,
        description: input.description,
        lat: input.lat,
        lng: input.lng,
        rt: input.rt,
        rw: input.rw,
        condition: input.condition ?? existing.condition,
        sdgGoalIds: input.sdgGoalIds ?? (existing.sdgGoalIds as number[]),
        status: input.status ?? existing.status,
      },
    });

    return NextResponse.json({ ok: true, row: updated });
  } catch (e) {
    console.error("PATCH /api/gis/assets/[id]", e);
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
    const assetId = Number(id);
    if (!Number.isFinite(assetId)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const existing = await prisma.villageAsset.findFirst({
      where: { id: assetId, villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Aset tidak ditemukan" }, { status: 404 });
    }

    await prisma.villageAsset.delete({ where: { id: assetId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/gis/assets/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
