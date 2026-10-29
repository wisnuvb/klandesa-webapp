import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeeActor, scheduleScope } from "@/lib/mobile/fees";

/** Laporan "sudah bayar" dari warga yang menunggu dicek (terlama dulu). */
export async function GET(req: NextRequest) {
  const g = await requireFeeActor(req, "read");
  if (!g.ok) return g.response;
  const a = g.actor;
  const schedules = await prisma.feeSchedule.findMany({ where: scheduleScope(a), select: { id: true, name: true } });
  const charges = await prisma.feeCharge.findMany({ where: { villageId: a.villageId, scheduleId: { in: schedules.map((s) => s.id) } }, select: { id: true, scheduleId: true, headName: true, period: true, amount: true } });
  const byId = new Map(charges.map((c) => [c.id, c]));
  const sName = new Map(schedules.map((s) => [s.id, s.name]));
  const pays = await prisma.feePayment.findMany({ where: { villageId: a.villageId, status: "pending", chargeId: { in: charges.map((c) => c.id) } }, orderBy: { createdAt: "asc" }, take: 200 });
  return NextResponse.json({
    items: pays.map((p) => {
      const c = byId.get(p.chargeId)!;
      return { id: p.id, scheduleName: sName.get(c.scheduleId) ?? "", headName: c.headName, period: c.period, chargeAmount: c.amount, amount: p.amount, method: p.method, proofUrl: p.proofUrl, note: p.note, createdAt: p.createdAt };
    }),
  });
}
