import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { getCitizenResident } from "@/lib/mobile/citizen-data";
import { categoryLabel, withStatus } from "@/lib/mobile/fees";
import { addPeriods, CHARGE_STATUS_LABEL, currentPeriod } from "@/lib/mobile/fees-logic";

/** Tagihan KK saya (12 bulan terakhir). Hanya KK yang sama dengan akun; tidak pernah menerima KK dari klien. */
export async function GET(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const me = await getCitizenResident(loaded.ctx);
  if (!me) return mobileError("FORBIDDEN", "Akses ditolak.", 403);
  if (!me.kk) return NextResponse.json({ items: [], outstanding: 0, hint: "Nomor KK Anda belum tercatat di desa, jadi belum ada tagihan." });

  const since = addPeriods(currentPeriod(new Date()), -11);
  const charges = await prisma.feeCharge.findMany({
    where: { villageId: loaded.ctx.villageId, kk: me.kk, period: { gte: since } },
    orderBy: [{ period: "desc" }, { id: "desc" }], take: 100,
  });
  const schedules = await prisma.feeSchedule.findMany({ where: { id: { in: [...new Set(charges.map((c) => c.scheduleId))] }, villageId: loaded.ctx.villageId } });
  const sBy = new Map(schedules.map((s) => [s.id, s]));
  const withSt = await withStatus(charges, new Map(schedules.map((s) => [s.id, s.dueDay])));
  const items = withSt.map((c) => {
    const s = sBy.get(c.scheduleId);
    return {
      id: c.id, scheduleName: s?.name ?? "Iuran", categoryLabel: categoryLabel(s?.category ?? "lainnya"), scope: s?.scope ?? "rt",
      period: c.period, amount: c.amount, confirmed: c.confirmed, pending: c.pending, outstanding: c.outstanding,
      status: c.status, statusLabel: CHARGE_STATUS_LABEL[c.status], dueDate: c.dueDate, waivedReason: c.waivedReason,
      payInfo: s?.payInfo ?? null, payQrUrl: s?.payQrUrl ?? null,
    };
  });
  return NextResponse.json({ items, outstanding: items.filter((i) => i.status !== "waived").reduce((n, i) => n + Math.max(0, i.outstanding - i.pending), 0) });
}
