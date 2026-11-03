/** Jenis kelamin baku yang disimpan di `residents.gender` dan dibaca seluruh aplikasi (statistik, filter, surat). */
export type Gender = "Laki-laki" | "Perempuan";
export const GENDERS: readonly Gender[] = ["Laki-laki", "Perempuan"];

const MALE = new Set([
  "m", "l", "lk", "lk2", "1",
  "male", "man", "boy",
  "laki", "laki2", "laki-laki", "laki laki", "lakilaki", "laki_laki", "laki.laki",
  "lelaki", "pria", "putra", "cowok", "cowo", "co", "jantan",
]);
const FEMALE = new Set([
  "f", "p", "pr", "pr2", "2",
  "female", "woman", "girl",
  "perempuan", "perempuan2",
  "wanita", "putri", "cewek", "cewe", "ce", "betina",
]);

/** Bentuk baku dipakai sebagai acuan jarak-edit untuk menangkap salah ketik ("prempuan", "wnita", dst). */
const MALE_CANON = ["laki laki", "laki", "pria", "lelaki", "male"];
const FEMALE_CANON = ["perempuan", "wanita", "female", "putri"];

const normalizeKey = (raw: string) =>
  raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Jarak Levenshtein dengan batas atas; melampaui `max` dibulatkan ke `max + 1`. */
function levenshtein(a: string, b: string, max: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

const closestDistance = (compact: string, canon: string[]) =>
  Math.min(...canon.map((c) => levenshtein(compact, c.replace(/\s+/g, ""), 2)));

/**
 * "M"/"L"/"Laki-laki"/"pria"/1 → "Laki-laki"; "F"/"P"/"Perempuan"/"wanita"/2 → "Perempuan".
 * Salah ketik ringan ("prempuan", "wnita", "pr ia") ditoleransi lewat jarak-edit; selain itu null.
 */
export function normalizeGender(raw: unknown): Gender | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const k = normalizeKey(trimmed);
  if (!k) return null;
  if (MALE.has(k)) return "Laki-laki";
  if (FEMALE.has(k)) return "Perempuan";

  const compact = k.replace(/\s+/g, "");
  if (MALE.has(compact)) return "Laki-laki";
  if (FEMALE.has(compact)) return "Perempuan";

  if (compact.length >= 3 && compact.length <= 12) {
    const maleDist = closestDistance(compact, MALE_CANON);
    const femaleDist = closestDistance(compact, FEMALE_CANON);
    const threshold = compact.length <= 5 ? 1 : 2;
    if (maleDist <= threshold && maleDist < femaleDist) return "Laki-laki";
    if (femaleDist <= threshold && femaleDist < maleDist) return "Perempuan";
  }

  return null;
}
