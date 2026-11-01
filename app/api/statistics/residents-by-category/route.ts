import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { requireVillageApiContext } from "@/lib/api-village-context";
import {
  DIMENSIONS,
  RESIDENT_SELECT,
  filterResidents,
  toStatisticRow,
  type ResidentDb,
} from "@/lib/statistics/residents-by-category";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { searchParams } = new URL(req.url);
    const dimension = searchParams.get("dimension")?.trim() ?? "";
    const category = searchParams.get("category")?.trim() ?? "";

    if (!dimension || !DIMENSIONS.has(dimension)) {
      return NextResponse.json(
        { error: "Parameter dimension tidak valid" },
        { status: 400 },
      );
    }
    if (!category) {
      return NextResponse.json(
        { error: "Parameter category wajib" },
        { status: 400 },
      );
    }

    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const rawPageSize = Number(searchParams.get("pageSize") ?? 10);
    const pageSize = Math.min(100, Math.max(1, rawPageSize || 10));

    const residents = await prisma.resident.findMany({
      where: { villageId: village.id, isAlive: true },
      select: RESIDENT_SELECT,
    });

    const filtered = filterResidents(residents as ResidentDb[], {
      dimension,
      category,
      gender: searchParams.get("gender") ?? "",
      search: searchParams.get("search") ?? "",
      sortKey: searchParams.get("sortKey") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
    });

    const total = filtered.length;
    const rows = filtered
      .slice((page - 1) * pageSize, page * pageSize)
      .map(toStatisticRow);

    return NextResponse.json({ rows, total });
  } catch (error) {
    console.error("GET /api/statistics/residents-by-category:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data penduduk" },
      { status: 500 },
    );
  }
}
