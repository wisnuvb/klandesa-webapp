import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { auditWeb } from "@/lib/audit/web-audit";
import { diffRecord, pickSummary } from "@/lib/audit/diff";
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
    if (!Number.isInteger(cycleId)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }
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
    const updated = await prisma.cropCycle.update({
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

    await auditWeb(req, loaded.ctx, "update", "crop_cycles", cycleId, diffRecord(existing, updated, { ignoreFields: new Set(["updatedAt"]) }));

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
    if (!Number.isInteger(cycleId)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }
    const existing = await prisma.cropCycle.findFirst({
      where: { id: cycleId, plot: { villageId: village.id } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Siklus tidak ditemukan" }, { status: 404 });
    }

    await prisma.cropCycle.delete({ where: { id: cycleId } });
    await auditWeb(_req, loaded.ctx, "delete", "crop_cycles", cycleId, pickSummary(existing, ["plotId", "season", "cropName", "status"]));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/pertanian/cycles/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
