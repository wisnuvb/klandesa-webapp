import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { projectSearchWhere } from "@/lib/gis/list-query";
import {
  parseInfrastructureProjectInput,
  parseOptionalDate,
} from "@/lib/gis/schemas";
import { parseListQuery } from "@/lib/pkk/list-query";
import { prisma } from "@/lib/prisma";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

function serializeProject(p: {
  id: number;
  assetId: number | null;
  title: string;
  description: string | null;
  projectType: string;
  budget: unknown;
  lat: number | null;
  lng: number | null;
  rt: string | null;
  rw: string | null;
  sdgGoalIds: unknown;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
}) {
  return {
    id: p.id,
    assetId: p.assetId,
    title: p.title,
    description: p.description,
    projectType: p.projectType,
    budget: p.budget != null ? Number(p.budget) : null,
    lat: p.lat,
    lng: p.lng,
    rt: p.rt,
    rw: p.rw,
    sdgGoalIds: p.sdgGoalIds,
    status: p.status,
    startDate: p.startDate?.toISOString().slice(0, 10) ?? null,
    endDate: p.endDate?.toISOString().slice(0, 10) ?? null,
  };
}

const PROJECT_SORT_KEYS = new Set([
  "title",
  "projectType",
  "status",
  "budget",
  "startDate",
  "endDate",
]);

function projectOrderBy(
  sortKey: string | undefined,
  sortOrder: "asc" | "desc",
): Prisma.InfrastructureProjectOrderByWithRelationInput[] {
  if (sortKey && PROJECT_SORT_KEYS.has(sortKey)) {
    return [{ [sortKey]: sortOrder }];
  }
  return [{ createdAt: "desc" }];
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
    const searchFilter = projectSearchWhere(q.search);
    const where: Prisma.InfrastructureProjectWhereInput = {
      villageId: village.id,
      ...(searchFilter ?? {}),
    };

    const [total, rows] = await prisma.$transaction([
      prisma.infrastructureProject.count({ where }),
      prisma.infrastructureProject.findMany({
        where,
        orderBy: projectOrderBy(q.sortKey, q.sortOrder),
        skip: q.skip,
        take: q.pageSize,
      }),
    ]);

    return NextResponse.json({
      rows: rows.map(serializeProject),
      total,
    });
  } catch (e) {
    console.error("GET /api/gis/projects", e);
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
    const input = parseInfrastructureProjectInput(body);
    if (!input) {
      return NextResponse.json({ error: "Data proyek tidak valid" }, { status: 400 });
    }

    if (input.assetId) {
      const asset = await prisma.villageAsset.findFirst({
        where: { id: input.assetId, villageId: village.id },
      });
      if (!asset) {
        return NextResponse.json({ error: "Aset tidak ditemukan" }, { status: 404 });
      }
    }

    const created = await prisma.infrastructureProject.create({
      data: {
        villageId: village.id,
        assetId: input.assetId,
        title: input.title,
        description: input.description,
        projectType: input.projectType,
        budget: input.budget,
        lat: input.lat,
        lng: input.lng,
        rt: input.rt,
        rw: input.rw,
        sdgGoalIds: input.sdgGoalIds ?? [],
        status: input.status ?? "planned",
        startDate: parseOptionalDate(input.startDate),
        endDate: parseOptionalDate(input.endDate),
      },
    });

    return NextResponse.json({ ok: true, row: serializeProject(created) });
  } catch (e) {
    console.error("POST /api/gis/projects", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
