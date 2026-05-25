import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { parseDisasterPointInput } from "@/lib/lingkungan/schemas";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

function serialize(row: {
  id: number;
  name: string;
  disasterType: string;
  riskLevel: string;
  lat: number | null;
  lng: number | null;
  rt: string | null;
  rw: string | null;
  notes: string | null;
  evacuationPlan: string | null;
  lastCheckedAt: Date | null;
  status: string;
}) {
  return {
    ...row,
    lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
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

    const rows = await prisma.disasterPoint.findMany({
      where: { villageId: village.id },
      orderBy: [{ riskLevel: "desc" }, { name: "asc" }],
    });

    return NextResponse.json({ rows: rows.map(serialize) });
  } catch (e) {
    console.error("GET /api/lingkungan/disaster-points", e);
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
    const input = parseDisasterPointInput(body);
    if (!input) {
      return NextResponse.json({ error: "Data titik bencana tidak valid" }, { status: 400 });
    }

    const created = await prisma.disasterPoint.create({
      data: {
        villageId: village.id,
        name: input.name,
        disasterType: input.disasterType,
        riskLevel: input.riskLevel ?? "medium",
        lat: input.lat,
        lng: input.lng,
        rt: input.rt,
        rw: input.rw,
        notes: input.notes,
        evacuationPlan: input.evacuationPlan,
        status: input.status ?? "monitored",
        lastCheckedAt: input.lastCheckedAt ? new Date(input.lastCheckedAt) : null,
      },
    });

    return NextResponse.json({ ok: true, row: serialize(created) });
  } catch (e) {
    console.error("POST /api/lingkungan/disaster-points", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
