import type { Prisma } from "@prisma/client";
import {
  buildSasaranReport,
  ageOnDate,
  inSasaran,
  normalizeRtRw,
  type SasaranGroupKey,
  type SasaranStatus,
  type SasaranReport,
  type SasaranResident,
} from "./sasaran";

type Db = Prisma.TransactionClient;

/** Batas pengaman: desa sebesar apa pun jauh di bawah ini; bila tercapai, hasil ditandai terpotong. */
export const SASARAN_RESIDENT_CAP = 50000;
export const SASARAN_LIST_CAP = 500;

const residentSelect = {
  id: true,
  name: true,
  birthDate: true,
  gender: true,
  maritalStatus: true,
  isPregnant: true,
  rt: true,
  rw: true,
  moveDate: true,
} satisfies Prisma.ResidentSelect;

const statusWhere = (status: SasaranStatus): Prisma.ResidentWhereInput =>
  status === "aktif" ? { moveDate: null } : status === "pindah" ? { moveDate: { not: null } } : {};

async function loadResidents(db: Db, villageId: number, status: SasaranStatus) {
  return db.resident.findMany({
    where: { villageId, isAlive: true, ...statusWhere(status) },
    select: residentSelect,
    orderBy: { id: "asc" },
    take: SASARAN_RESIDENT_CAP,
  });
}

export type SasaranReportResult = SasaranReport & { status: SasaranStatus; terpotong: boolean };

export async function sasaranReport(db: Db, villageId: number, status: SasaranStatus = "aktif", now: Date = new Date()): Promise<SasaranReportResult> {
  const rows: SasaranResident[] = await loadResidents(db, villageId, status);
  return { ...buildSasaranReport(rows, now), status, terpotong: rows.length >= SASARAN_RESIDENT_CAP };
}

export interface SasaranPerson {
  id: number;
  name: string;
  gender: string;
  age: number | null;
  maritalStatus: string | null;
  isPregnant: boolean;
  rt: string | null;
  rw: string | null;
  /** Tanggal pindah (YYYY-MM-DD); null untuk warga yang belum tercatat pindah. */
  moveDate: string | null;
}

export interface SasaranList {
  people: SasaranPerson[];
  total: number;
  /** Daftar dipotong di SASARAN_LIST_CAP; angka `total` tetap utuh. */
  terpotong: boolean;
}

/** Daftar nama satu sel tabel (kelompok × area). Tanpa NIK/KK/alamat: untuk menyiapkan sasaran posyandu, bukan ekspor identitas. */
export async function sasaranList(
  db: Db,
  villageId: number,
  group: SasaranGroupKey | "semua",
  areaKeyValue: string | null,
  status: SasaranStatus = "aktif",
  now: Date = new Date(),
): Promise<SasaranList> {
  const all = await loadResidents(db, villageId, status);
  const hit = all.filter((r) => inSasaran(r, group, areaKeyValue, now));
  // Satu Collator + kunci dihitung sekali: localeCompare per pasangan memperlambat daftar ribuan nama ~10x.
  const collator = new Intl.Collator("id", { numeric: true });
  // RW/RT kosong paling bawah (ditulis eksplisit: aturan ICU menaruh simbol SEBELUM angka).
  const nullsLast = (x: string | null, y: string | null) => (x === y ? 0 : x === null ? 1 : y === null ? -1 : collator.compare(x, y));
  const keyed = hit.map((r) => ({ r, rw: normalizeRtRw(r.rw), rt: normalizeRtRw(r.rt) }));
  keyed.sort((a, b) => nullsLast(a.rw, b.rw) || nullsLast(a.rt, b.rt) || collator.compare(a.r.name, b.r.name));
  const sorted = keyed.map((k) => k.r);
  return {
    total: hit.length,
    terpotong: hit.length > SASARAN_LIST_CAP,
    people: sorted.slice(0, SASARAN_LIST_CAP).map((r) => ({
      id: r.id,
      name: r.name,
      gender: r.gender,
      age: ageOnDate(r.birthDate, now),
      maritalStatus: r.maritalStatus,
      isPregnant: r.isPregnant === true,
      rt: normalizeRtRw(r.rt),
      rw: normalizeRtRw(r.rw),
      moveDate: r.moveDate ? r.moveDate.toISOString().slice(0, 10) : null,
    })),
  };
}
