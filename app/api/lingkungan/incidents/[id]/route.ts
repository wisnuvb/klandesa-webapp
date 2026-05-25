import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { parseEnvironmentalIncidentInput } from "@/lib/lingkungan/schemas";
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

    const existing = await prisma.environmentalIncident.findFirst({
      where: { id: rowId, villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Insiden tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const input = parseEnvironmentalIncidentInput(body);
    if (!input) {
      return NextResponse.json({ error: "Data insiden tidak valid" }, { status: 400 });
    }

    const updated = await prisma.environmentalIncident.update({
      where: { id: rowId },
      data: {
        title: input.title,
        description: input.description,
        incidentType: input.incidentType,
        severity: input.severity ?? existing.severity,
        lat: input.lat,
        lng: input.lng,
        rt: input.rt,
        rw: input.rw,
        status: input.status ?? existing.status,
        checklist: input.checklist ?? (existing.checklist as object[]),
      },
    });

    return NextResponse.json({ ok: true, row: updated });
  } catch (e) {
    console.error("PATCH /api/lingkungan/incidents/[id]", e);
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

    const existing = await prisma.environmentalIncident.findFirst({
      where: { id: rowId, villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Insiden tidak ditemukan" }, { status: 404 });
    }

    await prisma.environmentalIncident.delete({ where: { id: rowId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/lingkungan/incidents/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
