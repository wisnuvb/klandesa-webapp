import { WHO_LMS, type LmsTable } from "./who-lms";

/**
 * Z-score status gizi anak 0-60 bulan menurut standar pertumbuhan WHO 2006 (metode LMS), yang menjadi dasar
 * Permenkes 2/2020 tentang Standar Antropometri Anak. Murni dan tanpa dependensi; tabel LMS dibangkitkan dari berkas WHO.
 *
 * Asumsi pengukuran (lazim di posyandu): anak < 24 bulan diukur berbaring (panjang badan), >= 24 bulan berdiri (tinggi badan).
 * Alat bantu skrining untuk kader/bidan; bukan diagnosis. Keputusan tindak lanjut tetap oleh tenaga kesehatan.
 */

export type Sex = "M" | "F";

const DAYS_PER_MONTH = 30.4375;
export const MAX_AGE_MONTHS = 60;

/** Umur dalam bulan desimal (hari / 30,4375, kalender WHO). Null bila tanggal tak masuk akal atau lahir setelah pengukuran. */
export function ageInMonths(birthDate: Date, measuredOn: Date): number | null {
  const days = (Date.UTC(measuredOn.getUTCFullYear(), measuredOn.getUTCMonth(), measuredOn.getUTCDate()) - Date.UTC(birthDate.getUTCFullYear(), birthDate.getUTCMonth(), birthDate.getUTCDate())) / 86_400_000;
  return Number.isFinite(days) && days >= 0 ? days / DAYS_PER_MONTH : null;
}

/** Konversi nilai kolom `gender` desa ("Laki-laki"/"Perempuan"/L/P) ke M/F; null bila tak dikenali. */
export function sexOf(gender: string | null | undefined): Sex | null {
  const g = (gender ?? "").trim().toLowerCase();
  if (g.startsWith("l") || g === "m" || g === "male") return "M";
  if (g.startsWith("p") || g === "f" || g === "female") return "F";
  return null;
}

interface Lms {
  L: number;
  M: number;
  S: number;
}

/** Interpolasi linear L, M, S di antara dua baris terdekat. Null di luar rentang tabel. */
export function lmsAt(table: LmsTable, x: number): Lms | null {
  const first = table[0];
  const last = table[table.length - 1];
  if (!Number.isFinite(x) || x < first[0] || x > last[0]) return null;
  let lo = 0;
  let hi = table.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (table[mid][0] <= x) lo = mid;
    else hi = mid;
  }
  const a = table[lo];
  const b = table[hi];
  const t = b[0] === a[0] ? 0 : (x - a[0]) / (b[0] - a[0]);
  return { L: a[1] + (b[1] - a[1]) * t, M: a[2] + (b[2] - a[2]) * t, S: a[3] + (b[3] - a[3]) * t };
}

/** Nilai pengukuran pada simpangan baku tertentu (kebalikan rumus LMS). */
const valueAtZ = ({ L, M, S }: Lms, z: number): number => (L === 0 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L));

/**
 * z = ((y/M)^L - 1) / (L*S). Untuk indikator berat (BB/U, BB/PB, BB/TB), nilai di luar +-3 SD dikoreksi dengan cara WHO
 * (ekstrapolasi linear dari selisih SD2-SD3) agar tidak berlebihan; TB/U tidak dikoreksi.
 */
export function zScore(y: number, lms: Lms, adjustBeyond3: boolean): number | null {
  if (!(y > 0) || !Number.isFinite(y)) return null;
  const { L, M, S } = lms;
  const z = L === 0 ? Math.log(y / M) / S : (Math.pow(y / M, L) - 1) / (L * S);
  if (!Number.isFinite(z)) return null;
  if (!adjustBeyond3 || Math.abs(z) <= 3) return z;
  if (z > 3) {
    const sd3 = valueAtZ(lms, 3);
    const sd23 = sd3 - valueAtZ(lms, 2);
    return 3 + (y - sd3) / sd23;
  }
  const sd3n = valueAtZ(lms, -3);
  const sd23n = valueAtZ(lms, -2) - sd3n;
  return -3 + (y - sd3n) / sd23n;
}

export type HazCategory = "SANGAT_PENDEK" | "PENDEK" | "NORMAL" | "TINGGI";
export type WazCategory = "BB_SANGAT_KURANG" | "BB_KURANG" | "NORMAL" | "RISIKO_BB_LEBIH";
export type WhzCategory = "GIZI_BURUK" | "GIZI_KURANG" | "GIZI_BAIK" | "RISIKO_GIZI_LEBIH" | "GIZI_LEBIH" | "OBESITAS";

export const HAZ_LABEL: Record<HazCategory, string> = { SANGAT_PENDEK: "Sangat pendek", PENDEK: "Pendek", NORMAL: "Normal", TINGGI: "Tinggi" };
export const WAZ_LABEL: Record<WazCategory, string> = { BB_SANGAT_KURANG: "Berat badan sangat kurang", BB_KURANG: "Berat badan kurang", NORMAL: "Berat badan normal", RISIKO_BB_LEBIH: "Risiko berat badan lebih" };
export const WHZ_LABEL: Record<WhzCategory, string> = { GIZI_BURUK: "Gizi buruk", GIZI_KURANG: "Gizi kurang", GIZI_BAIK: "Gizi baik", RISIKO_GIZI_LEBIH: "Berisiko gizi lebih", GIZI_LEBIH: "Gizi lebih", OBESITAS: "Obesitas" };

export const hazCategory = (z: number): HazCategory => (z < -3 ? "SANGAT_PENDEK" : z < -2 ? "PENDEK" : z <= 3 ? "NORMAL" : "TINGGI");
export const wazCategory = (z: number): WazCategory => (z < -3 ? "BB_SANGAT_KURANG" : z < -2 ? "BB_KURANG" : z <= 1 ? "NORMAL" : "RISIKO_BB_LEBIH");
export const whzCategory = (z: number): WhzCategory => (z < -3 ? "GIZI_BURUK" : z < -2 ? "GIZI_KURANG" : z <= 1 ? "GIZI_BAIK" : z <= 2 ? "RISIKO_GIZI_LEBIH" : z <= 3 ? "GIZI_LEBIH" : "OBESITAS");

export interface Assessment {
  ageMonths: number;
  haz: number | null;
  waz: number | null;
  whz: number | null;
  hazCategory: HazCategory | null;
  wazCategory: WazCategory | null;
  whzCategory: WhzCategory | null;
  /** TB/U < -2 SD (pendek atau sangat pendek). */
  stunted: boolean | null;
  /** Nilai di luar batas kelayakan WHO (kemungkinan salah ukur/salah catat): periksa ulang pengukuran. */
  implausible: string[];
}

export type AssessResult = { ok: true; value: Assessment } | { ok: false; reason: string };

const round2 = (n: number | null) => (n === null ? null : Math.round(n * 100) / 100);

export function assess(input: { sex: Sex | null; birthDate: Date | null; measuredOn: Date; weightKg: number | null; heightCm: number | null }): AssessResult {
  if (!input.sex) return { ok: false, reason: "Jenis kelamin anak belum diisi di data warga." };
  if (!input.birthDate) return { ok: false, reason: "Tanggal lahir anak belum diisi di data warga." };
  const age = ageInMonths(input.birthDate, input.measuredOn);
  if (age === null) return { ok: false, reason: "Tanggal lahir setelah tanggal pengukuran." };
  if (age > MAX_AGE_MONTHS) return { ok: false, reason: "Standar ini hanya untuk anak usia 0-60 bulan." };
  const w = input.weightKg !== null && input.weightKg > 0 ? input.weightKg : null;
  const h = input.heightCm !== null && input.heightCm > 0 ? input.heightCm : null;
  if (w === null && h === null) return { ok: false, reason: "Berat dan tinggi/panjang badan belum diukur." };

  const s = input.sex;
  const lying = age < 24;
  let haz: number | null = null;
  let waz: number | null = null;
  let whz: number | null = null;

  if (h !== null) {
    const lms = lmsAt(lying ? WHO_LMS.lhfaLying[s] : WHO_LMS.lhfaStanding[s], age);
    if (lms) haz = zScore(h, lms, false);
  }
  if (w !== null) {
    const lms = lmsAt(WHO_LMS.wfa[s], age);
    if (lms) waz = zScore(w, lms, true);
  }
  if (w !== null && h !== null) {
    const lms = lmsAt(lying ? WHO_LMS.wfl[s] : WHO_LMS.wfh[s], h);
    if (lms) whz = zScore(w, lms, true);
  }

  const implausible: string[] = [];
  if (haz !== null && (haz < -6 || haz > 6)) implausible.push("Tinggi/panjang badan tidak wajar untuk umurnya");
  if (waz !== null && (waz < -6 || waz > 5)) implausible.push("Berat badan tidak wajar untuk umurnya");
  if (whz !== null && (whz < -5 || whz > 5)) implausible.push("Berat tidak wajar untuk tinggi/panjangnya");

  return {
    ok: true,
    value: {
      ageMonths: Math.round(age * 10) / 10,
      haz: round2(haz),
      waz: round2(waz),
      whz: round2(whz),
      hazCategory: haz === null ? null : hazCategory(haz),
      wazCategory: waz === null ? null : wazCategory(waz),
      whzCategory: whz === null ? null : whzCategory(whz),
      stunted: haz === null ? null : haz < -2,
      implausible,
    },
  };
}
