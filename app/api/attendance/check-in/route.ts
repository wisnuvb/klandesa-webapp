import jwt, { JwtPayload } from "jsonwebtoken";
import { getApiSession } from "@/lib/api-session";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRegionalAccount } from "@/lib/regional-session";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { haversineDistanceMeters } from "@/lib/geo/haversine";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function computePresentOrLate(
  now: Date,
  shift: {
    startTime: string;
    lateToleranceMinutes: number;
  },
): "PRESENT" | "LATE" {
  const parts = shift.startTime.split(":").map((x) => parseInt(x, 10));
  const h = parts[0] ?? 8;
  const m = (parts[1] ?? 0) + (shift.lateToleranceMinutes ?? 0);
  const s = parts[2] ?? 0;
  const deadline = startOfDay(now);
  deadline.setHours(h, m, s, 0);
  return now.getTime() > deadline.getTime() ? "LATE" : "PRESENT";
}

type VillageCheckIn = {
  id: number;
  name: string;
  code: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionExpiry: Date | null;
  absensiGpsAddonActive: boolean;
  absensiOfficeLat: number | null;
  absensiOfficeLng: number | null;
  absensiCheckInRadiusMeters: number;
};

async function resolveOfficialForUser(villageId: number, userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, villageId: true },
  });
  if (!user || user.villageId !== villageId) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const email = (user.email ?? "").trim();
  if (!email) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Akun tidak memiliki email; hubungi admin desa." },
        { status: 400 },
      ),
    };
  }

  const officials = await prisma.official.findMany({
    where: {
      villageId,
      status: "active",
      email: { not: null },
    },
    include: { position: { select: { name: true } } },
    take: 200,
  });
  const emailLower = email.toLowerCase();
  const official = officials.find(
    (o) => (o.email ?? "").trim().toLowerCase() === emailLower,
  );

  if (!official) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error:
            "Email akun Anda tidak cocok dengan data perangkat desa. Pastikan email di Profil sama dengan email pada menu Data Perangkat Desa, atau minta admin memperbarui data Anda.",
          code: "OFFICIAL_EMAIL_MISMATCH",
        },
        { status: 400 },
      ),
    };
  }

  return { ok: true as const, user, official };
}

/**
 * Catat absensi masuk: metode QR (token JWT) atau GPS (lat/lng + add-on aktif + radius).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isRegionalAccount(session)) {
      return NextResponse.json(
        { error: "Akun wilayah tidak dapat mencatat absensi desa." },
        { status: 403 },
      );
    }

    const userId = parseInt(String(session.user.id), 10);
    if (!Number.isFinite(userId) || userId <= 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as {
      method?: string;
      token?: string;
      latitude?: number;
      longitude?: number;
    } | null;

    const methodRaw = String(body?.method ?? "").toUpperCase();
    const method = methodRaw === "GPS" ? "GPS" : "QR";

    const secret = process.env.AUTH_SECRET ?? "your-secret-key";

    let villageId: number;
    let village: VillageCheckIn;

    if (method === "QR") {
      const token = typeof body?.token === "string" ? body.token.trim() : "";
      if (!token) {
        return NextResponse.json({ error: "Token QR wajib diisi" }, { status: 400 });
      }

      let payload: JwtPayload;
      try {
        payload = jwt.verify(token, secret) as JwtPayload;
      } catch {
        return NextResponse.json(
          { error: "QR kedaluwarsa atau tidak valid. Minta QR baru dari admin desa." },
          { status: 400 },
        );
      }

      if (payload.type !== "ATTENDANCE_QR") {
        return NextResponse.json({ error: "Token tidak valid" }, { status: 400 });
      }

      const vid = Number(payload.villageId);
      if (!Number.isFinite(vid) || vid <= 0) {
        return NextResponse.json({ error: "Data desa pada QR tidak valid" }, { status: 400 });
      }

      if (session.user.villageId !== vid) {
        return NextResponse.json(
          { error: "QR ini untuk desa lain. Pastikan Anda login ke akun desa yang sama." },
          { status: 403 },
        );
      }

      villageId = vid;

      const v = await prisma.village.findUnique({
        where: { id: villageId },
        select: {
          id: true,
          name: true,
          code: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          subscriptionExpiry: true,
          absensiGpsAddonActive: true,
          absensiOfficeLat: true,
          absensiOfficeLng: true,
          absensiCheckInRadiusMeters: true,
        },
      });

      if (!v) {
        return NextResponse.json({ error: "Desa tidak ditemukan" }, { status: 404 });
      }
      village = v;
    } else {
      const lat =
        body?.latitude != null && typeof body.latitude === "number"
          ? body.latitude
          : Number(body?.latitude);
      const lng =
        body?.longitude != null && typeof body.longitude === "number"
          ? body.longitude
          : Number(body?.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return NextResponse.json(
          { error: "Koordinat GPS (latitude, longitude) wajib dan harus valid." },
          { status: 400 },
        );
      }

      if (!session.user.villageId) {
        return NextResponse.json(
          { error: "Sesi tidak memiliki desa; login ulang." },
          { status: 400 },
        );
      }

      villageId = session.user.villageId;

      const v = await prisma.village.findUnique({
        where: { id: villageId },
        select: {
          id: true,
          name: true,
          code: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          subscriptionExpiry: true,
          absensiGpsAddonActive: true,
          absensiOfficeLat: true,
          absensiOfficeLng: true,
          absensiCheckInRadiusMeters: true,
        },
      });

      if (!v) {
        return NextResponse.json({ error: "Desa tidak ditemukan" }, { status: 404 });
      }
      village = v;

      if (!village.absensiGpsAddonActive) {
        return NextResponse.json(
          {
            error: "Add-on GPS belum diaktifkan untuk desa ini.",
            code: "GPS_ADDON_INACTIVE",
          },
          { status: 403 },
        );
      }

      if (village.absensiOfficeLat == null || village.absensiOfficeLng == null) {
        return NextResponse.json(
          {
            error:
              "Lokasi kantor desa belum diatur. Minta admin mengisi koordinat acuan di pengaturan absensi GPS.",
            code: "GPS_OFFICE_NOT_CONFIGURED",
          },
          { status: 400 },
        );
      }

      const dist = haversineDistanceMeters(
        lat,
        lng,
        village.absensiOfficeLat,
        village.absensiOfficeLng,
      );
      if (dist > village.absensiCheckInRadiusMeters) {
        return NextResponse.json(
          {
            error: `Anda di luar radius absensi (maks. ${village.absensiCheckInRadiusMeters} m dari titik kantor).`,
            code: "GPS_OUTSIDE_RADIUS",
            distanceMeters: Math.round(dist),
          },
          { status: 400 },
        );
      }
    }

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const resolved = await resolveOfficialForUser(villageId, userId);
    if (!resolved.ok) return resolved.response;

    const { official } = resolved;

    const now = new Date();
    const attendanceDate = startOfDay(now);

    const shift = await prisma.workShift.findFirst({
      where: { villageId, isActive: true },
      orderBy: { id: "asc" },
    });

    const status =
      shift != null ? computePresentOrLate(now, shift) : ("PRESENT" as const);

    const existing = await prisma.attendance.findUnique({
      where: {
        villageId_officialId_attendanceDate: {
          villageId,
          officialId: official.id,
          attendanceDate,
        },
      },
    });

    const lat =
      method === "GPS" && body?.latitude != null
        ? typeof body.latitude === "number"
          ? body.latitude
          : Number(body.latitude)
        : null;
    const lng =
      method === "GPS" && body?.longitude != null
        ? typeof body.longitude === "number"
          ? body.longitude
          : Number(body.longitude)
        : null;

    if (existing?.checkInAt) {
      return NextResponse.json({
        ok: true,
        alreadyCheckedIn: true,
        checkInAt: existing.checkInAt.toISOString(),
        status: existing.status,
        checkInMethod: existing.checkInMethod,
        officialName: official.name,
        position: official.position?.name ?? null,
        villageName: village.name,
        villageCode: village.code,
      });
    }

    await prisma.attendance.upsert({
      where: {
        villageId_officialId_attendanceDate: {
          villageId,
          officialId: official.id,
          attendanceDate,
        },
      },
      create: {
        villageId,
        officialId: official.id,
        attendanceDate,
        shiftId: shift?.id ?? null,
        checkInAt: now,
        status,
        checkInMethod: method === "GPS" ? "GPS" : "QR",
        locationLat: method === "GPS" && lat != null ? lat : null,
        locationLng: method === "GPS" && lng != null ? lng : null,
      },
      update: {
        shiftId: shift?.id ?? null,
        checkInAt: now,
        status,
        checkInMethod: method === "GPS" ? "GPS" : "QR",
        locationLat: method === "GPS" && lat != null ? lat : null,
        locationLng: method === "GPS" && lng != null ? lng : null,
      },
    });

    return NextResponse.json({
      ok: true,
      alreadyCheckedIn: false,
      checkInAt: now.toISOString(),
      status,
      checkInMethod: method,
      officialName: official.name,
      position: official.position?.name ?? null,
      villageName: village.name,
      villageCode: village.code,
    });
  } catch (error) {
    console.error("POST /api/attendance/check-in error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
