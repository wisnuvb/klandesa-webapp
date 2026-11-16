import type { Prisma } from "@prisma/client";
import {
  buildSasaranReport,
  ageParts,
  areaKey,
  birthDateRangeForGroup,
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
export const SASARAN_PAGE_SIZE = 50;
export const SASARAN_PAGE_MAX = 100;

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

async function loadResidents(db: Db, villageId: number, status: SasaranStatus, narrow?: Prisma.ResidentWhereInput) {
  return db.resident.findMany({
    where: { villageId, isAlive: true, ...statusWhere(status), ...(narrow ? { AND: [narrow] } : {}) },
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
  /** Usia penuh dalam tahun; null bila tanggal lahir tidak valid. */
  age: number | null;
  ageMonths: number | null;
  ageDays: number | null;
  maritalStatus: string | null;
  isPregnant: boolean;
  rt: string | null;
  rw: string | null;
  /** Tanggal pindah (YYYY-MM-DD); null untuk warga yang belum tercatat pindah. */
  moveDate: string | null;
}

export interface SasaranList {
  people: SasaranPerson[];
  /** Jumlah seluruh warga di sel ini (bukan hanya halaman ini). */
  total: number;
  offset: number;
  /** Offset halaman berikutnya; null bila sudah habis. */
  nextOffset: number | null;
}

/**
 * Sempitkan query ke baris yang mungkin cocok: area lewat pasangan RT/RW mentah yang setelah dinormalkan sama dengan `key`
 * (satu groupBy kecil), kelompok lewat rentang tanggal lahir / tanda hamil. Selalu SUPERSET dari inSasaran; hasil akhir disaring ulang persis.
 */
async function narrowWhere(db: Db, villageId: number, group: SasaranGroupKey | "semua", key: string | null, status: SasaranStatus, now: Date): Promise<Prisma.ResidentWhereInput | null> {
  const and: Prisma.ResidentWhereInput[] = [];
  if (key !== null) {
    const pairs = await db.resident.groupBy({ by: ["rt", "rw"], where: { villageId, isAlive: true, ...statusWhere(status) } });
    const hit = pairs.filter((p) => areaKey(normalizeRtRw(p.rw), normalizeRtRw(p.rt)) === key);
    if (hit.length === 0) return null; // area tidak ada: tak ada yang perlu dimuat
    and.push({ OR: hit.map((p) => ({ rt: p.rt, rw: p.rw })) });
  }
  if (group === "ibuHamil") and.push({ isPregnant: true });
  else if (group !== "semua") {
    const range = birthDateRangeForGroup(group, now);
    if (range) and.push({ birthDate: range });
  }
  return and.length ? { AND: and } : {};
}

/**
 * Daftar nama satu sel tabel (kelompok × area), per halaman supaya desa besar tidak memuat ribuan nama sekaligus.
 * Urutan: RW, RT (angka; kosong paling bawah), lalu nama. Tanpa NIK/KK/alamat: untuk menyiapkan sasaran posyandu, bukan ekspor identitas.
 */
export async function sasaranList(
  db: Db,
  villageId: number,
  group: SasaranGroupKey | "semua",
  areaKeyValue: string | null,
  status: SasaranStatus = "aktif",
  page: { offset: number; limit: number } = { offset: 0, limit: SASARAN_PAGE_SIZE },
  now: Date = new Date(),
): Promise<SasaranList> {
  const offset = Math.max(0, Math.floor(page.offset));
  const limit = Math.min(SASARAN_PAGE_MAX, Math.max(1, Math.floor(page.limit)));
  const narrow = await narrowWhere(db, villageId, group, areaKeyValue, status, now);
  if (narrow === null) return { people: [], total: 0, offset, nextOffset: null };
  const all = await loadResidents(db, villageId, status, narrow);
  const hit = all.filter((r) => inSasaran(r, group, areaKeyValue, now));
  // Satu Collator + kunci dihitung sekali: localeCompare per pasangan memperlambat daftar ribuan nama ~10x.
  const collator = new Intl.Collator("id", { numeric: true });
  // RW/RT kosong paling bawah (ditulis eksplisit: aturan ICU menaruh simbol SEBELUM angka).
  const nullsLast = (x: string | null, y: string | null) => (x === y ? 0 : x === null ? 1 : y === null ? -1 : collator.compare(x, y));
  const keyed = hit.map((r) => ({ r, rw: normalizeRtRw(r.rw), rt: normalizeRtRw(r.rt) }));
  keyed.sort((a, b) => nullsLast(a.rw, b.rw) || nullsLast(a.rt, b.rt) || collator.compare(a.r.name, b.r.name) || a.r.id - b.r.id);
  const slice = keyed.slice(offset, offset + limit);
  return {
    total: hit.length,
    offset,
    nextOffset: offset + slice.length < hit.length ? offset + slice.length : null,
    people: slice.map(({ r, rw, rt }) => {
      const parts = ageParts(r.birthDate, now);
      return {
        id: r.id,
        name: r.name,
        gender: r.gender,
        age: parts?.years ?? null,
        ageMonths: parts?.months ?? null,
        ageDays: parts?.days ?? null,
        maritalStatus: r.maritalStatus,
        isPregnant: r.isPregnant === true,
        rt,
        rw,
        moveDate: r.moveDate ? r.moveDate.toISOString().slice(0, 10) : null,
      };
    }),
  };
}
