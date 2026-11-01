/** Logika bersama daftar penduduk per kategori statistik (dipakai rute daftar dan rute ekspor). */
import { calculateAge } from "@/utils";
import { normalizeOccupation } from "@/lib/statistics/occupation";
import { normalizeEducation } from "@/lib/statistics/education";
import { getAgeRange } from "@/lib/statistics/age-range";
import { RESIDENT_EXPORT_HEADER } from "@/lib/statistics/export";

export { RESIDENT_EXPORT_HEADER };

export const DIMENSIONS = new Set([
  "occupation",
  "marital_status",
  "religion",
  "education",
  "blood_type",
  "gender",
  "hamlet",
  "age_range",
  "health",
]);

export type ResidentDb = {
  id: number;
  name: string;
  nik: string;
  kk: string | null;
  gender: string;
  birthDate: Date;
  occupation: string | null;
  maritalStatus: string | null;
  religion: string | null;
  education: string | null;
  bloodType: string | null;
  hamlet: string | null;
  rt: string | null;
  rw: string | null;
  isDisability: boolean | null;
  isBpjsKis: boolean | null;
  isPregnant: boolean | null;
  isBreastfeeding: boolean | null;
  isStunting: boolean | null;
};

export type StatisticResidentRow = {
  id: number;
  name: string;
  nik: string;
  kk: string | null;
  gender: string;
  birthDate: string;
  occupation: string | null;
  maritalStatus: string | null;
  religion: string | null;
  education: string | null;
  bloodType: string | null;
  hamlet: string | null;
  rt: string | null;
  rw: string | null;
};

export function matchesHealthCategory(
  r: Pick<
    ResidentDb,
    | "isDisability"
    | "isBpjsKis"
    | "isPregnant"
    | "isBreastfeeding"
    | "isStunting"
  >,
  category: string,
): boolean {
  switch (category) {
    case "Penyandang Disabilitas":
      return !!r.isDisability;
    case "Peserta BPJS/KIS":
      return !!r.isBpjsKis;
    case "Ibu Hamil":
      return !!r.isPregnant;
    case "Ibu Menyusui":
      return !!r.isBreastfeeding;
    case "Balita Stunting":
      return !!r.isStunting;
    default:
      return false;
  }
}

export function matchesDimension(
  r: ResidentDb,
  dimension: string,
  category: string,
): boolean {
  switch (dimension) {
    case "occupation":
      return normalizeOccupation(r.occupation) === category;
    case "marital_status":
      return (r.maritalStatus || "Tidak Diketahui") === category;
    case "religion":
      return (r.religion || "Tidak Diketahui") === category;
    case "education":
      return normalizeEducation(r.education) === category;
    case "blood_type":
      return (r.bloodType || "Tidak Diketahui") === category;
    case "gender":
      return r.gender === category;
    case "hamlet":
      return (r.hamlet || "Tidak Diketahui") === category;
    case "age_range": {
      const age = calculateAge(new Date(r.birthDate));
      return getAgeRange(age) === category;
    }
    case "health":
      return matchesHealthCategory(r, category);
    default:
      return false;
  }
}

export function compareResidents(
  a: ResidentDb,
  b: ResidentDb,
  sortKey: string | undefined,
  sortOrder: string | undefined,
): number {
  const dir = sortOrder === "desc" ? -1 : 1;
  const key = sortKey ?? "name";
  if (key === "name") return a.name.localeCompare(b.name, "id") * dir;
  if (key === "nik") return a.nik.localeCompare(b.nik) * dir;
  if (key === "gender") return a.gender.localeCompare(b.gender) * dir;
  if (key === "birthDate") {
    return (
      (a.birthDate.getTime() - b.birthDate.getTime()) * dir
    );
  }
  if (key === "hamlet") {
    return (a.hamlet ?? "").localeCompare(b.hamlet ?? "", "id") * dir;
  }
  if (key === "occupation") {
    return (a.occupation ?? "").localeCompare(b.occupation ?? "", "id") * dir;
  }
  if (key === "maritalStatus") {
    return (a.maritalStatus ?? "").localeCompare(b.maritalStatus ?? "", "id") * dir;
  }
  if (key === "religion") {
    return (a.religion ?? "").localeCompare(b.religion ?? "", "id") * dir;
  }
  if (key === "education") {
    return (a.education ?? "").localeCompare(b.education ?? "", "id") * dir;
  }
  if (key === "bloodType") {
    return (a.bloodType ?? "").localeCompare(b.bloodType ?? "", "id") * dir;
  }
  return a.name.localeCompare(b.name, "id") * dir;
}

/** Kolom yang dibaca dari tabel penduduk untuk pencocokan kategori dan baris keluaran. */
export const RESIDENT_SELECT = {
  id: true,
  name: true,
  nik: true,
  kk: true,
  gender: true,
  birthDate: true,
  occupation: true,
  maritalStatus: true,
  religion: true,
  education: true,
  bloodType: true,
  hamlet: true,
  rt: true,
  rw: true,
  isDisability: true,
  isBpjsKis: true,
  isPregnant: true,
  isBreastfeeding: true,
  isStunting: true,
} as const;

export function toStatisticRow(r: ResidentDb): StatisticResidentRow {
  return {
    id: r.id,
    name: r.name,
    nik: r.nik,
    kk: r.kk,
    gender: r.gender,
    birthDate: r.birthDate.toISOString(),
    occupation: r.occupation,
    maritalStatus: r.maritalStatus,
    religion: r.religion,
    education: r.education,
    bloodType: r.bloodType,
    hamlet: r.hamlet,
    rt: r.rt,
    rw: r.rw,
  };
}

export type CategoryFilter = {
  dimension: string;
  category: string;
  /** "Laki-laki" atau "Perempuan"; nilai lain diabaikan. */
  gender?: string;
  search?: string;
  sortKey?: string;
  sortOrder?: string;
};

/** Saring dan urutkan penduduk untuk satu kategori statistik. */
export function filterResidents(residents: readonly ResidentDb[], f: CategoryFilter): ResidentDb[] {
  let out = residents.filter((r) => matchesDimension(r, f.dimension, f.category));
  if (f.gender === "Laki-laki" || f.gender === "Perempuan") {
    out = out.filter((r) => r.gender === f.gender);
  }
  const search = f.search?.trim() ?? "";
  if (search) {
    const q = search.toLowerCase();
    const nikQuery = search.replace(/\s/g, "");
    out = out.filter((r) => r.name.toLowerCase().includes(q) || r.nik.includes(nikQuery));
  }
  return out.sort((a, b) => compareResidents(a, b, f.sortKey, f.sortOrder));
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Satu baris berkas ekspor; urutan kolom mengikuti RESIDENT_EXPORT_HEADER. NIK/KK tetap teks. */
export function residentExportRow(r: ResidentDb, no: number): Array<string | number> {
  const d = r.birthDate;
  return [
    no,
    r.name,
    r.nik,
    r.kk ?? "",
    r.gender,
    `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`,
    calculateAge(d),
    r.occupation ?? "",
    r.maritalStatus ?? "",
    r.religion ?? "",
    r.education ?? "",
    r.bloodType ?? "",
    r.hamlet ?? "",
    r.rt ?? "",
    r.rw ?? "",
  ];
}
