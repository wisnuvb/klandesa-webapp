import { haversineDistanceMeters } from "@/lib/geo/haversine";

/** Logika murni absensi perangkat desa (tanpa DB). Aturan mengikuti route web /api/attendance/check-in. */

export type ShiftInfo = { startTime: string; lateToleranceMinutes: number };

/** HADIR atau TERLAMBAT menurut jam mulai shift + toleransi (waktu server). */
export function computePresentOrLate(now: Date, shift: ShiftInfo): "PRESENT" | "LATE" {
  const parts = shift.startTime.split(":").map((x) => parseInt(x, 10));
  const num = (v: number | undefined, fallback: number) => (v != null && Number.isFinite(v) ? v : fallback);
  const deadline = new Date(now);
  // Jam mulai kosong/rusak → anggap 08:00 (parseInt("") = NaN akan membuat tanggal tidak valid).
  deadline.setHours(num(parts[0], 8), num(parts[1], 0) + (shift.lateToleranceMinutes ?? 0), num(parts[2], 0), 0);
  return now.getTime() > deadline.getTime() ? "LATE" : "PRESENT";
}

/** Titik acuan kantor + batas ketelitian GPS yang bisa diterima. */
export const MAX_GPS_ACCURACY_METERS = 100;

export type GpsCheck =
  | { ok: true; distanceMeters: number }
  | { ok: false; code: "GPS_INVALID" | "GPS_INACCURATE" | "GPS_OUTSIDE_RADIUS"; distanceMeters?: number; message: string };

export function evaluateGps(
  fix: { lat?: unknown; lng?: unknown; accuracy?: unknown },
  office: { lat: number; lng: number; radiusMeters: number },
): GpsCheck {
  const lat = typeof fix.lat === "number" ? fix.lat : Number.NaN;
  const lng = typeof fix.lng === "number" ? fix.lng : Number.NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { ok: false, code: "GPS_INVALID", message: "Lokasi belum terbaca. Pastikan GPS aktif lalu coba lagi." };
  }
  const acc = typeof fix.accuracy === "number" ? fix.accuracy : null;
  if (acc != null && acc > MAX_GPS_ACCURACY_METERS) {
    return { ok: false, code: "GPS_INACCURATE", message: `Sinyal GPS belum akurat (±${Math.round(acc)} m). Pindah ke tempat terbuka lalu coba lagi.` };
  }
  const distance = haversineDistanceMeters(lat, lng, office.lat, office.lng);
  if (distance > office.radiusMeters) {
    return {
      ok: false, code: "GPS_OUTSIDE_RADIUS", distanceMeters: Math.round(distance),
      message: `Anda di luar radius absensi (maks. ${office.radiusMeters} m dari kantor, saat ini ±${Math.round(distance)} m).`,
    };
  }
  return { ok: true, distanceMeters: Math.round(distance) };
}

/** QR kantor berisi URL `.../absensi/check-in?token=JWT`; terima URL penuh maupun token mentah. */
export function extractQrToken(scanned: string): string | null {
  const s = scanned.trim();
  if (!s || s.length > 2000) return null;
  const m = /[?&]token=([^&#\s]+)/.exec(s);
  const raw = m ? decodeURIComponent(m[1]!) : s;
  return /^[\w-]+\.[\w-]+\.[\w-]+$/.test(raw) ? raw : null;
}

export const STATUS_LABEL: Record<string, string> = { PRESENT: "Hadir", LATE: "Terlambat", ABSENT: "Belum absen", LEAVE: "Izin" };

export function summarizeMonth(rows: { status: string }[]): { present: number; late: number; leave: number; total: number } {
  let present = 0, late = 0, leave = 0;
  for (const r of rows) {
    if (r.status === "PRESENT") present += 1;
    else if (r.status === "LATE") late += 1;
    else if (r.status === "LEAVE") leave += 1;
  }
  return { present, late, leave, total: rows.length };
}

/** "2026-10" → [awal, akhir) bulan; null bila format salah. */
export function monthRange(ym: unknown): { from: Date; to: Date } | null {
  const m = typeof ym === "string" ? /^(\d{4})-(\d{2})$/.exec(ym) : null;
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]);
  if (mo < 1 || mo > 12 || y < 2000 || y > 2100) return null;
  return { from: new Date(y, mo - 1, 1), to: new Date(y, mo, 1) };
}
