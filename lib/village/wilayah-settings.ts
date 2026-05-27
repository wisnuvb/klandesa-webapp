import type { Village } from "@prisma/client";
import {
  fetchKabKotaList,
  findKabKotaByCode,
  findProvinsiByCode,
  isWilayahCode,
} from "@/lib/pangan/region-master";
import {
  matchKabKotaCode,
  matchProvinceCode,
  PROVINSI_CODES,
} from "@/lib/pangan/match-region";

export type VillageWilayahCodes = {
  kode_provinsi: string;
  kode_kab_kota: string;
};

export function parseWilayahSettings(settings: unknown): VillageWilayahCodes {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return { kode_provinsi: "", kode_kab_kota: "" };
  }
  const o = settings as Record<string, unknown>;
  const w =
    o.wilayah && typeof o.wilayah === "object" && !Array.isArray(o.wilayah)
      ? (o.wilayah as Record<string, unknown>)
      : null;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    kode_provinsi: str(w?.kode_provinsi),
    kode_kab_kota: str(w?.kode_kab_kota),
  };
}

export function mergeWilayahIntoVillageSettings(
  existing: unknown,
  codes: Partial<VillageWilayahCodes>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const prev = parseWilayahSettings(existing);
  const next: VillageWilayahCodes = {
    kode_provinsi: codes.kode_provinsi ?? prev.kode_provinsi,
    kode_kab_kota: codes.kode_kab_kota ?? prev.kode_kab_kota,
  };
  return {
    ...base,
    wilayah: {
      kode_provinsi: next.kode_provinsi,
      kode_kab_kota: next.kode_kab_kota,
    },
  };
}

/** Infer kode dari teks profil desa (desa lama sebelum dropdown). */
export async function inferWilayahCodesFromText(
  province: string,
  regency: string,
): Promise<VillageWilayahCodes> {
  const kode_provinsi = matchProvinceCode(province) ?? "";
  if (!kode_provinsi) {
    return { kode_provinsi: "", kode_kab_kota: "" };
  }
  const kabList = await fetchKabKotaList(kode_provinsi);
  const kode_kab_kota = matchKabKotaCode(regency, kabList) ?? "";
  return { kode_provinsi, kode_kab_kota };
}

/**
 * Nama resmi Kemendag untuk kolom Village — dipakai kop surat & matching regional.
 */
export async function resolveWilayahLabelsFromCodes(
  codes: VillageWilayahCodes,
): Promise<{ province: string; regency: string } | null> {
  const prov = findProvinsiByCode(codes.kode_provinsi);
  if (!prov) return null;
  const kabList = await fetchKabKotaList(codes.kode_provinsi);
  const kab = findKabKotaByCode(kabList, codes.kode_kab_kota);
  if (!kab) return null;
  return {
    province: prov.nama_provinsi,
    regency: kab.nama_kab_kota,
  };
}

export function isValidWilayahCodes(codes: VillageWilayahCodes): boolean {
  return (
    isWilayahCode(codes.kode_provinsi, "provinsi") &&
    isWilayahCode(codes.kode_kab_kota, "kab_kota")
  );
}

/**
 * Urutan: override query → kode tersimpan di settings → fuzzy match teks profil.
 */
export async function resolveWilayahCodesForVillage(
  village: Pick<Village, "province" | "regency" | "settings">,
  overrides?: Partial<VillageWilayahCodes>,
): Promise<VillageWilayahCodes | null> {
  const fromQuery = {
    kode_provinsi: overrides?.kode_provinsi?.trim() ?? "",
    kode_kab_kota: overrides?.kode_kab_kota?.trim() ?? "",
  };
  if (isValidWilayahCodes(fromQuery)) return fromQuery;

  const stored = parseWilayahSettings(village.settings);
  if (isValidWilayahCodes(stored)) return stored;

  const inferred = await inferWilayahCodesFromText(
    village.province,
    village.regency,
  );
  if (isValidWilayahCodes(inferred)) return inferred;

  return null;
}

export { PROVINSI_CODES };
