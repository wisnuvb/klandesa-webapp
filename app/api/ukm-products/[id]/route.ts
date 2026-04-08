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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const row = await prisma.potential.findFirst({
      where: {
        id,
        villageId: village.id,
        category: { in: ["UMKM", "UKM"] },
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

    if (!row) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json(toUkmProduct(row));
  } catch (error) {
    console.error("Error fetching UKM product:", error);
    return NextResponse.json(
      { error: "Failed to fetch UKM product" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const existing = await prisma.potential.findFirst({
      where: {
        id,
        villageId: village.id,
        category: { in: ["UMKM", "UKM"] },
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 },
      );
    }

    const body = (await req.json()) as {
      name?: unknown;
      description?: unknown;
      price?: unknown;
      category?: unknown;
      images?: unknown;
    };

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

    const updated = await prisma.potential.update({
      where: { id },
      data: {
        name,
        description,
        subCategory: category || null,
        productionValue: price,
        images,
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

    return NextResponse.json(toUkmProduct(updated));
  } catch (error) {
    console.error("Error updating UKM product:", error);
    return NextResponse.json(
      { error: "Failed to update UKM product" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const existing = await prisma.potential.findFirst({
      where: {
        id,
        villageId: village.id,
        category: { in: ["UMKM", "UKM"] },
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 },
      );
    }

    await prisma.potential.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting UKM product:", error);
    return NextResponse.json(
      { error: "Failed to delete UKM product" },
      { status: 500 },
    );
  }
}
