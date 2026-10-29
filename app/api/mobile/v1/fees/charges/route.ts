import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { requireFeeActor, scheduleScope, withStatus, ensureCharges } from "@/lib/mobile/fees";
import { CHARGE_STATUS_LABEL, currentPeriod, isPeriod } from "@/lib/mobile/fees-logic";

/** Tagihan dalam cakupan pelaku. `?period=YYYY-MM` (bawaan bulan ini), `?scheduleId=`, `?status=`. */
export async function GET(req: NextRequest) {
  const g = await requireFeeActor(req, "read");
  if (!g.ok) return g.response;
  const a = g.actor;
  const q = req.nextUrl.searchParams;
  const period = q.get("period") ?? currentPeriod(new Date());
  if (!isPeriod(period)) return mobileError("INVALID_REQUEST", "Periode tidak valid.", 400);
  const scheduleId = q.get("scheduleId") ? Number(q.get("scheduleId")) : null;
  if (scheduleId !== null && !Number.isInteger(scheduleId)) return mobileError("INVALID_REQUEST", "Jadwal tidak valid.", 400);

  const schedules = await prisma.feeSchedule.findMany({ where: { ...scheduleScope(a), ...(scheduleId ? { id: scheduleId } : {}) }, select: { id: true, name: true, dueDay: true, isActive: true, villageId: true, scope: true, rt: true, rw: true, amount: true, recurrence: true, startPeriod: true, endPeriod: true, category: true } });
  await Promise.all(schedules.filter((s) => s.isActive).map((s) => ensureCharges(s)));
  const charges = await prisma.feeCharge.findMany({ where: { villageId: a.villageId, period, scheduleId: { in: schedules.map((s) => s.id) } }, orderBy: [{ headName: "asc" }], take: 2000 });
  const withSt = await withStatus(charges, new Map(schedules.map((s) => [s.id, s.dueDay])));
  const names = new Map(schedules.map((s) => [s.id, s.name]));
  const only = q.get("status");
  return NextResponse.json({
    period,
    items: withSt.filter((c) => !only || c.status === only).map((c) => ({
      id: c.id, scheduleId: c.scheduleId, scheduleName: names.get(c.scheduleId) ?? "", headName: c.headName, amount: c.amount,
      confirmed: c.confirmed, pending: c.pending, outstanding: c.outstanding, status: c.status, statusLabel: CHARGE_STATUS_LABEL[c.status],
      dueDate: c.dueDate, waivedReason: c.waivedReason,
    })),
  });
}
