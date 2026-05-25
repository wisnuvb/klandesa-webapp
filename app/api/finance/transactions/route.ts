import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toJSONSafe } from "@/utils/json";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { invalidateFinanceSummaryCache } from "@/lib/finance/summary-cache";
import { requireVillageApiContext } from "@/lib/api-village-context";

function generateTransactionNumber(type: string, date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
  const prefix = type === "income" ? "BKM" : "BKK";
  return `${prefix}-${year}-${month}-${random}`;
}

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const yearParam = req.nextUrl.searchParams.get("year");
    const typeParam = req.nextUrl.searchParams.get("type");
    const year = yearParam ? parseInt(yearParam, 10) : undefined;

    const where: {
      villageId: number;
      type?: string;
      transactionDate?: { gte: Date; lt: Date };
    } = { villageId: village.id };

    if (typeParam === "income" || typeParam === "expense") {
      where.type = typeParam;
    }

    if (Number.isFinite(year)) {
      where.transactionDate = {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${(year as number) + 1}-01-01`),
      };
    }

    const rows = await prisma.transaction.findMany({
      where,
      orderBy: [{ transactionDate: "desc" }, { id: "desc" }],
      take: 300,
      select: {
        id: true,
        transactionNumber: true,
        transactionDate: true,
        type: true,
        category: true,
        description: true,
        amount: true,
        sdgGoalIds: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: toJSONSafe(
        rows.map((r) => ({
          ...r,
          transactionDate: r.transactionDate.toISOString(),
        })),
      ),
    });
  } catch (err) {
    console.error("GET /api/finance/transactions error:", err);
    return NextResponse.json(
      { error: "Gagal memuat transaksi" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, userId } = loaded.ctx;

    const body = await req.json();
    const {
      type,
      category,
      description,
      amount,
      transactionDate,
      paymentMethod,
      referenceNumber,
      status,
    } = body;

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const categoryStr =
      typeof category === "string"
        ? category.trim()
        : String(category ?? "").trim();
    const descriptionStr =
      typeof description === "string"
        ? description.trim()
        : String(description ?? "").trim();

    if (
      !type ||
      !categoryStr ||
      !descriptionStr ||
      transactionDate === undefined ||
      transactionDate === null ||
      transactionDate === ""
    ) {
      return NextResponse.json(
        { error: "Field yang diperlukan tidak lengkap" },
        { status: 400 },
      );
    }

    const amt =
      typeof amount === "number"
        ? amount
        : parseFloat(String(amount ?? "").replace(",", "."));
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json(
        { error: "Jumlah harus berupa angka lebih dari 0" },
        { status: 400 },
      );
    }

    const date = new Date(transactionDate);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "Tanggal transaksi tidak valid" },
        { status: 400 },
      );
    }
    const transactionNumber = generateTransactionNumber(type, date);

    const transaction = await prisma.transaction.create({
      data: {
        villageId: village.id,
        transactionNumber,
        transactionDate: date,
        type,
        category: categoryStr,
        description: descriptionStr,
        amount: amt,
        paymentMethod: paymentMethod || "cash",
        referenceNumber: referenceNumber || transactionNumber,
        status: status || "verified",
        verifiedBy: userId,
      },
    });

    invalidateFinanceSummaryCache(village.id);

    return NextResponse.json({
      success: true,
      data: toJSONSafe(transaction),
      message: "Transaksi berhasil dicatat",
    });
  } catch (err) {
    console.error("POST /api/finance/transactions error:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan transaksi" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = await req.json();
    const {
      id,
      type,
      category,
      description,
      amount,
      transactionDate,
      paymentMethod,
      referenceNumber,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID transaksi diperlukan" },
        { status: 400 },
      );
    }

    const existing = await prisma.transaction.findFirst({
      where: { id: BigInt(id), villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    const transaction = await prisma.transaction.update({
      where: { id: existing.id },
      data: {
        ...(type && { type }),
        ...(category && { category }),
        ...(description && { description }),
        ...(amount && { amount: parseFloat(amount) }),
        ...(transactionDate && { transactionDate: new Date(transactionDate) }),
        ...(paymentMethod && { paymentMethod }),
        ...(referenceNumber && { referenceNumber }),
      },
    });

    invalidateFinanceSummaryCache(village.id);

    return NextResponse.json({
      success: true,
      data: toJSONSafe(transaction),
      message: "Transaksi berhasil diupdate",
    });
  } catch (err) {
    console.error("PUT /api/finance/transactions error:", err);
    return NextResponse.json(
      { error: "Gagal mengupdate transaksi" },
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID transaksi diperlukan" },
        { status: 400 },
      );
    }

    const existing = await prisma.transaction.findFirst({
      where: { id: BigInt(id), villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    await prisma.transaction.delete({
      where: { id: existing.id },
    });

    invalidateFinanceSummaryCache(village.id);

    return NextResponse.json({
      success: true,
      message: "Transaksi berhasil dihapus",
    });
  } catch (err) {
    console.error("DELETE /api/finance/transactions error:", err);
    return NextResponse.json(
      { error: "Gagal menghapus transaksi" },
      { status: 500 },
    );
  }
}
