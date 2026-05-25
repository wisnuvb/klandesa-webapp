import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { parseWasteBankInput } from "@/lib/lingkungan/schemas";
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

    const existing = await prisma.wasteBank.findFirst({
      where: { id: rowId, villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Bank sampah tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const input = parseWasteBankInput(body);
    if (!input) {
      return NextResponse.json({ error: "Data bank sampah tidak valid" }, { status: 400 });
    }

    const updated = await prisma.wasteBank.update({
      where: { id: rowId },
      data: {
        name: input.name,
        managerName: input.managerName,
        rt: input.rt,
        rw: input.rw,
        address: input.address,
        lat: input.lat,
        lng: input.lng,
        wasteTypes: input.wasteTypes ?? (existing.wasteTypes as string[]),
        monthlyKg: input.monthlyKg ?? existing.monthlyKg,
        status: input.status ?? existing.status,
      },
    });

    return NextResponse.json({ ok: true, row: updated });
  } catch (e) {
    console.error("PATCH /api/lingkungan/waste-banks/[id]", e);
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

    const existing = await prisma.wasteBank.findFirst({
      where: { id: rowId, villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Bank sampah tidak ditemukan" }, { status: 404 });
    }

    await prisma.wasteBank.delete({ where: { id: rowId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/lingkungan/waste-banks/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
