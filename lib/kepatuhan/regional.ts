/** Pembatasan wilayah untuk penyuntingan katalog oleh akun regional. Murni. */
import { codeKey, normKey } from "./catalog";

export type WritableScope = { ok: true; regencyKey: string; provinceKey: string } | { ok: false; error: string };

/**
 * Hanya akun KABUPATEN/KOTA (peran regional_kabupaten dengan lingkup REGENCY) yang boleh menimpa katalog. Kunci yang disimpan
 * tidak pernah dari isian pengguna: kode kab/kota akun bila ada (`kode:<kode>`), jika tidak teks wilayah desa-desa dalam
 * lingkup akun. Akun provinsi dan kecamatan hanya membaca.
 */
export function writableScope(args: {
  role: string;
  scope: { level: string; regency: string; province?: string; kodeKabKota?: string };
  villages: { regency: string; province: string }[];
}): WritableScope {
  if (args.role !== "regional_kabupaten" || args.scope.level !== "REGENCY") return { ok: false, error: "Hanya akun kabupaten/kota yang dapat mengubah katalog tenggat." };
  // Akun yang punya kode kab/kota resmi memakai kode sebagai kunci: desa dicocokkan lewat kode di pengaturan wilayahnya,
  // bukan lewat teks profil yang bisa diubah admin desa.
  const code = args.scope.kodeKabKota?.trim();
  if (code) return { ok: true, regencyKey: codeKey(code), provinceKey: "" };
  const want = normKey(args.scope.regency);
  const regencies = [...new Set(args.villages.map((v) => normKey(v.regency)).filter(Boolean))];
  let regencyKey = "";
  if (regencies.length === 0) regencyKey = want;
  else if (regencies.length === 1) regencyKey = regencies[0]!;
  else if (regencies.includes(want)) regencyKey = want;
  else return { ok: false, error: "Wilayah akun ini tidak dapat dipastikan; hubungi admin platform." };
  if (!regencyKey) return { ok: false, error: "Wilayah akun ini tidak dapat dipastikan; hubungi admin platform." };
  const provinces = [...new Set(args.villages.filter((v) => normKey(v.regency) === regencyKey).map((v) => normKey(v.province)).filter(Boolean))];
  const provinceKey = provinces.length === 1 ? provinces[0]! : provinces.length === 0 ? normKey(args.scope.province) : "";
  return { ok: true, regencyKey, provinceKey };
}
