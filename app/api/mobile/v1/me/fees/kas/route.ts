import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { getCitizenResident } from "@/lib/mobile/citizen-data";
import { listActiveRts } from "@/lib/mobile/rt";
import { loadSummary } from "@/lib/mobile/fees-report";
import { cashScope } from "@/lib/mobile/fees-report";
import { currentPeriod } from "@/lib/mobile/fees-logic";
import { residentInScope } from "@/lib/mobile/rt-logic";

/**
 * Transparansi kas RT untuk warga RT itu: saldo, rekap bulan ini (angka total, tanpa nama pembayar),
 * dan pengeluaran 90 hari terakhir. Hanya bila RT punya Ketua RT aktif.
 */
export async function GET(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const me = await getCitizenResident(ctx);
  if (!me) return mobileError("FORBIDDEN", "Akses ditolak.", 403);
  const loc = await prisma.resident.findUnique({ where: { id: me.id }, select: { rt: true, rw: true } });
  const officer = (await listActiveRts(ctx.villageId)).find((o) => o.rt && residentInScope(loc ?? { rt: null, rw: null }, { rt: o.rt, rw: o.rw }));
  if (!officer?.rt) return NextResponse.json({ available: false });

  const actor = { kind: "rt" as const, villageId: ctx.villageId, villageCode: ctx.village.code, byType: "rt" as const, byId: 0, name: "", rt: officer.rt, rw: officer.rw };
  const sum = await loadSummary(actor, currentPeriod(new Date()));
  const since = new Date(Date.now() - 90 * 24 * 3600 * 1000);
  const expenses = await prisma.cashEntry.findMany({ where: { ...cashScope(actor), voidedAt: null, type: "out", entryDate: { gte: since } }, orderBy: { entryDate: "desc" }, take: 30 });
  return NextResponse.json({
    available: true, rt: officer.rt, rw: officer.rw, period: sum.period,
    collectionPercent: sum.summary.collectionPercent, billed: sum.summary.billed, collected: sum.summary.collected,
    balance: sum.balance.balance, income: sum.balance.income, expense: sum.balance.expense,
    expenses: expenses.map((e) => ({ id: e.id, amount: e.amount, description: e.description, entryDate: e.entryDate.toISOString().slice(0, 10), hasReceipt: !!e.receiptUrl })),
  });
}
