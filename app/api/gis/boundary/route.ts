import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireVillageApiContext } from "@/lib/api-village-context";
import {
  mergeBoundaryIntoVillageSettings,
  parseBoundaryPolygon,
  parseGisSettings,
} from "@/lib/gis/boundary";
import { prisma } from "@/lib/prisma";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { boundary } = parseGisSettings(village.settings);
    return NextResponse.json({ boundary });
  } catch (e) {
    console.error("GET /api/gis/boundary", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    let boundary = null;
    if (body.boundary !== null && body.boundary !== undefined) {
      boundary = parseBoundaryPolygon(body.boundary);
      if (!boundary) {
        return NextResponse.json(
          { error: "Format batas desa tidak valid" },
          { status: 400 },
        );
      }
    }

    const newSettings = mergeBoundaryIntoVillageSettings(
      village.settings,
      boundary,
    );

    await prisma.village.update({
      where: { id: village.id },
      data: {
        settings: newSettings as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ ok: true, boundary });
  } catch (e) {
    console.error("PUT /api/gis/boundary", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
