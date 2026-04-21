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

function toDateString(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toTimeString(date: Date | null) {
  if (!date) return null;
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function parseDateParam(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function mapVillagePlanToTier(plan: string | null | undefined): SubscriptionTier {
  const value = (plan ?? "").toLowerCase();
  if (value === "enterprise") return "TIER_31_50";
  if (value === "profesional" || value === "professional") return "TIER_11_20";
  if (value === "starter") return "TIER_6_10";
  return "FREE";
}

function maxHistoryDaysForTier(tier: SubscriptionTier) {
  if (tier === "FREE") return 7;
  if (tier === "TIER_6_10") return 30;
  if (tier === "TIER_11_20") return 90;
  if (tier === "TIER_21_30") return 180;
  if (tier === "TIER_31_50") return 365;
  return 365;
}

function diffDaysInclusive(from: Date, to: Date) {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

function clampRangeToMaxDays(from: Date, to: Date, maxDays: number) {
  const days = diffDaysInclusive(from, to);
  if (days <= maxDays) return { from, to, clamped: false };
  const newFrom = new Date(startOfDay(to));
  newFrom.setDate(newFrom.getDate() - (maxDays - 1));
  return { from: newFrom, to, clamped: true };
}

function normalizeStatus(status?: string | null) {
  if (!status) return undefined;
  const value = status.toUpperCase();
  if (value === "PRESENT") return "PRESENT";
  if (value === "LATE") return "LATE";
  if (value === "ABSENT") return "ABSENT";
  if (value === "LEAVE") return "LEAVE";
  return undefined;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    const url = new URL(req.url);
    const villageCode = url.searchParams.get("villageCode") ?? undefined;

    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("pageSize") ?? 50))
    );
    const search = url.searchParams.get("search") ?? undefined;
    const status = normalizeStatus(url.searchParams.get("status"));

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
        { status: 404 }
      );
    }
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const tier = mapVillagePlanToTier(village.subscriptionPlan);
    const maxDays = maxHistoryDaysForTier(tier);

    const now = new Date();
    const defaultTo = startOfDay(now);
    const defaultFrom = new Date(defaultTo);
    defaultFrom.setDate(defaultFrom.getDate() - 6);

    const rawFrom = parseDateParam(url.searchParams.get("from"));
    const rawTo = parseDateParam(url.searchParams.get("to"));

    const from = startOfDay(rawFrom ?? defaultFrom);
    const to = startOfDay(rawTo ?? defaultTo);

    const normalized = from <= to ? { from, to } : { from: to, to: from };
    const clamped = clampRangeToMaxDays(normalized.from, normalized.to, maxDays);

    const where: {
      villageId: number;
      attendanceDate: { gte: Date; lte: Date };
      status?: AttendanceStatus;
      official?: {
        name?: { contains: string; mode: "insensitive" };
        position?: { name?: { contains: string; mode: "insensitive" } };
      };
    } = {
      villageId: village.id,
      attendanceDate: { gte: startOfDay(clamped.from), lte: endOfDay(clamped.to) },
    };

    if (status) where.status = status as AttendanceStatus;
    if (search) {
      where.official = {
        name: { contains: search, mode: "insensitive" },
      };
    }

    const [rows, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          official: { include: { position: true } },
          shift: true,
        },
        orderBy: [{ attendanceDate: "desc" }, { checkInAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.attendance.count({ where }),
    ]);

    const mapped = rows.map((a) => ({
      id: String(a.id),
      user_id: a.officialId,
      user_name: a.official.name,
      user_photo: a.official.photoUrl ?? null,
      position: a.official.position?.name ?? "-",
      attendance_date: toDateString(startOfDay(a.attendanceDate)),
      check_in_time: toTimeString(a.checkInAt ?? null),
      check_out_time: toTimeString(a.checkOutAt ?? null),
      status: a.status as AttendanceStatus,
      check_in_method: (a.checkInMethod ?? null) as CheckInMethod | null,
      shift_name: a.shift?.name ?? null,
      notes: a.notes ?? null,
    }));

    return NextResponse.json({
      rows: mapped,
      total,
      page,
      pageSize,
      range: {
        from: toDateString(startOfDay(clamped.from)),
        to: toDateString(startOfDay(clamped.to)),
        clamped: clamped.clamped,
        maxDays,
      },
      plan: { tier },
    });
  } catch (error) {
    console.error("GET /api/attendance/history error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
