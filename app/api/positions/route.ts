import { requireVillageApiContext } from "@/lib/api-village-context";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
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

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.max(
      1,
      Number(url.searchParams.get("pageSize") ?? 100),
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

    const body = await req.json();
    const { name, level, description, salary, allowance, isActive } = body;

    if (!name || !level) {
      return NextResponse.json(
        { error: "Name and level are required" },
        { status: 400 },
      );
    }

    const position = await prisma.position.create({
      data: {
        villageId: village.id,
        name,
        level: Number(level),
        description: description || null,
        salary: salary ? Number(salary) : null,
        allowance: allowance ? Number(allowance) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
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
