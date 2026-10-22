import { NextRequest, NextResponse } from "next/server";
import * as jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { audit, type StaffContext } from "@/lib/mobile/staff";
import { checkMobileRateLimit } from "@/lib/mobile/rate-limit";
import { computePresentOrLate, evaluateGps, extractQrToken, STATUS_LABEL } from "@/lib/mobile/attendance-logic";
import { normalizeVillageRole } from "@/lib/permissions";
// Secret yang sama dengan route web /api/attendance/qr (penanda QR); gagal tertutup bila belum diset.
import { requireAuthSecret } from "@/lib/auth-secret";


/** Absen masuk dengan QR kantor atau GPS (add-on). Satu kali per hari; panggilan ulang mengembalikan catatan yang sudah ada. */
export async function POST(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["staff"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const rl = checkMobileRateLimit(`checkin:${ctx.accountId}`, { max: 20, windowMs: 10 * 60_000 });
  if (!rl.ok) return mobileError("RATE_LIMITED", "Terlalu banyak percobaan. Coba lagi sebentar.", 429, { retryAfterSec: rl.retryAfterSec });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const method = body?.method === "GPS" ? "GPS" : "QR";

  const village = await prisma.village.findUnique({
    where: { id: ctx.villageId },
    select: { absensiGpsAddonActive: true, absensiOfficeLat: true, absensiOfficeLng: true, absensiCheckInRadiusMeters: true },
  });
  if (!village) return mobileError("VILLAGE_INACTIVE", "Desa tidak ditemukan.", 404);

  let gpsFix: { lat: number; lng: number } | null = null;
  if (method === "QR") {
    let secret: string;
    try {
      secret = requireAuthSecret();
    } catch {
      return mobileError("INVALID_REQUEST", "Absensi QR belum dikonfigurasi dengan aman di server. Hubungi admin Klandesa.", 503);
    }
    const token = typeof body?.token === "string" ? extractQrToken(body.token) : null;
    if (!token) return mobileError("INVALID_REQUEST", "QR tidak dikenali. Arahkan kamera ke QR absensi di layar admin desa.", 400);
    try {
      const p = jwt.verify(token, secret) as jwt.JwtPayload;
      if (p.type !== "ATTENDANCE_QR") return mobileError("INVALID_REQUEST", "QR ini bukan QR absensi.", 400);
      if (Number(p.villageId) !== ctx.villageId) return mobileError("FORBIDDEN", "QR ini untuk desa lain.", 403);
    } catch {
      return mobileError("INVALID_REQUEST", "QR kedaluwarsa atau tidak valid. Minta admin menampilkan QR baru (berlaku 5 menit).", 400);
    }
  } else {
    if (body?.mocked === true) {
      return mobileError("INVALID_REQUEST", "Lokasi palsu (mock location) terdeteksi. Matikan aplikasi lokasi palsu lalu coba lagi.", 400, { reason: "GPS_MOCKED" });
    }
    if (!village.absensiGpsAddonActive) return mobileError("FORBIDDEN", "Absensi GPS belum diaktifkan untuk desa ini.", 403, { reason: "GPS_ADDON_INACTIVE" });
    if (village.absensiOfficeLat == null || village.absensiOfficeLng == null) {
      return mobileError("INVALID_REQUEST", "Lokasi kantor desa belum diatur. Minta admin mengisinya.", 400, { reason: "GPS_OFFICE_NOT_CONFIGURED" });
    }
    const chk = evaluateGps(
      { lat: body?.latitude, lng: body?.longitude, accuracy: body?.accuracy },
      { lat: village.absensiOfficeLat, lng: village.absensiOfficeLng, radiusMeters: village.absensiCheckInRadiusMeters },
    );
    if (!chk.ok) return mobileError("INVALID_REQUEST", chk.message, 400, { reason: chk.code, distanceMeters: chk.distanceMeters });
    gpsFix = { lat: body!.latitude as number, lng: body!.longitude as number };
  }

  const user = await prisma.user.findUnique({ where: { id: ctx.accountId }, select: { email: true } });
  const email = (user?.email ?? "").trim().toLowerCase();
  const official = (await prisma.official.findMany({
    where: { villageId: ctx.villageId, status: "active", email: { not: null } },
    include: { position: { select: { name: true } } },
    take: 200,
  })).find((o) => (o.email ?? "").trim().toLowerCase() === email);
  if (!official) {
    return mobileError("INVALID_REQUEST", "Email akun Anda belum cocok dengan data perangkat desa. Minta admin menyamakan email di menu Data Perangkat Desa.", 400, { reason: "OFFICIAL_EMAIL_MISMATCH" });
  }

  const now = new Date();
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  const shift = await prisma.workShift.findFirst({ where: { villageId: ctx.villageId, isActive: true }, orderBy: { id: "asc" } });
  const status = shift ? computePresentOrLate(now, shift) : "PRESENT";

  const existing = await prisma.attendance.findUnique({
    where: { villageId_officialId_attendanceDate: { villageId: ctx.villageId, officialId: official.id, attendanceDate: day } },
  });
  if (existing?.checkInAt) {
    return NextResponse.json({ alreadyCheckedIn: true, checkInAt: existing.checkInAt, status: existing.status, statusLabel: STATUS_LABEL[existing.status] ?? existing.status });
  }

  await prisma.attendance.upsert({
    where: { villageId_officialId_attendanceDate: { villageId: ctx.villageId, officialId: official.id, attendanceDate: day } },
    create: { villageId: ctx.villageId, officialId: official.id, attendanceDate: day, shiftId: shift?.id ?? null, checkInAt: now, status, checkInMethod: method, locationLat: gpsFix?.lat ?? null, locationLng: gpsFix?.lng ?? null },
    update: { shiftId: shift?.id ?? null, checkInAt: now, status, checkInMethod: method, locationLat: gpsFix?.lat ?? null, locationLng: gpsFix?.lng ?? null },
  });
  void audit({ ...ctx, userId: ctx.accountId, name: official.name, roleLabel: normalizeVillageRole(ctx.role) } as StaffContext, req, "check_in", "attendances", official.id, { method, status });

  return NextResponse.json({ alreadyCheckedIn: false, checkInAt: now, status, statusLabel: STATUS_LABEL[status] ?? status, method, name: official.name });
}
