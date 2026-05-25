import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import {
  parseInfrastructureProjectInput,
  parseOptionalDate,
} from "@/lib/gis/schemas";
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
    const projectId = Number(id);
    if (!Number.isFinite(projectId)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const existing = await prisma.infrastructureProject.findFirst({
      where: { id: projectId, villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Proyek tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const input = parseInfrastructureProjectInput(body);
    if (!input) {
      return NextResponse.json({ error: "Data proyek tidak valid" }, { status: 400 });
    }

    const updated = await prisma.infrastructureProject.update({
      where: { id: projectId },
      data: {
        assetId: input.assetId ?? existing.assetId,
        title: input.title,
        description: input.description,
        projectType: input.projectType,
        budget: input.budget,
        lat: input.lat,
        lng: input.lng,
        rt: input.rt,
        rw: input.rw,
        sdgGoalIds: input.sdgGoalIds ?? (existing.sdgGoalIds as number[]),
        status: input.status ?? existing.status,
        startDate: parseOptionalDate(input.startDate) ?? existing.startDate,
        endDate: parseOptionalDate(input.endDate) ?? existing.endDate,
      },
    });

    return NextResponse.json({ ok: true, row: updated });
  } catch (e) {
    console.error("PATCH /api/gis/projects/[id]", e);
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
    const projectId = Number(id);
    if (!Number.isFinite(projectId)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const existing = await prisma.infrastructureProject.findFirst({
      where: { id: projectId, villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Proyek tidak ditemukan" }, { status: 404 });
    }

    await prisma.infrastructureProject.delete({ where: { id: projectId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/gis/projects/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
