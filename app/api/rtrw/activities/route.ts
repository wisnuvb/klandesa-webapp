import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { parseRtRwActivityInput } from "@/lib/rtrw/schemas";
import { parseSdgGoalIds } from "@/lib/sdgs/parse-goals";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

function serializeActivity(a: {
  id: number;
  rt: string;
  rw: string;
  title: string;
  description: string | null;
  activityType: string;
  activityDate: Date;
  participantCount: number;
  budgetUsed: unknown;
  sdgGoalIds: unknown;
  status: string;
}) {
  return {
    id: a.id,
    rt: a.rt,
    rw: a.rw,
    title: a.title,
    description: a.description,
    activityType: a.activityType,
    activityDate: a.activityDate.toISOString().slice(0, 10),
    participantCount: a.participantCount,
    budgetUsed: a.budgetUsed != null ? Number(a.budgetUsed) : null,
    sdgGoalIds: parseSdgGoalIds(a.sdgGoalIds),
    status: a.status,
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

    const rows = await prisma.rtRwActivity.findMany({
      where: { villageId: village.id },
      orderBy: [{ activityDate: "desc" }, { id: "desc" }],
      take: 100,
    });

    return NextResponse.json({ rows: rows.map(serializeActivity) });
  } catch (e) {
    console.error("GET /api/rtrw/activities", e);
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
    const input = parseRtRwActivityInput(body);
    if (!input) {
      return NextResponse.json({ error: "Data kegiatan tidak valid" }, { status: 400 });
    }

    const created = await prisma.rtRwActivity.create({
      data: {
        villageId: village.id,
        rt: input.rt,
        rw: input.rw,
        title: input.title,
        description: input.description,
        activityType: input.activityType,
        activityDate: new Date(input.activityDate),
        participantCount: input.participantCount ?? 0,
        budgetUsed: input.budgetUsed,
        sdgGoalIds: input.sdgGoalIds,
        status: "planned",
      },
    });

    return NextResponse.json({ ok: true, row: serializeActivity(created) });
  } catch (e) {
    console.error("POST /api/rtrw/activities", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
