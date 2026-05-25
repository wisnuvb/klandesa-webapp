import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { parseVillageAssetInput } from "@/lib/gis/schemas";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

function serializeAsset(a: {
  id: number;
  name: string;
  assetType: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  rt: string | null;
  rw: string | null;
  condition: string;
  sdgGoalIds: unknown;
  status: string;
}) {
  return {
    id: a.id,
    name: a.name,
    assetType: a.assetType,
    description: a.description,
    lat: a.lat,
    lng: a.lng,
    rt: a.rt,
    rw: a.rw,
    condition: a.condition,
    sdgGoalIds: a.sdgGoalIds,
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

    const rows = await prisma.villageAsset.findMany({
      where: { villageId: village.id },
      orderBy: [{ name: "asc" }],
    });

    return NextResponse.json({ rows: rows.map(serializeAsset) });
  } catch (e) {
    console.error("GET /api/gis/assets", e);
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
    const input = parseVillageAssetInput(body);
    if (!input) {
      return NextResponse.json({ error: "Data aset tidak valid" }, { status: 400 });
    }

    const created = await prisma.villageAsset.create({
      data: {
        villageId: village.id,
        name: input.name,
        assetType: input.assetType,
        description: input.description,
        lat: input.lat,
        lng: input.lng,
        rt: input.rt,
        rw: input.rw,
        condition: input.condition ?? "good",
        sdgGoalIds: input.sdgGoalIds ?? [],
        status: input.status ?? "active",
      },
    });

    return NextResponse.json({ ok: true, row: serializeAsset(created) });
  } catch (e) {
    console.error("POST /api/gis/assets", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
