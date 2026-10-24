import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { assetSearchWhere } from "@/lib/gis/list-query";
import { parseVillageAssetInput } from "@/lib/gis/schemas";
import { parseListQuery } from "@/lib/pkk/list-query";
import { prisma } from "@/lib/prisma";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { isAddonActive, petaLimit } from "@/lib/modules/resource-limits";
import { loadActiveModuleSubs } from "@/lib/modules/require-module";

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

const ASSET_SORT_KEYS = new Set([
  "name",
  "assetType",
  "condition",
  "rt",
  "rw",
  "lat",
  "lng",
]);

function assetOrderBy(
  sortKey: string | undefined,
  sortOrder: "asc" | "desc",
): Prisma.VillageAssetOrderByWithRelationInput[] {
  if (sortKey && ASSET_SORT_KEYS.has(sortKey)) {
    return [{ [sortKey]: sortOrder }];
  }
  return [{ name: "asc" }];
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
    const searchFilter = assetSearchWhere(q.search);
    const where: Prisma.VillageAssetWhereInput = {
      villageId: village.id,
      ...(searchFilter ?? {}),
    };

    const [addons, total, rows] = await Promise.all([
      loadActiveModuleSubs(village.id),
      prisma.villageAsset.count({ where }),
      prisma.villageAsset.findMany({
        where,
        orderBy: assetOrderBy(q.sortKey, q.sortOrder),
        skip: q.skip,
        take: q.pageSize,
      }),
    ]);

    const hasAddon = isAddonActive("peta-infrastruktur", addons);
    const limit = petaLimit(village.subscriptionPlan, village.subscriptionStatus, hasAddon);
    const cap = limit?.assets ?? null;
    const isOverLimit = cap !== null && total > cap;

    return NextResponse.json({
      rows: rows.map(serializeAsset),
      total,
      limit: cap,
      isOverLimit,
      hiddenCount: isOverLimit ? total - cap! : 0,
    });
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

    const [addonsPost, assetCount] = await Promise.all([
      loadActiveModuleSubs(village.id),
      prisma.villageAsset.count({ where: { villageId: village.id } }),
    ]);
    const postLimit = petaLimit(village.subscriptionPlan, village.subscriptionStatus, isAddonActive("peta-infrastruktur", addonsPost));
    if (postLimit !== null && assetCount >= postLimit.assets) {
      return NextResponse.json(
        { error: "RESOURCE_LIMIT_REACHED", limit: postLimit.assets, current: assetCount, module: "peta-infrastruktur", billingUrl: "/billing?module=peta-infrastruktur" },
        { status: 402 },
      );
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
