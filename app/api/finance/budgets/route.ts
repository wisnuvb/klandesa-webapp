import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/auth";
import { getToken } from "next-auth/jwt";
import { toJSONSafe } from "@/utils/json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveVillage(session: any, token?: any) {
  if (session?.user?.villageCode) {
    const v = await prisma.village.findUnique({
      where: { code: session.user.villageCode },
    });
    if (v) return v;
  }
  if (token?.villageCode) {
    const v = await prisma.village.findUnique({
      where: { code: token.villageCode },
    });
    if (v) return v;
  }
  const defaultCode = process.env.DEFAULT_VILLAGE_CODE;
  if (defaultCode) {
    const v = await prisma.village.findUnique({ where: { code: defaultCode } });
    if (v) return v;
  }
  return prisma.village.findFirst({ orderBy: { id: "asc" } });
}

function generateBudgetCode(category: string, year: number) {
  const prefix = category.substring(0, 3).toUpperCase();
  const random = Math.floor(Math.random() * 999)
    .toString()
    .padStart(3, "0");
  return `${prefix}-${year}-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const apiKeyHeader = req.headers.get("x-api-key");
    const validApiKey = process.env.FINANCE_API_KEY;
    if (!session?.user && !token?.id) {
      if (!validApiKey || apiKeyHeader !== validApiKey) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const village = await resolveVillage(session, token);
    if (!village) {
      return NextResponse.json(
        { error: "Tidak ada desa yang tersedia" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { year, category, subCategory, budgetAmount, description } = body;

    if (!year || !category || !subCategory || !budgetAmount) {
      return NextResponse.json(
        { error: "Field yang diperlukan tidak lengkap" },
        { status: 400 }
      );
    }

    const budgetCode = generateBudgetCode(category, year);

    const budget = await prisma.budget.create({
      data: {
        villageId: village.id,
        budgetCode,
        year: parseInt(year),
        category,
        subCategory,
        description: description || `Anggaran ${category} - ${subCategory}`,
        budgetAmount: parseFloat(budgetAmount),
        realizedAmount: 0,
        remainingAmount: parseFloat(budgetAmount),
        status: "active",
        createdBy:
          parseInt((session?.user?.id as string) || (token?.id as string)) || 1,
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
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!session?.user && !token?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, category, subCategory, budgetAmount, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID anggaran diperlukan" },
        { status: 400 }
      );
    }

    const currentBudget = await prisma.budget.findUnique({
      where: { id: BigInt(id) },
    });

    if (!currentBudget) {
      return NextResponse.json(
        { error: "Anggaran tidak ditemukan" },
        { status: 404 }
      );
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
      { status: 500 }
    );
  }
}
