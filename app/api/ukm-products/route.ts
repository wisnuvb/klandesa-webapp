/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";

function normalizeImageUrls(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean);
  }
  return [];
}

function toUkmProduct(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.subCategory ?? null,
    price: row.productionValue ? Number(row.productionValue) : null,
    images: normalizeImageUrls(row.images),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }

    const searchParams = req.nextUrl.searchParams;
    const search = (searchParams.get("search") ?? "").trim();
    const category = (searchParams.get("category") ?? "").trim();

    const where: any = {
      villageId: village.id,
      category: { in: ["UMKM", "UKM"] },
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (category) {
      where.subCategory = category;
    }

    const rows = await prisma.potential.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        subCategory: true,
        productionValue: true,
        images: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ rows: rows.map(toUkmProduct) });
  } catch (error) {
    console.error("Error fetching UKM products:", error);
    return NextResponse.json(
      { error: "Failed to fetch UKM products" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      name?: unknown;
      description?: unknown;
      price?: unknown;
      category?: unknown;
      images?: unknown;
    };

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";

    if (!name) {
      return NextResponse.json(
        { error: "Nama produk wajib diisi" },
        { status: 400 },
      );
    }
    if (!description) {
      return NextResponse.json(
        { error: "Deskripsi produk wajib diisi" },
        { status: 400 },
      );
    }

    const category =
      typeof body.category === "string" ? body.category.trim() : "";
    const images = normalizeImageUrls(body.images);

    const priceNum =
      typeof body.price === "number"
        ? body.price
        : typeof body.price === "string"
          ? parseFloat(body.price)
          : 0;
    const price =
      typeof priceNum === "number" && Number.isFinite(priceNum) && priceNum > 0
        ? new Prisma.Decimal(priceNum)
        : null;

    const created = await prisma.potential.create({
      data: {
        villageId: village.id,
        category: "UMKM",
        subCategory: category || null,
        name,
        description,
        productionValue: price,
        images,
        status: "active",
      },
      select: {
        id: true,
        name: true,
        description: true,
        subCategory: true,
        productionValue: true,
        images: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(toUkmProduct(created), { status: 201 });
  } catch (error) {
    console.error("Error creating UKM product:", error);
    return NextResponse.json(
      { error: "Failed to create UKM product" },
      { status: 500 },
    );
  }
}
