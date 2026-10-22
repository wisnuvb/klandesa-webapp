import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileContext } from "@/lib/mobile/context";
import { STATUS_LABEL } from "@/lib/mobile/attendance-logic";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Status absensi saya hari ini + metode yang tersedia + rekan hari ini. */
export async function GET(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["staff"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const day = startOfDay(new Date());

  const [user, village, shift] = await Promise.all([
    prisma.user.findUnique({ where: { id: ctx.accountId }, select: { email: true } }),
    prisma.village.findUnique({
      where: { id: ctx.villageId },
      select: { absensiGpsAddonActive: true, absensiOfficeLat: true, absensiOfficeLng: true, absensiCheckInRadiusMeters: true },
    }),
    prisma.workShift.findFirst({ where: { villageId: ctx.villageId, isActive: true }, orderBy: { id: "asc" } }),
  ]);

  const officials = await prisma.official.findMany({
    where: { villageId: ctx.villageId, status: "active" },
    include: { position: { select: { name: true } } },
    orderBy: { name: "asc" },
    take: 200,
  });
  const email = (user?.email ?? "").trim().toLowerCase();
  const me = officials.find((o) => (o.email ?? "").trim().toLowerCase() === email) ?? null;

  const rows = await prisma.attendance.findMany({
    where: { villageId: ctx.villageId, attendanceDate: day, officialId: { in: officials.map((o) => o.id) } },
  });
  const byOfficial = new Map(rows.map((a) => [a.officialId, a]));
  const mine = me ? byOfficial.get(me.id) : null;

  return NextResponse.json({
    linked: !!me,
    linkHint: me ? null : "Email akun Anda belum cocok dengan data perangkat desa. Minta admin menyamakan email di menu Data Perangkat Desa.",
    me: me ? { name: me.name, position: me.position?.name ?? null } : null,
    today: mine?.checkInAt ? { checkInAt: mine.checkInAt, status: mine.status, statusLabel: STATUS_LABEL[mine.status] ?? mine.status, method: mine.checkInMethod } : null,
    methods: {
      qr: true,
      gps: !!village?.absensiGpsAddonActive && village.absensiOfficeLat != null && village.absensiOfficeLng != null,
      gpsInactiveReason: !village?.absensiGpsAddonActive ? "Absensi GPS belum diaktifkan desa." : village.absensiOfficeLat == null ? "Lokasi kantor belum diatur admin." : null,
      radiusMeters: village?.absensiCheckInRadiusMeters ?? null,
    },
    shift: shift ? { name: shift.name, start: shift.startTime, end: shift.endTime, tolerance: shift.lateToleranceMinutes } : null,
    team: officials.map((o) => {
      const a = byOfficial.get(o.id);
      const status = a?.checkInAt ? a.status : "ABSENT";
      return { id: o.id, name: o.name, position: o.position?.name ?? null, status, statusLabel: STATUS_LABEL[status] ?? status, checkInAt: a?.checkInAt ?? null };
    }),
  });
}
