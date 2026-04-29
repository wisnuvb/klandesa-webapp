/**
 * Kebijakan data & privasi untuk dashboard regional (kabupaten/kecamatan).
 * Scope wilayah memakai teks yang sama dengan kolom `Village.regency` / `Village.district`
 * (normalisasi ringan); migrasi ke kode BPS dapat menambah kolom terpisah nanti.
 */

/** Normalisasi kunci teks wilayah agar konsisten antar input dan penyimpanan scope akun. */
export function normalizeLocationKey(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

export const REGIONAL_ROLE_KABUPATEN = "regional_kabupaten";
export const REGIONAL_ROLE_KECAMATAN = "regional_kecamatan";

export function isRegionalRole(role: string | undefined | null): boolean {
  return (
    role === REGIONAL_ROLE_KABUPATEN || role === REGIONAL_ROLE_KECAMATAN
  );
}

/**
 * Jika true (default), agregat regional hanya memasukkan desa dengan langganan aktif.
 * Set `REGIONAL_COUNT_ONLY_SUBSCRIBED=0` untuk menyertakan semua desa aktif di wilayah.
 */
export function regionalCountOnlySubscribedVillages(): boolean {
  return process.env.REGIONAL_COUNT_ONLY_SUBSCRIBED !== "0";
}
