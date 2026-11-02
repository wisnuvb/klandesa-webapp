/** Jenis kelamin baku yang disimpan di `residents.gender` dan dibaca seluruh aplikasi (statistik, filter, surat). */
export type Gender = "Laki-laki" | "Perempuan";
export const GENDERS: readonly Gender[] = ["Laki-laki", "Perempuan"];

const MALE = new Set(["m", "l", "lk", "male", "laki", "laki laki", "laki-laki", "lakilaki", "pria", "cowok"]);
const FEMALE = new Set(["f", "p", "pr", "female", "perempuan", "wanita", "cewek"]);

/** "M"/"L"/"Laki-laki"/"pria" → "Laki-laki"; "F"/"P"/"Perempuan"/"wanita" → "Perempuan"; selain itu null. */
export function normalizeGender(raw: unknown): Gender | null {
  if (typeof raw !== "string") return null;
  const k = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (MALE.has(k)) return "Laki-laki";
  if (FEMALE.has(k)) return "Perempuan";
  return null;
}
