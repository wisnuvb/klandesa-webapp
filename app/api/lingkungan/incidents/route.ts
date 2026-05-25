import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_EARLY_WARNING_CHECKLIST,
  parseEnvironmentalIncidentInput,
} from "@/lib/lingkungan/schemas";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

function serialize(row: {
  id: number;
  title: string;
  description: string | null;
  incidentType: string;
  severity: string;
  lat: number | null;
  lng: number | null;
  rt: string | null;
  rw: string | null;
  reportedAt: Date;
  status: string;
  checklist: unknown;
}) {
  return {
    ...row,
    reportedAt: row.reportedAt.toISOString(),
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

    const rows = await prisma.environmentalIncident.findMany({
      where: { villageId: village.id },
      orderBy: [{ reportedAt: "desc" }],
    });

    return NextResponse.json({ rows: rows.map(serialize) });
  } catch (e) {
    console.error("GET /api/lingkungan/incidents", e);
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
    const input = parseEnvironmentalIncidentInput(body);
    if (!input) {
      return NextResponse.json({ error: "Data insiden tidak valid" }, { status: 400 });
    }

    const created = await prisma.environmentalIncident.create({
      data: {
        villageId: village.id,
        title: input.title,
        description: input.description,
        incidentType: input.incidentType,
        severity: input.severity ?? "medium",
        lat: input.lat,
        lng: input.lng,
        rt: input.rt,
        rw: input.rw,
        status: input.status ?? "open",
        checklist: input.checklist ?? DEFAULT_EARLY_WARNING_CHECKLIST,
      },
    });

    return NextResponse.json({ ok: true, row: serialize(created) });
  } catch (e) {
    console.error("POST /api/lingkungan/incidents", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
