/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { normalizeImageUrls } from "@/app/(app)/ukm/_utils";
import {
  parseStockQuantity,
  toUkmProduct,
  ukmProductSelect,
} from "./_serialize";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
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
      select: ukmProductSelect,
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
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const body = (await req.json()) as {
      name?: unknown;
      description?: unknown;
      price?: unknown;
      category?: unknown;
      images?: unknown;
      unit?: unknown;
      stockQuantity?: unknown;
      notes?: unknown;
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
    const unit = typeof body.unit === "string" ? body.unit.trim() : "";
    const notesRaw = typeof body.notes === "string" ? body.notes.trim() : "";
    const stockQuantity = parseStockQuantity(body.stockQuantity);

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
        productionUnit: unit || null,
        stockQuantity,
        productNotes: notesRaw || null,
        images,
        status: "active",
      },
      select: ukmProductSelect,
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
