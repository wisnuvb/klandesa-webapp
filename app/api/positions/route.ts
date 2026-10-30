import { requireVillageApiContext } from "@/lib/api-village-context";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { parsePositionCreate } from "@/lib/positions/schema";

const MAX_PAGE_SIZE = 200;

function positiveInt(raw: string | null, fallback: number) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const url = new URL(req.url);
    const page = positiveInt(url.searchParams.get("page"), 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      positiveInt(url.searchParams.get("pageSize"), 100),
    );
    const search = url.searchParams.get("search") ?? undefined;
    const isActive = url.searchParams.get("isActive");

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const where: any = { villageId: village.id };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const [rows, total] = await Promise.all([
      prisma.position.findMany({
        where,
        orderBy: [{ level: "asc" }, { name: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: { officials: true },
          },
        },
      }),
      prisma.position.count({ where }),
    ]);

    const mapped = rows.map((p) => ({
      id: p.id,
      name: p.name,
      level: p.level,
      description: p.description,
      salary: p.salary,
      allowance: p.allowance,
      isActive: p.isActive,
      total_staff: p._count.officials,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      rows: mapped,
      total,
      page,
      pageSize,
    });
  } catch (err) {
    console.error("GET /api/positions error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Body permintaan tidak valid" },
        { status: 400 },
      );
    }

    const parsed = parsePositionCreate(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { name, level, description, salary, allowance, isActive } =
      parsed.data;

    const position = await prisma.position.create({
      data: {
        villageId: village.id,
        name,
        level,
        description: description ?? null,
        salary: salary ?? null,
        allowance: allowance ?? null,
        isActive: isActive ?? true,
      },
      include: {
        _count: {
          select: { officials: true },
        },
      },
    });

    const mapped = {
      id: position.id,
      name: position.name,
      level: position.level,
      description: position.description,
      salary: position.salary,
      allowance: position.allowance,
      isActive: position.isActive,
      total_staff: position._count.officials,
      createdAt: position.createdAt.toISOString(),
      updatedAt: position.updatedAt.toISOString(),
    };

    return NextResponse.json(mapped, { status: 201 });
  } catch (err) {
    console.error("POST /api/positions error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
