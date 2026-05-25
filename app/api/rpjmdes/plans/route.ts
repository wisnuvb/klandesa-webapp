import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { parsePlanInput } from "@/lib/rpjmdes/schemas";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

function serializePlan(p: {
  id: number;
  title: string;
  periodStart: number;
  periodEnd: number;
  vision: string | null;
  mission: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: { activities: number; proposals: number };
}) {
  return {
    id: p.id,
    title: p.title,
    periodStart: p.periodStart,
    periodEnd: p.periodEnd,
    vision: p.vision,
    mission: p.mission,
    status: p.status,
    activityCount: p._count?.activities ?? 0,
    proposalCount: p._count?.proposals ?? 0,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
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

    const rows = await prisma.rpjmdesPlan.findMany({
      where: { villageId: village.id },
      orderBy: [{ periodStart: "desc" }, { id: "desc" }],
      include: {
        _count: { select: { activities: true, proposals: true } },
      },
    });

    return NextResponse.json({ rows: rows.map(serializePlan) });
  } catch (e) {
    console.error("GET /api/rpjmdes/plans", e);
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
    const input = parsePlanInput(body);
    if (!input) {
      return NextResponse.json({ error: "Data rencana tidak valid" }, { status: 400 });
    }
    if (input.periodEnd < input.periodStart) {
      return NextResponse.json(
        { error: "Tahun akhir harus >= tahun awal" },
        { status: 400 },
      );
    }

    const created = await prisma.rpjmdesPlan.create({
      data: {
        villageId: village.id,
        title: input.title,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        vision: input.vision,
        mission: input.mission,
        status: input.status ?? "draft",
      },
      include: {
        _count: { select: { activities: true, proposals: true } },
      },
    });

    return NextResponse.json({ ok: true, row: serializePlan(created) });
  } catch (e) {
    console.error("POST /api/rpjmdes/plans", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
