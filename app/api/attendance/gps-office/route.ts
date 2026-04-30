import { requireVillageApiContext } from "@/lib/api-village-context";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

const SETTINGS_ROLES = new Set(["admin", "village_head"]);

/**
 * Atur titik acuan & radius geofencing untuk absensi GPS (admin / kepala desa).
 */
export async function PATCH(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { dbUser, village: villageRow } = loaded.ctx;

    const role = String(dbUser.role ?? "");
    if (!SETTINGS_ROLES.has(role)) {
      return NextResponse.json(
        { error: "Hanya admin atau kepala desa yang dapat mengatur lokasi GPS." },
        { status: 403 },
      );
    }

    const villageId = villageRow.id;

    const village = await prisma.village.findUnique({
      where: { id: villageId },
      select: {
        id: true,
        subscriptionStatus: true,
        subscriptionExpiry: true,
        absensiGpsAddonActive: true,
      },
    });

    if (!village) {
      return NextResponse.json({ error: "Desa tidak ditemukan" }, { status: 404 });
    }
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }
    if (!village.absensiGpsAddonActive) {
      return NextResponse.json(
        { error: "Aktifkan add-on GPS terlebih dahulu." },
        { status: 400 },
      );
    }

    const body = (await req.json().catch(() => null)) as {
      officeLat?: unknown;
      officeLng?: unknown;
      radiusMeters?: unknown;
    } | null;

    const officeLat = body?.officeLat != null ? Number(body.officeLat) : NaN;
    const officeLng = body?.officeLng != null ? Number(body.officeLng) : NaN;

    if (!Number.isFinite(officeLat) || !Number.isFinite(officeLng)) {
      return NextResponse.json(
        { error: "officeLat dan officeLng wajib berupa angka desimal yang valid." },
        { status: 400 },
      );
    }
    if (officeLat < -90 || officeLat > 90 || officeLng < -180 || officeLng > 180) {
      return NextResponse.json({ error: "Koordinat di luar rentang lintang/bujur yang valid." }, { status: 400 });
    }

    let radiusMeters = 100;
    if (body?.radiusMeters != null) {
      const r = Number(body.radiusMeters);
      if (!Number.isFinite(r) || r < 20 || r > 5000) {
        return NextResponse.json(
          { error: "radiusMeters harus antara 20 dan 5000 (meter)." },
          { status: 400 },
        );
      }
      radiusMeters = Math.round(r);
    }

    const updated = await prisma.village.update({
      where: { id: villageId },
      data: {
        absensiOfficeLat: officeLat,
        absensiOfficeLng: officeLng,
        absensiCheckInRadiusMeters: radiusMeters,
      },
      select: {
        absensiOfficeLat: true,
        absensiOfficeLng: true,
        absensiCheckInRadiusMeters: true,
      },
    });

    return NextResponse.json({
      ok: true,
      officeLat: updated.absensiOfficeLat,
      officeLng: updated.absensiOfficeLng,
      radiusMeters: updated.absensiCheckInRadiusMeters,
    });
  } catch (error) {
    console.error("PATCH /api/attendance/gps-office error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
