import { getApiSession } from "@/lib/api-session";
import { NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/auth";
import { getToken } from "next-auth/jwt";
import { getSubdomain } from "@/lib/subdomain";
import { toJSONSafe } from "@/utils/json";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { invalidateFinanceSummaryCache } from "@/lib/finance/summary-cache";

type SessionType = Session | null;
type TokenType = Awaited<ReturnType<typeof getToken>> | null;

interface SessionUserLite {
  villageCode?: string;
}
interface TokenLite {
  villageCode?: string;
}

function getSessionVillageCode(session: SessionType): string | undefined {
  const s = session as unknown as { user?: SessionUserLite };
  return s.user?.villageCode;
}

function getTokenVillageCode(token: TokenType): string | undefined {
  const t = token as unknown as TokenLite | null;
  return t?.villageCode;
}

async function resolveVillage(
  req: NextRequest,
  queryVillageCode?: string,
  session?: SessionType,
  token?: TokenType
) {
  // Priority 1: session villageCode
  const sessionVillageCode = session
    ? getSessionVillageCode(session)
    : undefined;
  if (sessionVillageCode) {
    const v = await prisma.village.findUnique({
      where: { code: sessionVillageCode },
    });
    if (v) return v;
  }
  // Priority 2: token villageCode
  const tokenVillageCode = token ? getTokenVillageCode(token) : undefined;
  if (tokenVillageCode) {
    const v = await prisma.village.findUnique({
      where: { code: tokenVillageCode },
    });
    if (v) return v;
  }
  // Priority 3: explicit code (body/query)
  if (queryVillageCode) {
    const v = await prisma.village.findUnique({
      where: { code: queryVillageCode },
    });
    if (v) return v;
  }
  // Priority 4: subdomain
  const sub = getSubdomain(req);
  if (sub && sub !== "app") {
    const v = await prisma.village.findUnique({ where: { code: sub } });
    if (v) return v;
  }
  // Fallbacks
  const defaultCode = process.env.DEFAULT_VILLAGE_CODE;
  if (defaultCode) {
    const v = await prisma.village.findUnique({ where: { code: defaultCode } });
    if (v) return v;
  }
  return prisma.village.findFirst({ orderBy: { id: "asc" } });
}

function generateTransactionNumber(type: string, date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
  const prefix = type === "income" ? "BKM" : "BKK";
  return `${prefix}-${year}-${month}-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    const token = await getToken({ req, secret: authOptions.secret });

    // Parse body early to read optional villageCode
    const body = await req.json();
    const {
      type, // 'income' or 'expense'
      category,
      description,
      amount,
      transactionDate,
      paymentMethod,
      referenceNumber,
      status,
      villageCode,
    } = body;

    const village = await resolveVillage(req, villageCode, session, token);
    if (!village) {
      return NextResponse.json(
        { error: "Tidak ada desa yang tersedia" },
        { status: 404 }
      );
    }
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
        { status: 400 }
      );
    }

    const amt =
      typeof amount === "number"
        ? amount
        : parseFloat(String(amount ?? "").replace(",", "."));
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json(
        { error: "Jumlah harus berupa angka lebih dari 0" },
        { status: 400 }
      );
    }

    const date = new Date(transactionDate);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "Tanggal transaksi tidak valid" },
        { status: 400 }
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
        status: status || "verified", // Allow custom status (e.g., pending for SPP)
        // verifiedBy can be set if session/token present
        ...(session?.user?.id && {
          verifiedBy: parseInt(session.user.id as string),
        }),
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
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    const token = await getToken({ req, secret: authOptions.secret });
    // No hard auth check here; follow residents pattern

    const url = new URL(req.url);
    const vc = url.searchParams.get("villageCode") ?? undefined;
    const village = await resolveVillage(req, vc, session, token);
    if (!village) {
      return NextResponse.json(
        { error: "Tidak ada desa yang tersedia" },
        { status: 404 }
      );
    }
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
        { status: 400 }
      );
    }

    const transaction = await prisma.transaction.update({
      where: { id: BigInt(id) },
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
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    const token = await getToken({ req, secret: authOptions.secret });
    // No hard auth check here; follow residents pattern

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const vc = searchParams.get("villageCode") ?? undefined;
    const village = await resolveVillage(req, vc, session, token);
    if (!village) {
      return NextResponse.json(
        { error: "Tidak ada desa yang tersedia" },
        { status: 404 }
      );
    }
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    if (!id) {
      return NextResponse.json(
        { error: "ID transaksi diperlukan" },
        { status: 400 }
      );
    }

    await prisma.transaction.delete({
      where: { id: BigInt(id) },
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
      { status: 500 }
    );
  }
}
