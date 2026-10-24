import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { readVillageInfoSettings, summarizeBudget } from "@/lib/mobile/village-info-logic";

/**
 * Transparansi Dana Desa: hanya agregat per kategori (tanpa transaksi mentah) dan hanya bila desa
 * menyalakan `budgetPublic`. Tanpa itu respons `enabled: false` agar app menampilkan pesan ramah.
 */
export async function GET(req: NextRequest) {
  const loaded = await requireMobileContext(req);
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;

  const village = await prisma.village.findUnique({ where: { id: ctx.villageId }, select: { settings: true } });
  if (!readVillageInfoSettings(village?.settings).budgetPublic) {
    return NextResponse.json({ enabled: false, year: null, years: [], summary: null });
  }

  const rawYear = req.nextUrl.searchParams.get("year");
  let year: number | null = null;
  if (rawYear !== null) {
    year = Number(rawYear);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return mobileError("INVALID_REQUEST", "Tahun tidak valid.", 400);
  }

  const yearRows = await prisma.budget.groupBy({
    by: ["year"],
    where: { villageId: ctx.villageId, status: { not: "cancelled" } },
    orderBy: { year: "desc" },
  });
  const years = yearRows.map((r) => r.year);
  const selected = year ?? years[0] ?? null;
  if (selected === null) return NextResponse.json({ enabled: true, year: null, years, summary: null });

  const rows = await prisma.budget.findMany({
    where: { villageId: ctx.villageId, year: selected, status: { not: "cancelled" } },
    select: { category: true, budgetAmount: true, realizedAmount: true },
  });
  const summary = summarizeBudget(rows.map((r) => ({ category: r.category, budgetAmount: Number(r.budgetAmount), realizedAmount: Number(r.realizedAmount) })));
  return NextResponse.json({ enabled: true, year: selected, years, summary });
}
