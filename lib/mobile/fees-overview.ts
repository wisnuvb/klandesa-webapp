import { prisma } from "@/lib/prisma";
import { withStatus } from "./fees";
import { buildOverview } from "./fees-overview-logic";

/** Rekap iuran satu desa untuk satu periode (dashboard web, hanya baca). */
export async function loadVillageFeeOverview(villageId: number, period: string, now = new Date()) {
  const schedules = await prisma.feeSchedule.findMany({
    where: { villageId },
    select: { id: true, scope: true, rt: true, rw: true, dueDay: true },
    take: 2000,
  });
  const ids = schedules.map((s) => s.id);
  const [periodCharges, allCharges, cash] = await Promise.all([
    ids.length ? prisma.feeCharge.findMany({ where: { villageId, scheduleId: { in: ids }, period }, take: 20000 }) : Promise.resolve([]),
    ids.length ? prisma.feeCharge.findMany({ where: { villageId, scheduleId: { in: ids } }, select: { id: true, scheduleId: true }, take: 100000 }) : Promise.resolve([]),
    prisma.cashEntry.findMany({ where: { villageId }, select: { scope: true, rt: true, rw: true, type: true, amount: true, voidedAt: true }, take: 50000 }),
  ]);
  const withSt = await withStatus(periodCharges, new Map(schedules.map((s) => [s.id, s.dueDay])), now);

  const scheduleOfCharge = new Map(allCharges.map((c) => [c.id, c.scheduleId]));
  const pays = allCharges.length
    ? await prisma.feePayment.groupBy({
        by: ["chargeId", "status"],
        where: { villageId, status: { in: ["confirmed", "pending"] }, chargeId: { in: allCharges.map((c) => c.id) } },
        _sum: { amount: true },
        _count: { _all: true },
      })
    : [];
  const confirmed = new Map<number, number>();
  const pending = new Map<number, number>();
  for (const p of pays) {
    const sid = scheduleOfCharge.get(p.chargeId);
    if (sid == null) continue;
    if (p.status === "confirmed") confirmed.set(sid, (confirmed.get(sid) ?? 0) + (p._sum.amount ?? 0));
    else pending.set(sid, (pending.get(sid) ?? 0) + p._count._all);
  }
  const ov = buildOverview(
    schedules,
    withSt.map((c) => ({ scheduleId: c.scheduleId, amount: c.amount, status: c.status, confirmed: c.confirmed })),
    cash.map((c) => ({ scope: c.scope, rt: c.rt, rw: c.rw, type: c.type, amount: c.amount, voided: c.voidedAt != null })),
    confirmed,
    pending,
  );
  return { period, ...ov };
}
