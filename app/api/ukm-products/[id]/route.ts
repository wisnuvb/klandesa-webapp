import { getApiSession } from "@/lib/api-session";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
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
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(req);
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

    const updated = await prisma.potential.update({
      where: { id },
      data: {
        name,
        description,
        subCategory: category || null,
        productionValue: price,
        productionUnit: unit || null,
        stockQuantity,
        productNotes: notesRaw || null,
        images,
      },
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(req);
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
