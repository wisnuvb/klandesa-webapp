/** Normalisasi NIK menjadi 16 digit (hilangkan non-angka). */
export function normalizeNik(input: unknown): string {
  return String(input ?? "").replace(/\D/g, "").trim();
}

export function isValidNik(nik: string): boolean {
  return /^\d{16}$/.test(nik);
}
