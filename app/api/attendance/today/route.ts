import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { staffLimitForTier } from "@/lib/attendance/capacity";
import {
  effectiveAttendanceTier,
  isGpsAddonActive,
  listCapacityOptions,
} from "@/lib/attendance/addons";
import { getActiveCapacityAddon } from "@/lib/attendance/capacity-server";
import { BILLING_CATALOG } from "@/lib/billing/catalog";

type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "LEAVE";
type CheckInMethod = "QR" | "GPS";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function toTimeString(date: Date | null) {
  if (!date) return null;
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function toDateString(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, session } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    const activeOfficials = await prisma.official.findMany({
      where: { villageId: village.id, status: "active" },
      include: { position: true },
      orderBy: [{ position: { level: "asc" } }, { name: "asc" }],
    });

    const capacityAddon = await getActiveCapacityAddon(village.id);
    const tier = effectiveAttendanceTier(village.subscriptionPlan, capacityAddon);
    const staffLimit = staffLimitForTier(tier);
    const totalStaff = activeOfficials.length;
    const isOverLimit = totalStaff > staffLimit;
    const visibleOfficials = isOverLimit
      ? activeOfficials.slice(0, staffLimit)
      : activeOfficials;

    const attendanceRows = await prisma.attendance.findMany({
      where: {
        villageId: village.id,
        attendanceDate: { gte: todayStart, lte: todayEnd },
        officialId: { in: visibleOfficials.map((o) => o.id) },
      },
      orderBy: { officialId: "asc" },
    });

    const attendanceByOfficialId = new Map<
      number,
      (typeof attendanceRows)[number]
    >(attendanceRows.map((a) => [a.officialId, a]));

    const rows = visibleOfficials.map((o) => {
      const attendance = attendanceByOfficialId.get(o.id) ?? null;
      const status = (attendance?.status ?? "ABSENT") as AttendanceStatus;
      const checkInMethod = (attendance?.checkInMethod ??
        null) as CheckInMethod | null;

      return {
        id: attendance ? Number(attendance.id) : -o.id,
        user_id: o.id,
        user_name: o.name,
        user_photo: o.photoUrl ?? null,
        position: o.position?.name ?? "-",
        attendance_date: toDateString(todayStart),
        check_in_time: toTimeString(attendance?.checkInAt ?? null),
        check_out_time: toTimeString(attendance?.checkOutAt ?? null),
        status,
        check_in_method: checkInMethod,
        location_lat: attendance?.locationLat ?? null,
        location_lng: attendance?.locationLng ?? null,
        notes: attendance?.notes ?? null,
      };
    });

    const present = rows.filter((r) => r.status === "PRESENT").length;
    const late = rows.filter((r) => r.status === "LATE").length;
    const absent = rows.filter(
      (r) => r.status === "ABSENT" || r.status === "LEAVE",
    ).length;

    const role = String(session?.user?.role ?? "");
    const canManageGpsOffice = role === "admin" || role === "village_head";

    return NextResponse.json({
      rows,
      stats: {
        totalStaff,
        staffLimit,
        isOverLimit,
        present,
        late,
        absent,
        hiddenCount: isOverLimit ? totalStaff - staffLimit : 0,
      },
      plan: {
        tier,
        subscriptionPlan: village.subscriptionPlan,
        subscriptionStatus: village.subscriptionStatus,
      },
      capacity: {
        addon: capacityAddon
          ? { code: capacityAddon.code, expiresAt: capacityAddon.expiresAt.toISOString() }
          : null,
        options: listCapacityOptions(village.subscriptionPlan, capacityAddon),
      },
      gpsAddon: {
        active: isGpsAddonActive(village),
        expiresAt: village.absensiGpsAddonExpiry?.toISOString() ?? null,
        monthlyFee: BILLING_CATALOG.absensi_gps_addon.monthlyFee,
        officeLat: village.absensiOfficeLat ?? null,
        officeLng: village.absensiOfficeLng ?? null,
        radiusMeters: village.absensiCheckInRadiusMeters,
        officeConfigured:
          village.absensiOfficeLat != null && village.absensiOfficeLng != null,
      },
      canManageGpsOffice,
    });
  } catch (error) {
    console.error("GET /api/attendance/today error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
