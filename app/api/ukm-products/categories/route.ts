import { getApiSession } from "@/lib/api-session";
 
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

function normalizeImageUrls(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean);
  }
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    const session = await getApiSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const categories = await prisma.potential.findMany({
      where: {
        villageId: village.id,
        category: { in: ["UMKM", "UKM"] },
        subCategory: { not: null },
      },
      select: {
        subCategory: true,
      },
      distinct: ["subCategory"],
    });

    return NextResponse.json({
      categories: categories.map(c => c.subCategory).filter(Boolean)
    });
  } catch (error) {
    console.error("Error fetching UKM categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = (await req.json()) as { name?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json(
        { error: "Nama kategori wajib diisi" },
        { status: 400 },
      );
    }

    // Check if category already exists
    const existing = await prisma.potential.findFirst({
      where: {
        villageId: village.id,
        category: { in: ["UMKM", "UKM"] },
        subCategory: name,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Kategori sudah ada" },
        { status: 400 },
      );
    }

    // Create a placeholder product for the category
    const created = await prisma.potential.create({
      data: {
        villageId: village.id,
        category: "UMKM",
        subCategory: name,
        name: `Kategori: ${name}`,
        description: "",
        productionValue: null,
        images: [],
        status: "inactive",
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
    console.error("Error creating UKM category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = (await req.json()) as { from?: unknown; to?: unknown };
    const from = typeof body.from === "string" ? body.from.trim() : "";
    const to = typeof body.to === "string" ? body.to.trim() : "";

    if (!from) {
      return NextResponse.json(
        { error: "Kategori asal wajib diisi" },
        { status: 400 },
      );
    }
    if (!to) {
      return NextResponse.json(
        { error: "Nama kategori baru wajib diisi" },
        { status: 400 },
      );
    }

    const result = await prisma.potential.updateMany({
      where: {
        villageId: village.id,
        category: { in: ["UMKM", "UKM"] },
        subCategory: from,
      },
      data: { subCategory: to },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error("Error renaming UKM category:", error);
    return NextResponse.json(
      { error: "Failed to rename category" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = (await req.json()) as { name?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json(
        { error: "Nama kategori wajib diisi" },
        { status: 400 },
      );
    }

    // Check if category is used by any products
    const count = await prisma.potential.count({
      where: {
        villageId: village.id,
        category: { in: ["UMKM", "UKM"] },
        subCategory: name,
      },
    });

    if (count > 0) {
      return NextResponse.json(
        { error: "Kategori tidak bisa dihapus karena masih digunakan oleh produk" },
        { status: 400 },
      );
    }

    // Actually, since we create placeholder products, we need to delete them
    // But for now, since count > 0 would include placeholders, but we want to allow delete if only placeholders
    // For simplicity, since placeholders have status inactive, check if there are active products
    const activeCount = await prisma.potential.count({
      where: {
        villageId: village.id,
        category: { in: ["UMKM", "UKM"] },
        subCategory: name,
        status: "active",
      },
    });

    if (activeCount > 0) {
      return NextResponse.json(
        { error: "Kategori tidak bisa dihapus karena masih digunakan oleh produk aktif" },
        { status: 400 },
      );
    }

    // Delete placeholder products
    await prisma.potential.deleteMany({
      where: {
        villageId: village.id,
        category: { in: ["UMKM", "UKM"] },
        subCategory: name,
        status: "inactive",
        name: { startsWith: "Kategori: " },
      },
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Error deleting UKM category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 },
    );
  }
}
