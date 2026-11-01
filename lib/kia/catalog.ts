/**
 * Aturan pencatatan KIA (ibu hamil) dan posyandu lansia. Murni, aman dipakai klien. Alat bantu kader: penanda "perlu ditinjau"
 * bukan diagnosis; rujukan dan tindakan tetap oleh bidan, dokter, dan puskesmas.
 *
 * Sumber dan tingkat keyakinan:
 * - Kunjungan antenatal minimal 6 kali, sebaran 2 (trimester 1: 0-12 minggu), 1 (trimester 2: >12-24 minggu), 3 (trimester 3: >24 minggu
 *   sampai lahir), dua di antaranya oleh dokter (trimester 1 dan 3) termasuk USG: dikutip luas dari Permenkes 21/2021 dan pedoman ANC
 *   Kemenkes. Pembagian trimester berbeda antar sumber, dan status berlaku peraturan perlu dicek ke JDIH Kemenkes.
 * - HPL = HPHT + 280 hari (perkiraan, aturan Naegele ekuivalen).
 * - Tanda bahaya kehamilan: enam tanda yang tercantum di Buku KIA.
 * - Ambang penanda: tekanan darah >= 140/90 mmHg, LiLA < 23,5 cm (kurang energi kronis), Hb < 11 g/dL, umur < 20 atau > 35 tahun,
 *   denyut jantung janin di luar 120-160 per menit. Angka baku klinis; bukan kutipan satu pasal.
 * - Lansia: usia 60 tahun ke atas (UU 13/1998). Kategori IMT dan kemandirian (Barthel) TIDAK ditanam karena sumber sekunder berbeda-beda;
 *   nilai dicatat mentah. Penanda: tekanan darah >= 140/90; gula darah puasa >= 126 atau sewaktu >= 200 mg/dL (perlu pemeriksaan lanjutan).
 */

export const PREGNANCY_STATUS = { HAMIL: "Hamil", BERSALIN: "Sudah bersalin", KEGUGURAN: "Keguguran" } as const;
export type PregnancyStatus = keyof typeof PREGNANCY_STATUS;
export const ENDED_STATUSES = ["BERSALIN", "KEGUGURAN"] as const;

export const PROVIDERS = { BIDAN: "Bidan", DOKTER: "Dokter", LAINNYA: "Tenaga kesehatan lain" } as const;
export type Provider = keyof typeof PROVIDERS;
export const isProvider = (v: unknown): v is Provider => typeof v === "string" && Object.hasOwn(PROVIDERS, v);

/** Enam tanda bahaya kehamilan menurut Buku KIA. */
export const DANGER_SIGNS = {
  PERDARAHAN: "Perdarahan dari jalan lahir",
  MUNTAH_TERUS: "Muntah terus dan tidak mau makan",
  DEMAM_TINGGI: "Demam tinggi",
  BENGKAK_KEJANG: "Bengkak kaki, tangan, atau wajah; sakit kepala disertai kejang",
  GERAK_JANIN_KURANG: "Gerakan janin berkurang atau tidak bergerak",
  KETUBAN_PECAH: "Air ketuban keluar sebelum waktunya",
} as const;
export type DangerSign = keyof typeof DANGER_SIGNS;
export const isDangerSign = (v: unknown): v is DangerSign => typeof v === "string" && Object.hasOwn(DANGER_SIGNS, v);

export const LIMITS = {
  pregnanciesPerVillage: 20000,
  visitsPerPregnancy: 40,
  maxGestationDays: 301, // lebih dari ini hampir pasti HPHT keliru
  motherMinAge: 10,
  motherMaxAge: 55,
  elderMinAge: 60,
  elderChecksPerResident: 600,
} as const;

/** Rentang nilai yang masuk akal; di luar itu dianggap salah ketik. */
export const RANGE = {
  weightKg: [20, 250],
  systolic: [50, 300],
  diastolic: [30, 200],
  upperArmCm: [10, 60],
  fundalHeightCm: [5, 60],
  fetalHeartRate: [60, 220],
  hemoglobin: [2, 20],
  ironTablets: [0, 400],
  heightCm: [100, 220],
  glucoseMgDl: [20, 800],
  adlScore: [0, 20],
} as const;

const DAY = 86_400_000;
const utcDay = (d: Date): number => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

export const addDays = (d: Date, n: number): Date => new Date(utcDay(d) + n * DAY);
export const daysBetween = (from: Date, to: Date): number => Math.round((utcDay(to) - utcDay(from)) / DAY);

/** Hari perkiraan lahir = HPHT + 280 hari. */
export const expectedDeliveryDate = (lmp: Date): Date => addDays(lmp, 280);

export interface Gestation {
  weeks: number;
  days: number;
  trimester: 1 | 2 | 3;
}

/** Usia kehamilan pada `on` dari HPHT; null bila `on` sebelum HPHT. */
export function gestationAt(lmp: Date, on: Date): Gestation | null {
  const total = daysBetween(lmp, on);
  if (total < 0) return null;
  const weeks = Math.floor(total / 7);
  return { weeks, days: total % 7, trimester: weeks <= 12 ? 1 : weeks <= 24 ? 2 : 3 };
}

/** Kunjungan antenatal yang dianjurkan per trimester (2-1-3) dan dua kunjungan dokter. */
export const PLAN = { total: 6, perTrimester: { 1: 2, 2: 1, 3: 3 } as Record<1 | 2 | 3, number>, doctorTrimesters: [1, 3] as const };

export interface VisitLite {
  trimester: number;
  provider: string;
}

export interface PlanProgress {
  total: number;
  perTrimester: Record<1 | 2 | 3, { done: number; target: number }>;
  doctorTrimester1: boolean;
  doctorTrimester3: boolean;
  /** Kunjungan yang seharusnya sudah ada pada trimester berjalan dan sebelumnya tetapi belum, mis. ["trimester 1 kurang 1"]. */
  missing: string[];
}

export function planProgress(visits: VisitLite[], currentTrimester: 1 | 2 | 3): PlanProgress {
  const count = (t: number) => visits.filter((v) => v.trimester === t).length;
  const perTrimester = {
    1: { done: count(1), target: PLAN.perTrimester[1] },
    2: { done: count(2), target: PLAN.perTrimester[2] },
    3: { done: count(3), target: PLAN.perTrimester[3] },
  };
  const missing: string[] = [];
  for (const t of [1, 2, 3] as const) {
    // Trimester yang sudah lewat harus tuntas; trimester berjalan hanya diingatkan bila belum ada satu pun.
    const gap = perTrimester[t].target - perTrimester[t].done;
    if (gap > 0 && (t < currentTrimester || (t === currentTrimester && perTrimester[t].done === 0))) missing.push(`trimester ${t} kurang ${t < currentTrimester ? gap : 1}`);
  }
  const doctor = (t: number) => visits.some((v) => v.trimester === t && v.provider === "DOKTER");
  return { total: visits.length, perTrimester, doctorTrimester1: doctor(1), doctorTrimester3: doctor(3), missing };
}

export interface RiskInput {
  systolic?: number | null;
  diastolic?: number | null;
  upperArmCm?: number | null;
  hemoglobin?: number | null;
  fetalHeartRate?: number | null;
  dangerSigns?: string[];
}

/** Penanda "perlu ditinjau bidan" dari satu kunjungan. */
export function visitFlags(v: RiskInput): string[] {
  const out: string[] = [];
  if (v.systolic != null && v.diastolic != null && (v.systolic >= 140 || v.diastolic >= 90)) out.push("Tekanan darah tinggi (140/90 atau lebih)");
  if (v.upperArmCm != null && v.upperArmCm < 23.5) out.push("LiLA kurang dari 23,5 cm (risiko kurang energi kronis)");
  if (v.hemoglobin != null && v.hemoglobin < 11) out.push("Hb kurang dari 11 g/dL (anemia)");
  if (v.fetalHeartRate != null && (v.fetalHeartRate < 120 || v.fetalHeartRate > 160)) out.push("Denyut jantung janin di luar 120-160 per menit");
  for (const s of v.dangerSigns ?? []) if (isDangerSign(s)) out.push(`Tanda bahaya: ${DANGER_SIGNS[s]}`);
  return out;
}

/** Umur berisiko: di bawah 20 atau di atas 35 tahun saat hamil. */
export function ageFlag(ageYears: number): string | null {
  return ageYears < 20 ? "Usia di bawah 20 tahun" : ageYears > 35 ? "Usia di atas 35 tahun" : null;
}

export function ageOn(birth: Date, on: Date): number {
  let a = on.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday = on.getUTCMonth() < birth.getUTCMonth() || (on.getUTCMonth() === birth.getUTCMonth() && on.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) a -= 1;
  return a;
}

export interface ElderInput {
  systolic?: number | null;
  diastolic?: number | null;
  glucoseMgDl?: number | null;
  glucoseType?: string | null;
}

/** Penanda lansia dari satu pemeriksaan; bukan diagnosis. */
export function elderFlags(c: ElderInput): string[] {
  const out: string[] = [];
  if (c.systolic != null && c.diastolic != null && (c.systolic >= 140 || c.diastolic >= 90)) out.push("Tekanan darah tinggi (140/90 atau lebih)");
  if (c.glucoseMgDl != null) {
    if (c.glucoseType === "PUASA" && c.glucoseMgDl >= 126) out.push("Gula darah puasa 126 mg/dL atau lebih");
    if (c.glucoseType === "SEWAKTU" && c.glucoseMgDl >= 200) out.push("Gula darah sewaktu 200 mg/dL atau lebih");
  }
  return out;
}

/** IMT = kg / m^2, satu desimal. Tanpa kategori (sumber berbeda-beda). */
export function bmi(weightKg: number | null | undefined, heightCm: number | null | undefined): number | null {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

/** Pengingat aplikasi (bukan ketentuan): lansia yang belum diperiksa lebih dari ini ditampilkan sebagai "perlu diperiksa". */
export const ELDER_REMINDER_DAYS = 90;
