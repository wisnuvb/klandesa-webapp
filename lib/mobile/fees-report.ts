import { prisma } from "@/lib/prisma";
import { scheduleScope, withStatus, type FeeActor } from "./fees";
import { cashBalance, summarize, type SummaryRow } from "./fees-logic";

/** Filter entri kas untuk cakupan pelaku. */
export function cashScope(a: Pick<FeeActor, "kind" | "villageId" | "rt" | "rw">) {
  return a.kind === "rt" ? { villageId: a.villageId, scope: "rt", rt: a.rt, rw: a.rw } : { villageId: a.villageId, scope: "desa" };
}

/** Rekap penagihan satu periode + saldo kas seluruh waktu untuk cakupan. */
export async function loadSummary(a: FeeActor, period: string, now = new Date()) {
  const schedules = await prisma.feeSchedule.findMany({ where: scheduleScope(a), select: { id: true, dueDay: true } });
  const ids = schedules.map((s) => s.id);
  const [periodCharges, allCharges, cash] = await Promise.all([
    prisma.feeCharge.findMany({ where: { villageId: a.villageId, scheduleId: { in: ids }, period } }),
    prisma.feeCharge.findMany({ where: { villageId: a.villageId, scheduleId: { in: ids } }, select: { id: true } }),
    prisma.cashEntry.findMany({ where: cashScope(a), select: { type: true, amount: true, voidedAt: true } }),
  ]);
  const withSt = await withStatus(periodCharges, new Map(schedules.map((s) => [s.id, s.dueDay])), now);
  const rows: SummaryRow[] = withSt.map((c) => ({ amount: c.amount, status: c.status, confirmed: c.confirmed }));
  const feesAll = allCharges.length
    ? await prisma.feePayment.aggregate({ where: { villageId: a.villageId, status: "confirmed", chargeId: { in: allCharges.map((c) => c.id) } }, _sum: { amount: true } })
    : { _sum: { amount: 0 } };
  const pendingClaims = allCharges.length
    ? await prisma.feePayment.count({ where: { villageId: a.villageId, status: "pending", chargeId: { in: allCharges.map((c) => c.id) } } })
    : 0;
  return {
    period,
    summary: summarize(rows),
    balance: cashBalance({ feesConfirmed: feesAll._sum.amount ?? 0, cash: cash.map((c) => ({ type: c.type, amount: c.amount, voided: c.voidedAt != null })) }),
    pendingClaims,
  };
}
