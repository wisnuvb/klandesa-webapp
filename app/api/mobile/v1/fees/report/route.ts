import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { requireFeeActor, scheduleScope, withStatus } from "@/lib/mobile/fees";
import { cashScope } from "@/lib/mobile/fees-report";
import { CHARGE_STATUS_LABEL, currentPeriod, isPeriod, toCsv } from "@/lib/mobile/fees-logic";

/** Ekspor CSV satu periode: tagihan per KK dan buku kas. Rumus spreadsheet dinetralkan. */
export async function GET(req: NextRequest) {
  const g = await requireFeeActor(req, "read");
  if (!g.ok) return g.response;
  const a = g.actor;
  const period = req.nextUrl.searchParams.get("period") ?? currentPeriod(new Date());
  if (!isPeriod(period)) return mobileError("INVALID_REQUEST", "Periode tidak valid.", 400);

  const schedules = await prisma.feeSchedule.findMany({ where: scheduleScope(a), select: { id: true, name: true, dueDay: true } });
  const charges = await prisma.feeCharge.findMany({ where: { villageId: a.villageId, period, scheduleId: { in: schedules.map((s) => s.id) } }, orderBy: { headName: "asc" }, take: 5000 });
  const st = await withStatus(charges, new Map(schedules.map((s) => [s.id, s.dueDay])));
  const names = new Map(schedules.map((s) => [s.id, s.name]));
  const [y, m] = [Number(period.slice(0, 4)), Number(period.slice(5, 7))];
  const cash = await prisma.cashEntry.findMany({ where: { ...cashScope(a), voidedAt: null, entryDate: { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) } }, orderBy: { entryDate: "asc" } });

  const fees = toCsv(["Iuran", "Kepala KK", "Periode", "Tagihan", "Terbayar", "Sisa", "Status"], st.map((c) => [names.get(c.scheduleId), c.headName, c.period, c.amount, c.confirmed, c.outstanding, CHARGE_STATUS_LABEL[c.status]]));
  const book = toCsv(["Tanggal", "Jenis", "Kategori", "Keterangan", "Nominal"], cash.map((c) => [c.entryDate.toISOString().slice(0, 10), c.type === "in" ? "Masuk" : "Keluar", c.category, c.description, c.amount]));
  return new NextResponse(`TAGIHAN ${period}\r\n${fees}\r\nBUKU KAS ${period}\r\n${book}`, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="iuran-${period}.csv"`, "Cache-Control": "no-store" },
  });
}
