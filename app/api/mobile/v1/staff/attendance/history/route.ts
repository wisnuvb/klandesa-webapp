import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { monthRange, STATUS_LABEL, summarizeMonth } from "@/lib/mobile/attendance-logic";

/** Riwayat absensi saya per bulan (`?month=YYYY-MM`, default bulan ini). */
export async function GET(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["staff"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const now = new Date();
  const ym = req.nextUrl.searchParams.get("month") ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const range = monthRange(ym);
  if (!range) return mobileError("INVALID_REQUEST", "Format bulan harus YYYY-MM.", 400);

  const user = await prisma.user.findUnique({ where: { id: ctx.accountId }, select: { email: true } });
  const email = (user?.email ?? "").trim().toLowerCase();
  const official = (await prisma.official.findMany({ where: { villageId: ctx.villageId, status: "active", email: { not: null } }, select: { id: true, email: true }, take: 200 }))
    .find((o) => (o.email ?? "").trim().toLowerCase() === email);
  if (!official) return NextResponse.json({ month: ym, linked: false, summary: { present: 0, late: 0, leave: 0, total: 0 }, items: [] });

  const rows = await prisma.attendance.findMany({
    where: { villageId: ctx.villageId, officialId: official.id, attendanceDate: { gte: range.from, lt: range.to } },
    orderBy: { attendanceDate: "desc" },
  });
  return NextResponse.json({
    month: ym, linked: true, summary: summarizeMonth(rows),
    items: rows.map((a) => ({ date: a.attendanceDate, checkInAt: a.checkInAt, status: a.status, statusLabel: STATUS_LABEL[a.status] ?? a.status, method: a.checkInMethod })),
  });
}
