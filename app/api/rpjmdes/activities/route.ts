import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { parseActivityInput } from "@/lib/rpjmdes/schemas";
import { computeSdgPriorityScore } from "@/lib/rpjmdes/priority-scoring";
import { collectVillageMetrics } from "@/lib/sdgs/collect-metrics";
import { computeSdgsDashboard } from "@/lib/sdgs/scoring-engine";
import { parseSdgGoalIds } from "@/lib/sdgs/parse-goals";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

function serializeActivity(a: {
  id: number;
  planId: number;
  title: string;
  description: string | null;
  year: number;
  location: string | null;
  estimatedBudget: unknown;
  sdgGoalIds: unknown;
  priorityScore: number | null;
  status: string;
  source: string;
  createdAt: Date;
}) {
  return {
    id: a.id,
    planId: a.planId,
    title: a.title,
    description: a.description,
    year: a.year,
    location: a.location,
    estimatedBudget: a.estimatedBudget != null ? Number(a.estimatedBudget) : null,
    sdgGoalIds: parseSdgGoalIds(a.sdgGoalIds),
    priorityScore: a.priorityScore,
    status: a.status,
    source: a.source,
    createdAt: a.createdAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const planIdParam = req.nextUrl.searchParams.get("planId");
    const where: { plan: { villageId: number }; planId?: number } = {
      plan: { villageId: village.id },
    };
    if (planIdParam) {
      const planId = Number(planIdParam);
      if (!Number.isFinite(planId) || planId <= 0) {
        return NextResponse.json({ error: "planId tidak valid" }, { status: 400 });
      }
      where.planId = Math.trunc(planId);
    }

    const rows = await prisma.rkpdesActivity.findMany({
      where,
      orderBy: [{ priorityScore: "desc" }, { year: "asc" }, { id: "asc" }],
    });

    return NextResponse.json({ rows: rows.map(serializeActivity) });
  } catch (e) {
    console.error("GET /api/rpjmdes/activities", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = await req.json().catch(() => null);
    const input = parseActivityInput(body);
    if (!input) {
      return NextResponse.json({ error: "Data kegiatan tidak valid" }, { status: 400 });
    }

    const plan = await prisma.rpjmdesPlan.findFirst({
      where: { id: input.planId, villageId: village.id },
    });
    if (!plan) {
      return NextResponse.json({ error: "Rencana RPJMDes tidak ditemukan" }, { status: 404 });
    }

    const { metrics, idmVillageCode } = await collectVillageMetrics(village.id);
    const dashboard = computeSdgsDashboard(metrics, idmVillageCode);
    const priorityScore = computeSdgPriorityScore(input.sdgGoalIds, dashboard.goals);

    const created = await prisma.rkpdesActivity.create({
      data: {
        planId: input.planId,
        title: input.title,
        description: input.description,
        year: input.year,
        location: input.location,
        estimatedBudget: input.estimatedBudget,
        sdgGoalIds: input.sdgGoalIds,
        priorityScore,
        status: input.status ?? "planned",
        source: "internal",
      },
    });

    return NextResponse.json({ ok: true, row: serializeActivity(created) });
  } catch (e) {
    console.error("POST /api/rpjmdes/activities", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
