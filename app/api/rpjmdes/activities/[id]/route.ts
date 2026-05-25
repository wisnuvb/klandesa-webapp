import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { computeSdgPriorityScore } from "@/lib/rpjmdes/priority-scoring";
import { collectVillageMetrics } from "@/lib/sdgs/collect-metrics";
import { computeSdgsDashboard } from "@/lib/sdgs/scoring-engine";
import { parseSdgGoalIds } from "@/lib/sdgs/parse-goals";
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
    const activityId = Number(id);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
    }

    const existing = await prisma.rkpdesActivity.findFirst({
      where: { id: activityId, plan: { villageId: village.id } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Kegiatan tidak ditemukan" }, { status: 404 });
    }

    const b = body as Record<string, unknown>;
    const sdgGoalIds =
      b.sdgGoalIds !== undefined ? parseSdgGoalIds(b.sdgGoalIds) : parseSdgGoalIds(existing.sdgGoalIds);

    let priorityScore = existing.priorityScore;
    if (b.sdgGoalIds !== undefined) {
      const { metrics, idmVillageCode } = await collectVillageMetrics(village.id);
      const dashboard = computeSdgsDashboard(metrics, idmVillageCode);
      priorityScore = computeSdgPriorityScore(sdgGoalIds, dashboard.goals);
    }

    const updated = await prisma.rkpdesActivity.update({
      where: { id: activityId },
      data: {
        ...(typeof b.title === "string" ? { title: b.title.trim() } : {}),
        ...(typeof b.description === "string" ? { description: b.description.trim() } : {}),
        ...(b.year != null ? { year: Math.trunc(Number(b.year)) } : {}),
        ...(typeof b.status === "string" ? { status: b.status } : {}),
        ...(b.sdgGoalIds !== undefined ? { sdgGoalIds, priorityScore } : {}),
      },
    });

    return NextResponse.json({ ok: true, id: updated.id });
  } catch (e) {
    console.error("PATCH /api/rpjmdes/activities/[id]", e);
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
    const activityId = Number(id);
    const existing = await prisma.rkpdesActivity.findFirst({
      where: { id: activityId, plan: { villageId: village.id } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Kegiatan tidak ditemukan" }, { status: 404 });
    }

    await prisma.rkpdesActivity.delete({ where: { id: activityId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/rpjmdes/activities/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
