import { getApiSession } from "@/lib/api-session";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash, timingSafeEqual } from "node:crypto";
import { toJSONSafe } from "@/utils/json";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { requireVillagePermissionResponse } from "@/lib/access-policy";
import { resolveFinanceWriteVillage } from "@/lib/finance-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { diffRecord, pickSummary } from "@/lib/audit/diff";

const BUDGET_AUDIT_KEYS = [
  "budgetCode", "year", "category", "subCategory", "description",
  "budgetAmount", "realizedAmount", "remainingAmount", "status",
] as const;

/** Tampilan aman untuk AuditLog: kolom Decimal diubah ke angka agar bisa diserialisasi ke kolom Json. */
function budgetAuditView(b: Record<string, unknown>) {
  return pickSummary(
    {
      ...b,
      budgetAmount: Number(b.budgetAmount),
      realizedAmount: Number(b.realizedAmount),
      remainingAmount: Number(b.remainingAmount),
    },
    BUDGET_AUDIT_KEYS,
  );
}

function generateBudgetCode(category: string, year: number) {
  const prefix = category.substring(0, 3).toUpperCase();
  const random = Math.floor(Math.random() * 999)
    .toString()
    .padStart(3, "0");
  return `${prefix}-${year}-${random}`;
}

function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

/**
 * Siapa yang mengubah anggaran dan di desa mana. Sesi app desa (ketat: izin, akun aktif, langganan) atau `FINANCE_API_KEY`
 * + `villageId` di body. Hanya "tidak ada sesi" (401) yang boleh jatuh ke kunci layanan; penolakan lain berlaku apa adanya,
 * dan tidak ada jalur token JWT yang melewati pemeriksaan izin.
 */
async function resolveBudgetAccess(
  req: NextRequest,
  body: { villageId?: unknown },
): Promise<{ ok: true; villageId: number; userId: number | null } | { ok: false; response: NextResponse }> {
  const loaded = await requireVillageApiContext(req);
  if (loaded.ok) return { ok: true, villageId: loaded.ctx.village.id, userId: loaded.ctx.userId ?? null };
  if (loaded.response.status !== 401) return { ok: false, response: loaded.response };

  const apiKeyHeader = req.headers.get("x-api-key");
  const validApiKey = process.env.FINANCE_API_KEY;
  if (validApiKey && apiKeyHeader && safeEqual(apiKeyHeader, validApiKey)) {
    const vid = Number(body.villageId);
    if (!Number.isInteger(vid)) {
      return { ok: false, response: NextResponse.json({ error: "villageId wajib untuk otentikasi service" }, { status: 400 }) };
    }
    return { ok: true, villageId: vid, userId: null };
  }
  return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
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

    // Panggilan kunci layanan tidak punya pengguna: atribusikan ke admin aktif desa yang sama (bukan pengguna acak/lintas desa).
    let createdBy: number;
    if (creatorIdRaw != null && Number.isFinite(creatorIdRaw)) {
      createdBy = creatorIdRaw;
    } else {
      const fallbackAdmin = await prisma.user.findFirst({
        where: { villageId: village.id, role: "admin", isActive: true },
        orderBy: { id: "asc" },
        select: { id: true },
      });
      if (!fallbackAdmin) {
        return NextResponse.json({ error: "Desa belum memiliki admin aktif untuk atribusi anggaran" }, { status: 422 });
      }
      createdBy = fallbackAdmin.id;
    }

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
        createdBy,
      },
    });

    await auditWeb(
      req,
      { userId: creatorIdRaw ?? null, village },
      "create",
      "budgets",
      budget.id,
      budgetAuditView(budget),
    );

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

    if (!id || !/^\d{1,18}$/.test(String(id))) {
      return NextResponse.json(
        { error: "ID anggaran diperlukan" },
        { status: 400 },
      );
    }

    const access = await resolveBudgetAccess(req, body);
    if (!access.ok) return access.response;

    // Cari hanya di desa pemanggil: anggaran desa lain tampak "tidak ada" (tidak membocorkan keberadaannya).
    const currentBudget = await prisma.budget.findFirst({
      where: { id: BigInt(id), villageId: access.villageId },
    });

    if (!currentBudget) {
      return NextResponse.json(
        { error: "Anggaran tidak ditemukan" },
        { status: 404 },
      );
    }

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

    await auditWeb(
      req,
      { userId: access.userId, village: { id: currentBudget.villageId } },
      "update",
      "budgets",
      budget.id,
      diffRecord(budgetAuditView(currentBudget), budgetAuditView(budget)),
    );

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
