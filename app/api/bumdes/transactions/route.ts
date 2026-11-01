import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { toJSONSafe } from "@/utils/json";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { bumdesScope } from "@/lib/bumdes/api-context";
import { createCashTransaction, legacyCount } from "@/lib/bumdes/service";
import { isAddonActive, bumdesLimit } from "@/lib/modules/resource-limits";
import { loadActiveModuleSubs } from "@/lib/modules/require-module";

/** Daftar transaksi kas (aktif dan dibatalkan; yang dibatalkan tetap tampil dengan statusnya). ?unitId= menyaring satu unit. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/bumdes/transactions", "Gagal memuat transaksi", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const s = await bumdesScope(guard.ctx);
    if (!s.ok) return s.response;
    const unitIdParam = req.nextUrl.searchParams.get("unitId");
    const unitId = unitIdParam && /^\d{1,10}$/.test(unitIdParam) ? Number(unitIdParam) : undefined;
    const { village } = s.ctx;
    const [addons, allEntries, legacy] = await Promise.all([
      loadActiveModuleSubs(village.id),
      prisma.bumdesTransaction.findMany({
        where: { bumdesId: s.bumdes.id, ...(unitId ? { unitId } : {}) },
        orderBy: [{ entryDate: "desc" }, { id: "desc" }],
        include: { unit: { select: { id: true, name: true, category: true } }, createdUser: { select: { id: true, name: true } } },
        take: 1000,
      }),
      legacyCount(prisma, s.bumdes.id),
    ]);
    const hasAddon = isAddonActive("bumdes", addons);
    const limit = bumdesLimit(village.subscriptionPlan, village.subscriptionStatus, hasAddon);
    const cap = limit?.transactions ?? null;
    const isOverLimit = cap !== null && allEntries.length > cap;
    const entries = cap !== null ? allEntries.slice(0, cap) : allEntries;
    return NextResponse.json({
      success: true,
      data: toJSONSafe(entries),
      limit: cap,
      total: allEntries.length,
      hiddenCount: isOverLimit ? allEntries.length - cap! : 0,
      isOverLimit,
      legacyUnjournaled: legacy,
    });
  });
}

/** Mencatat transaksi kas: { unitId, entryDate, direction, amount, category, description?, accountCode?, cashAccountCode? }. Jurnal berpasangan dibuat otomatis. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/bumdes/transactions", "Gagal mencatat transaksi", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const s = await bumdesScope(guard.ctx, { write: true });
    if (!s.ok) return s.response;
    const { ctx } = s;
    const village = ctx.village;
    const [addonsPost, txCount] = await Promise.all([loadActiveModuleSubs(village.id), prisma.bumdesTransaction.count({ where: { bumdesId: s.bumdes.id } })]);
    const postLimit = bumdesLimit(village.subscriptionPlan, village.subscriptionStatus, isAddonActive("bumdes", addonsPost));
    if (postLimit !== null && txCount >= postLimit.transactions) {
      return NextResponse.json({ error: "RESOURCE_LIMIT_REACHED", limit: postLimit.transactions, current: txCount, module: "bumdes", billingUrl: "/billing?module=bumdes" }, { status: 402 });
    }
    const input = await req.json().catch(() => null);
    const r = await createCashTransaction(prisma, { bumdesId: s.bumdes.id, userId: ctx.userId, input });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "bumdes_transactions", r.data.id, { journalId: r.data.journalId });
    return NextResponse.json({ success: true, id: r.data.id, journalId: r.data.journalId, message: "Transaksi dicatat" });
  });
}
