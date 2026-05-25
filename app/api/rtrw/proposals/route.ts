import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { parseCommunityProposalInput } from "@/lib/rtrw/schemas";
import { parseSdgGoalIds } from "@/lib/sdgs/parse-goals";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

function serializeProposal(p: {
  id: number;
  proposerName: string;
  rt: string | null;
  rw: string | null;
  title: string;
  description: string;
  proposalType: string;
  sdgGoalIds: unknown;
  status: string;
  votesCount: number;
  createdAt: Date;
}) {
  return {
    id: p.id,
    proposerName: p.proposerName,
    rt: p.rt,
    rw: p.rw,
    title: p.title,
    description: p.description,
    proposalType: p.proposalType,
    sdgGoalIds: parseSdgGoalIds(p.sdgGoalIds),
    status: p.status,
    votesCount: p.votesCount,
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

    const rows = await prisma.communityProposal.findMany({
      where: { villageId: village.id },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
    });

    return NextResponse.json({ rows: rows.map(serializeProposal) });
  } catch (e) {
    console.error("GET /api/rtrw/proposals", e);
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
    const input = parseCommunityProposalInput(body);
    if (!input) {
      return NextResponse.json({ error: "Data usulan tidak valid" }, { status: 400 });
    }

    const created = await prisma.communityProposal.create({
      data: {
        villageId: village.id,
        proposerName: input.proposerName,
        rt: input.rt,
        rw: input.rw,
        title: input.title,
        description: input.description,
        proposalType: input.proposalType ?? "infrastructure",
        sdgGoalIds: input.sdgGoalIds,
        status: "submitted",
      },
    });

    return NextResponse.json({ ok: true, row: serializeProposal(created) });
  } catch (e) {
    console.error("POST /api/rtrw/proposals", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
