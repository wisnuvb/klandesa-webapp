import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/mobile/staff";
import { loadAccountability } from "@/lib/mobile/accountability-data";
import { trendOf } from "@/lib/mobile/accountability-logic";

/** Rapor layanan desa ini (90 hari terakhir) dibanding 90 hari sebelumnya. Hanya agregat. */
export async function GET(req: NextRequest) {
  const g = await requireStaff(req, "statistics", "read");
  if (!g.ok) return g.response;
  const { items } = await loadAccountability([g.ctx.villageId], { withPrevious: true });
  const it = items[0]!;
  const cur = it.current;
  const prev = it.previous!;
  return NextResponse.json({
    windowDays: 90,
    current: cur,
    previous: prev,
    trends: {
      mailMedianHours: trendOf(cur.mail.medianHours, prev.mail.medianHours, false),
      mailWithinSla: trendOf(cur.mail.withinSlaPercent, prev.mail.withinSlaPercent, true),
      reportsInTime: trendOf(cur.reports.respondedInTimePercent, prev.reports.respondedInTimePercent, true),
      reportsResolved: trendOf(cur.reports.resolvedPercent, prev.reports.resolvedPercent, true),
    },
  });
}
