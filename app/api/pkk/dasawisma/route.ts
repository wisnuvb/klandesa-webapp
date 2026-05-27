import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { dasawismaSearchWhere, parseListQuery } from "@/lib/pkk/list-query";
import { parseDasawismaInput } from "@/lib/pkk/schemas";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

const SORT_KEYS = new Set(["rt", "rw", "leaderName", "memberCount", "sessionCount"]);

function dasawismaOrderBy(
  sortKey: string | undefined,
  sortOrder: "asc" | "desc",
): Prisma.DasawismaOrderByWithRelationInput[] {
  if (sortKey === "sessionCount") {
    return [{ posyanduSessions: { _count: sortOrder } }];
  }
  if (sortKey && SORT_KEYS.has(sortKey) && sortKey !== "sessionCount") {
    return [{ [sortKey]: sortOrder }];
  }
  return [{ rw: "asc" }, { rt: "asc" }];
}

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const q = parseListQuery(req);
    const searchFilter = dasawismaSearchWhere(q.search);
    const where: Prisma.DasawismaWhereInput = {
      villageId: village.id,
      ...(searchFilter ?? {}),
    };

    const [total, rows] = await prisma.$transaction([
      prisma.dasawisma.count({ where }),
      prisma.dasawisma.findMany({
        where,
        orderBy: dasawismaOrderBy(q.sortKey, q.sortOrder),
        skip: q.skip,
        take: q.pageSize,
        include: {
          _count: { select: { posyanduSessions: true } },
        },
      }),
    ]);

    return NextResponse.json({
      rows: rows.map((d) => ({
        id: d.id,
        rt: d.rt,
        rw: d.rw,
        leaderName: d.leaderName,
        memberCount: d.memberCount,
        sessionCount: d._count.posyanduSessions,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
      total,
    });
  } catch (e) {
    console.error("GET /api/pkk/dasawisma", e);
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
    const input = parseDasawismaInput(body);
    if (!input) {
      return NextResponse.json(
        { error: "RT, RW, dan nama ketua wajib diisi" },
        { status: 400 },
      );
    }

    const created = await prisma.dasawisma.create({
      data: {
        villageId: village.id,
        rt: input.rt,
        rw: input.rw,
        leaderName: input.leaderName,
        memberCount: input.memberCount ?? 0,
      },
    });

    return NextResponse.json({
      ok: true,
      row: {
        id: created.id,
        rt: created.rt,
        rw: created.rw,
        leaderName: created.leaderName,
        memberCount: created.memberCount,
      },
    });
  } catch (e) {
    const msg = String(e);
    if (msg.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Dasawisma RT/RW sudah terdaftar" },
        { status: 409 },
      );
    }
    console.error("POST /api/pkk/dasawisma", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
