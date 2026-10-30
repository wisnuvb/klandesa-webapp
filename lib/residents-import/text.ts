/** Utilitas teks murni untuk impor warga: normalisasi header, kemiripan string, pembersihan placeholder. */

/** Huruf kecil, tanpa diakritik/tanda baca, spasi dirapatkan. "Hub. Keluar-ga" → "hub keluar ga" */
export function normalizeText(input: unknown): string {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Seperti normalizeText tapi header yang terpotong baris ("Kelam in L/P") disambung kembali. */
export function normalizeHeader(input: unknown): string {
  const raw = String(input ?? "").replace(/\s*[\r\n]+\s*/g, " ");
  return normalizeText(raw);
}

function bigrams(s: string): Map<string, number> {
  const out = new Map<string, number>();
  const t = s.replace(/\s+/g, "");
  for (let i = 0; i < t.length - 1; i++) {
    const g = t.slice(i, i + 2);
    out.set(g, (out.get(g) ?? 0) + 1);
  }
  return out;
}

/** Koefisien Dice atas bigram (0..1). Tahan terhadap typo dan spasi yang salah tempat. */
export function dice(a: string, b: string): number {
  const x = a.replace(/\s+/g, "");
  const y = b.replace(/\s+/g, "");
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return 0;
  const A = bigrams(a);
  const B = bigrams(b);
  let inter = 0;
  for (const [g, n] of A) inter += Math.min(n, B.get(g) ?? 0);
  return (2 * inter) / (x.length - 1 + (y.length - 1));
}

/** Jarak Levenshtein dengan batas atas; mengembalikan max+1 bila lebih jauh dari max. */
export function levenshtein(a: string, b: string, max = 3): number {
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

const PLACEHOLDERS = new Set([
  "",
  "-",
  "--",
  "---",
  "'",
  "’",
  "\"",
  ".",
  "..",
  "0",
  "null",
  "nil",
  "n a",
  "na",
  "tidak ada",
  "tdk ada",
  "tidak tahu",
  "tdk tahu",
  "belum ada",
  "kosong",
  "none",
]);

/** True bila sel hanya berisi pengisi ("-", "'", "TIDAK ADA", dst.). */
export function isPlaceholder(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  const raw = String(v).trim();
  if (PLACEHOLDERS.has(raw.toLowerCase())) return true;
  return PLACEHOLDERS.has(normalizeText(raw));
}

/** Teks bersih: trim, rapatkan spasi, buang apostrof awal bawaan Excel; placeholder menjadi "". */
export function cleanText(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = String(v).replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
  if (s.startsWith("'") && s.length > 1 && /\d/.test(s)) s = s.slice(1).trim();
  return isPlaceholder(s) ? "" : s;
}

export function digitsOnly(v: unknown): string {
  return String(v ?? "").replace(/\D+/g, "");
}
