import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { parseProposalInput } from "@/lib/rpjmdes/schemas";
import { computeSdgPriorityScore } from "@/lib/rpjmdes/priority-scoring";
import { collectVillageMetrics } from "@/lib/sdgs/collect-metrics";
import { computeSdgsDashboard } from "@/lib/sdgs/scoring-engine";
import { parseSdgGoalIds } from "@/lib/sdgs/parse-goals";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

function serializeProposal(p: {
  id: number;
  planId: number | null;
  proposerName: string;
  proposerNik: string | null;
  rt: string | null;
  rw: string | null;
  title: string;
  description: string;
  sdgGoalIds: unknown;
  status: string;
  priorityScore: number | null;
  mergedActivityId: number | null;
  createdAt: Date;
}) {
  return {
    id: p.id,
    planId: p.planId,
    proposerName: p.proposerName,
    proposerNik: p.proposerNik,
    rt: p.rt,
    rw: p.rw,
    title: p.title,
    description: p.description,
    sdgGoalIds: parseSdgGoalIds(p.sdgGoalIds),
    status: p.status,
    priorityScore: p.priorityScore,
    mergedActivityId: p.mergedActivityId,
    createdAt: p.createdAt.toISOString(),
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

    const statusFilter = req.nextUrl.searchParams.get("status");

    const rows = await prisma.musdesProposal.findMany({
      where: {
        villageId: village.id,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ rows: rows.map(serializeProposal) });
  } catch (e) {
    console.error("GET /api/rpjmdes/proposals", e);
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
    const input = parseProposalInput(body);
    if (!input) {
      return NextResponse.json({ error: "Data usulan tidak valid" }, { status: 400 });
    }

    if (input.planId) {
      const plan = await prisma.rpjmdesPlan.findFirst({
        where: { id: input.planId, villageId: village.id },
      });
      if (!plan) {
        return NextResponse.json({ error: "Rencana RPJMDes tidak ditemukan" }, { status: 404 });
      }
    }

    const { metrics, idmVillageCode } = await collectVillageMetrics(village.id);
    const dashboard = computeSdgsDashboard(metrics, idmVillageCode);
    const priorityScore = computeSdgPriorityScore(input.sdgGoalIds, dashboard.goals);

    const created = await prisma.musdesProposal.create({
      data: {
        villageId: village.id,
        planId: input.planId,
        proposerName: input.proposerName,
        proposerNik: input.proposerNik,
        rt: input.rt,
        rw: input.rw,
        title: input.title,
        description: input.description,
        sdgGoalIds: input.sdgGoalIds,
        priorityScore,
        status: "submitted",
      },
    });

    return NextResponse.json({ ok: true, row: serializeProposal(created) });
  } catch (e) {
    console.error("POST /api/rpjmdes/proposals", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
