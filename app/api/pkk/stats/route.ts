import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { computePkkStats } from "@/lib/pkk/stats";
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

    const stats = await computePkkStats(village.id);

    const stuntingResidents = await prisma.resident.findMany({
      where: { villageId: village.id, isAlive: true, isStunting: true },
      select: {
        id: true,
        name: true,
        nik: true,
        rt: true,
        rw: true,
        birthDate: true,
        weight: true,
        height: true,
      },
      orderBy: { name: "asc" },
      take: 100,
    });

    return NextResponse.json({
      stats,
      stuntingResidents: stuntingResidents.map((r) => ({
        id: r.id,
        name: r.name,
        nik: r.nik,
        rt: r.rt,
        rw: r.rw,
        birthDate: r.birthDate.toISOString().slice(0, 10),
        weight: r.weight,
        height: r.height,
      })),
    });
  } catch (e) {
    console.error("GET /api/pkk/stats", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
