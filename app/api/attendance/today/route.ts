import { getApiSession } from "@/lib/api-session";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

type SubscriptionTier =
  | "FREE"
  | "TIER_6_10"
  | "TIER_11_20"
  | "TIER_21_30"
  | "TIER_31_50"
  | "CUSTOM";

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

function mapVillagePlanToTier(
  plan: string | null | undefined,
): SubscriptionTier {
  const value = (plan ?? "").toLowerCase();
  if (value === "enterprise") return "TIER_31_50";
  if (value === "profesional" || value === "professional") return "TIER_11_20";
  if (value === "starter") return "TIER_6_10";
  return "FREE";
}

function staffLimitForTier(tier: SubscriptionTier) {
  if (tier === "FREE") return 5;
  if (tier === "TIER_6_10") return 10;
  if (tier === "TIER_11_20") return 20;
  if (tier === "TIER_21_30") return 30;
  if (tier === "TIER_31_50") return 50;
  return 50;
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
    const session = await getApiSession(req);
    const url = new URL(req.url);
    const villageCode = url.searchParams.get("villageCode") ?? undefined;

    const village = await resolveVillage({
      req,
      queryVillageCode: villageCode,
      session,
    });

    if (!village) {
      return NextResponse.json(
        {
          error:
            "Tidak ada desa yang tersedia. Login terlebih dahulu atau atur DEFAULT_VILLAGE_CODE di env.",
        },
        { status: 404 },
      );
    }
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

    const tier = mapVillagePlanToTier(village.subscriptionPlan);
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
      gpsAddon: {
        active: village.absensiGpsAddonActive,
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
