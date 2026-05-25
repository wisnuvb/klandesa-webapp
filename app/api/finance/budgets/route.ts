import { getApiSession } from "@/lib/api-session";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/auth";
import { toJSONSafe } from "@/utils/json";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { requireVillagePermissionResponse } from "@/lib/access-policy";
import { resolveFinanceWriteVillage } from "@/lib/finance-village-context";

function generateBudgetCode(category: string, year: number) {
  const prefix = category.substring(0, 3).toUpperCase();
  const random = Math.floor(Math.random() * 999)
    .toString()
    .padStart(3, "0");
  return `${prefix}-${year}-${random}`;
}

async function assertBudgetVillageAccess(
  req: NextRequest,
  villageId: number,
  body?: { villageId?: unknown },
): Promise<NextResponse | null> {
  const loaded = await requireVillageApiContext(req);
  if (loaded.ok) {
    if (loaded.ctx.village.id !== villageId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return null;
  }

  const token = await getToken({ req, secret: authOptions.secret });
  if (
    token &&
    token.accountType !== "regional" &&
    typeof token.villageId === "number" &&
    token.villageId === villageId
  ) {
    return null;
  }

  const apiKeyHeader = req.headers.get("x-api-key");
  const validApiKey = process.env.FINANCE_API_KEY;
  if (validApiKey && apiKeyHeader === validApiKey) {
    const vid = body != null ? Number(body.villageId) : NaN;
    if (!Number.isFinite(vid) || vid !== villageId) {
      return NextResponse.json(
        { error: "villageId di body harus cocok dengan anggaran" },
        { status: 403 },
      );
    }
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const year = yearParam ? parseInt(yearParam, 10) : undefined;

    const budgets = await prisma.budget.findMany({
      where: {
        villageId: village.id,
        ...(Number.isFinite(year) ? { year } : {}),
      },
      orderBy: [{ year: "desc" }, { id: "desc" }],
    });

    return NextResponse.json({
      success: true,
      data: toJSONSafe(budgets),
    });
  } catch (err) {
    console.error("GET /api/finance/budgets error:", err);
    return NextResponse.json(
      { error: "Gagal memuat anggaran" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
    }

    const resolved = await resolveFinanceWriteVillage(req, body as { villageId?: unknown });
    if (!resolved.ok) return resolved.response;
    const { village, userId } = resolved;

    const session = await getApiSession(req);
    const createPermErr = requireVillagePermissionResponse(
      session,
      "finance",
      "create",
    );
    if (createPermErr) return createPermErr;

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { year, category, subCategory, budgetAmount, description } = body as {
      year?: number | string;
      category?: string;
      subCategory?: string;
      budgetAmount?: number | string;
      description?: string;
    };

    if (!year || !category || !subCategory || !budgetAmount) {
      return NextResponse.json(
        { error: "Field yang diperlukan tidak lengkap" },
        { status: 400 },
      );
    }

    const budgetCode = generateBudgetCode(category, Number(year));

    const creatorIdRaw =
      userId != null && Number.isFinite(userId)
        ? userId
        : session?.user?.id
          ? parseInt(String(session.user.id), 10)
          : undefined;

    const budget = await prisma.budget.create({
      data: {
        villageId: village.id,
        budgetCode,
        year: parseInt(String(year), 10),
        category,
        subCategory,
        description: description || `Anggaran ${category} - ${subCategory}`,
        budgetAmount: parseFloat(String(budgetAmount)),
        realizedAmount: 0,
        remainingAmount: parseFloat(String(budgetAmount)),
        status: "active",
        createdBy: creatorIdRaw != null && Number.isFinite(creatorIdRaw) ? creatorIdRaw : 1,
      },
    });

    return NextResponse.json({
      success: true,
      data: toJSONSafe(budget),
      message: "Anggaran berhasil ditambahkan",
    });
  } catch (err) {
    console.error("POST /api/finance/budgets error:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan anggaran" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, category, subCategory, budgetAmount, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID anggaran diperlukan" },
        { status: 400 },
      );
    }

    const currentBudget = await prisma.budget.findUnique({
      where: { id: BigInt(id) },
    });

    if (!currentBudget) {
      return NextResponse.json(
        { error: "Anggaran tidak ditemukan" },
        { status: 404 },
      );
    }

    const authErr = await assertBudgetVillageAccess(req, currentBudget.villageId, body);
    if (authErr) return authErr;

    const session = await getApiSession(req);
    const updatePermErr = requireVillagePermissionResponse(
      session,
      "finance",
      "update",
    );
    if (updatePermErr) return updatePermErr;

    const village = await prisma.village.findUnique({
      where: { id: currentBudget.villageId },
      select: { subscriptionStatus: true, subscriptionExpiry: true },
    });
    if (village && !isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const newBudgetAmount = budgetAmount
      ? parseFloat(budgetAmount)
      : Number(currentBudget.budgetAmount);
    const realizedAmount = Number(currentBudget.realizedAmount || 0);

    const budget = await prisma.budget.update({
      where: { id: BigInt(id) },
      data: {
        ...(category && { category }),
        ...(subCategory && { subCategory }),
        ...(budgetAmount && { budgetAmount: newBudgetAmount }),
        ...(status && { status }),
        remainingAmount: newBudgetAmount - realizedAmount,
      },
    });

    return NextResponse.json({
      success: true,
      data: toJSONSafe(budget),
      message: "Anggaran berhasil diupdate",
    });
  } catch (err) {
    console.error("PUT /api/finance/budgets error:", err);
    return NextResponse.json(
      { error: "Gagal mengupdate anggaran" },
      { status: 500 },
    );
  }
}
