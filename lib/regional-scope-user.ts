import {
  REGIONAL_ROLE_PROVINSI,
  REGIONAL_ROLE_KABUPATEN,
  REGIONAL_ROLE_KECAMATAN,
  normalizeLocationKey,
} from "@/lib/regional-policy";
import type { RegionalScope } from "@/lib/regional-session";

/** Lingkup wilayah akun regional dari baris DB (sumber kebenaran; JWT hanya salinan saat login). Null bila tidak lengkap. */
export function buildRegionalScopeFromUser(user: {
  role: string;
  scopeProvince: string | null;
  scopeRegency: string;
  scopeDistrict: string | null;
  scopeKodeProvinsi: string | null;
  scopeKodeKabKota: string | null;
}): RegionalScope | null {
  const regency = normalizeLocationKey(user.scopeRegency);
  const province = user.scopeProvince
    ? normalizeLocationKey(user.scopeProvince)
    : "";
  const kodeProvinsi = user.scopeKodeProvinsi?.trim() || undefined;
  const kodeKabKota = user.scopeKodeKabKota?.trim() || undefined;

  if (user.role === REGIONAL_ROLE_PROVINSI) {
    if (!province && !kodeProvinsi) return null;
    return {
      level: "PROVINCE",
      province: province || regency,
      regency: regency || province,
      kodeProvinsi,
      kodeKabKota,
    };
  }
  if (user.role === REGIONAL_ROLE_KABUPATEN) {
    if (!regency && !kodeKabKota) return null;
    return { level: "REGENCY", regency, kodeProvinsi, kodeKabKota };
  }
  if (user.role === REGIONAL_ROLE_KECAMATAN) {
    const district = user.scopeDistrict
      ? normalizeLocationKey(user.scopeDistrict)
      : "";
    if (!district || (!regency && !kodeKabKota)) return null;
    return {
      level: "DISTRICT",
      regency,
      district,
      kodeProvinsi,
      kodeKabKota,
    };
  }
  return null;
}
