/** Pembantu sisi-server untuk impor warga (murni, bisa diuji). */
import { residentLeavesVillage } from "../mobile/citizen-status-logic";
import type { DbRecord } from "./normalize";
import type { FieldId } from "./fields";

/**
 * skip: lewati yang sudah ada · fill: isi kolom kosong · overwrite: timpa · status: hanya perbarui status
 * meninggal/pindah warga yang sudah ada (tidak menambah warga baru).
 */
export type ImportMode = "skip" | "fill" | "overwrite" | "status";

/** Kolom yang boleh diisi/ditimpa pada warga yang sudah ada. nik, villageId, createdAt tidak pernah disentuh. */
export const UPDATABLE: Array<keyof DbRecord> = [
  "kk", "name", "birthplace", "birthDate", "gender", "bloodType", "religion", "maritalStatus", "familyRole",
  "address", "rt", "rw", "hamlet", "occupation", "education", "nationality", "phone", "email",
  "moveDate", "deathDate", "fatherNik", "fatherName", "motherNik", "motherName",
  "disabilityId", "otherDisability", "datePregnant", "contraception", "height", "weight", "income",
  "cover", "coverThumb", "photo", "photoThumb", "countryCode", "tempIdNumber", "tempRt", "houseOwnership", "desil",
];
const BOOLEAN_FIELDS: Array<keyof DbRecord> = [
  "isAlive", "isIlliterate", "isDisability", "isPregnant", "isBreastfeeding", "isStunting", "isBpjsKis",
];

export const isBlank = (v: unknown) => v === null || v === undefined || v === "";

export const sameValue = (a: unknown, b: unknown): boolean => {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return a === b;
};

export async function runPool<T>(items: T[], size: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}

export function buildUpdate(
  incoming: DbRecord,
  existing: Record<string, unknown>,
  mode: ImportMode,
  rawValues: Partial<Record<FieldId, unknown>>,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (mode === "status") {
    if (incoming.isAlive === false && !isBlank(rawValues.is_alive) && existing.isAlive !== false) data.isAlive = false;
    for (const k of ["deathDate", "moveDate"] as const) {
      if (!isBlank(incoming[k]) && !sameValue(incoming[k], existing[k])) data[k] = incoming[k];
    }
    return data;
  }
  for (const k of UPDATABLE) {
    const v = incoming[k];
    if (isBlank(v)) continue; // sel kosong di Excel tidak pernah menghapus data yang ada
    if (mode === "fill" && !isBlank(existing[k])) continue;
    if (sameValue(v, existing[k])) continue; // tidak ada perubahan → tidak perlu UPDATE
    data[k] = v;
  }
  // Boolean hanya diubah bila kolomnya memang dipetakan/diisi di file (nilai mentah tidak kosong)
  const boolSource: Partial<Record<keyof DbRecord, FieldId>> = {
    isAlive: "is_alive",
    isIlliterate: "is_illiterate",
    isDisability: "is_disability",
    isPregnant: "is_pregnant",
    isBreastfeeding: "is_breastfeeding",
    isStunting: "is_stunting",
    isBpjsKis: "is_bpjs_kis",
  };
  if (mode === "overwrite") {
    for (const k of BOOLEAN_FIELDS) {
      const src = boolSource[k];
      if (src && !isBlank(rawValues[src]) && !sameValue(incoming[k], existing[k])) data[k] = incoming[k];
    }
  }
  return data;
}


/** Perubahan ini membuat akun mobile warga harus dinonaktifkan (meninggal/pindah)? Aturan dibagi dengan edit manual di web. */
export function deactivatesAccount(data: Record<string, unknown>): boolean {
  return residentLeavesVillage({ isAlive: data.isAlive as boolean | undefined, moveDate: data.moveDate as Date | undefined });
}
