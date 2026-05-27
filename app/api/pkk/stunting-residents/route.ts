import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import {
  parseListQuery,
  stuntingResidentSearchWhere,
} from "@/lib/pkk/list-query";
import { prisma } from "@/lib/prisma";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

const SORT_KEYS = new Set(["name", "nik", "rt", "rw", "birthDate"]);

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const q = parseListQuery(req);
    const searchFilter = stuntingResidentSearchWhere(q.search);

    const where = {
      villageId: village.id,
      isAlive: true,
      isStunting: true,
      ...(searchFilter ?? {}),
    };

    const orderBy =
      q.sortKey && SORT_KEYS.has(q.sortKey)
        ? [{ [q.sortKey]: q.sortOrder }]
        : [{ name: "asc" as const }];

    const [total, rows] = await prisma.$transaction([
      prisma.resident.count({ where }),
      prisma.resident.findMany({
        where,
        select: {
          id: true,
          name: true,
          nik: true,
          rt: true,
          rw: true,
          birthDate: true,
        },
        orderBy,
        skip: q.skip,
        take: q.pageSize,
      }),
    ]);

    return NextResponse.json({
      rows: rows.map((r) => ({
        id: r.id,
        name: r.name,
        nik: r.nik,
        rt: r.rt,
        rw: r.rw,
        birthDate: r.birthDate.toISOString().slice(0, 10),
      })),
      total,
    });
  } catch (e) {
    console.error("GET /api/pkk/stunting-residents", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
