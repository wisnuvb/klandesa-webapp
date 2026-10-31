import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { auditWeb } from "@/lib/audit/web-audit";
import { diffRecord, pickSummary } from "@/lib/audit/diff";
import { parsePlanInput } from "@/lib/rpjmdes/schemas";
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
    const planId = Number(id);
    if (!Number.isFinite(planId) || planId <= 0) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const existing = await prisma.rpjmdesPlan.findFirst({
      where: { id: planId, villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Rencana tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const input = parsePlanInput(body);
    if (!input) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const updated = await prisma.rpjmdesPlan.update({
      where: { id: planId },
      data: {
        title: input.title,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        vision: input.vision,
        mission: input.mission,
        ...(input.status ? { status: input.status } : {}),
      },
    });

    await auditWeb(req, loaded.ctx, "update", "rpjmdes_plans", planId, diffRecord(existing, updated, { maskedFields: new Set(["vision", "mission"]), ignoreFields: new Set(["updatedAt"]) }));

    return NextResponse.json({ ok: true, id: updated.id });
  } catch (e) {
    console.error("PATCH /api/rpjmdes/plans/[id]", e);
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
    const planId = Number(id);
    const existing = await prisma.rpjmdesPlan.findFirst({
      where: { id: planId, villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Rencana tidak ditemukan" }, { status: 404 });
    }

    await prisma.rpjmdesPlan.delete({ where: { id: planId } });
    await auditWeb(_req, loaded.ctx, "delete", "rpjmdes_plans", planId, pickSummary(existing, ["title", "periodStart", "periodEnd", "status"]));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/rpjmdes/plans/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
