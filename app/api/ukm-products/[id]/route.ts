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
} from "../_serialize";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
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
      select: ukmProductSelect,
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

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
      unit?: unknown;
      stockQuantity?: unknown;
      notes?: unknown;
    };

    const has = (k: keyof typeof body) =>
      Object.prototype.hasOwnProperty.call(body, k);

    const data: Record<string, unknown> = {};

    if (has("name")) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) {
        return NextResponse.json(
          { error: "Nama produk wajib diisi" },
          { status: 400 },
        );
      }
      data.name = name;
    }

    if (has("description")) {
      const description =
        typeof body.description === "string" ? body.description.trim() : "";
      if (!description) {
        return NextResponse.json(
          { error: "Deskripsi produk wajib diisi" },
          { status: 400 },
        );
      }
      data.description = description;
    }

    if (has("category")) {
      const category =
        typeof body.category === "string" ? body.category.trim() : "";
      data.subCategory = category || null;
    }

    if (has("images")) {
      data.images = normalizeImageUrls(body.images);
    }

    if (has("unit")) {
      const unit = typeof body.unit === "string" ? body.unit.trim() : "";
      data.productionUnit = unit || null;
    }

    if (has("notes")) {
      const notesRaw = typeof body.notes === "string" ? body.notes.trim() : "";
      data.productNotes = notesRaw || null;
    }

    if (has("stockQuantity")) {
      data.stockQuantity = parseStockQuantity(body.stockQuantity);
    }

    if (has("price")) {
      const priceNum =
        typeof body.price === "number"
          ? body.price
          : typeof body.price === "string"
            ? parseFloat(body.price)
            : 0;
      const price =
        typeof priceNum === "number" &&
        Number.isFinite(priceNum) &&
        priceNum > 0
          ? new Prisma.Decimal(priceNum)
          : null;
      data.productionValue = price;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Tidak ada field yang diubah" },
        { status: 400 },
      );
    }

    const updated = await prisma.potential.update({
      where: { id },
      data,
      select: ukmProductSelect,
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

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  return PATCH(req, ctx);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

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
