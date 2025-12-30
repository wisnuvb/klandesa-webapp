/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSubdomain } from "@/lib/subdomain";

async function resolveVillage(
  req: NextRequest,
  queryVillageCode?: string,
  session?: any
) {
  if (session?.user?.villageCode) {
    const village = await prisma.village.findUnique({
      where: { code: session.user.villageCode },
    });
    if (village) return village;
  }

  if (queryVillageCode) {
    const village = await prisma.village.findUnique({
      where: { code: queryVillageCode },
    });
    if (village) return village;
  }

  const sub = getSubdomain(req);
  if (sub && sub !== "app") {
    const village = await prisma.village.findUnique({ where: { code: sub } });
    if (village) return village;
  }

  const defaultCode = process.env.DEFAULT_VILLAGE_CODE;
  if (defaultCode) {
    const village = await prisma.village.findUnique({
      where: { code: defaultCode },
    });
    if (village) return village;
  }

  const firstVillage = await prisma.village.findFirst({
    orderBy: { id: "asc" },
  });
  if (firstVillage) return firstVillage;

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.max(
      1,
      Number(url.searchParams.get("pageSize") ?? 100)
    );
    const search = url.searchParams.get("search") ?? undefined;
    const isActive = url.searchParams.get("isActive");
    const villageCode = url.searchParams.get("villageCode") ?? undefined;

    const village = await resolveVillage(req, villageCode, session);
    if (!village) {
      return NextResponse.json(
        {
          error:
            "Tidak ada desa yang tersedia. Login terlebih dahulu atau atur DEFAULT_VILLAGE_CODE di env.",
        },
        { status: 404 }
      );
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
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const village = await resolveVillage(req, undefined, session);
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, level, description, salary, allowance, isActive } = body;

    // Validation
    if (!name || !level) {
      return NextResponse.json(
        { error: "Name and level are required" },
        { status: 400 }
      );
    }

    // Create position
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
      { status: 500 }
    );
  }
}
