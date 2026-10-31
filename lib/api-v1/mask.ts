/** Penyamaran data pribadi untuk /api/v1. Semua endpoint wajib lewat sini (dijaga tes statis), bukan menyamarkan sendiri-sendiri. */

/** Sisakan `keep` digit terakhir, sisanya "*". Nilai kosong → null. */
export function maskDigits(value: string | null | undefined, keep = 4): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  const k = Math.min(keep, Math.max(0, v.length - 1));
  return "*".repeat(v.length - k) + v.slice(v.length - k);
}

export const maskNik = (nik: string | null | undefined) => maskDigits(nik, 4);
export const maskKk = (kk: string | null | undefined) => maskDigits(kk, 4);

/** Umur penuh dalam tahun pada `now`. */
export function ageYears(birthDate: Date, now: Date = new Date()): number {
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const m = now.getUTCMonth() - birthDate.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birthDate.getUTCDate())) age -= 1;
  return Math.max(0, age);
}
