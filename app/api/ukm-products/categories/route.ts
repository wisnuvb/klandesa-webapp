import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { toUkmProduct, ukmProductSelect } from "../_serialize";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
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
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
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
      select: ukmProductSelect,
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
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
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
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
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
