/**
 * Normalisasi & pencocokan nama orang, murni dan aman dipakai di browser (tanpa node:crypto).
 * Dipakai pendaftaran mobile (nama ibu kandung) dan pra-pemeriksaan kesiapan pada impor warga —
 * satu sumber kebenaran agar keduanya tidak pernah berbeda aturan.
 */
const NAME_NOISE = new Set(["alm", "almh", "almarhum", "almarhumah", "hj", "h", "dr", "drs", "dra", "ibu", "bu", "bpk", "bapak"]);

export function normalizePersonName(raw: unknown): string {
  const s = typeof raw === "string" ? raw : "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !NAME_NOISE.has(w))
    .join(" ");
}

export function namesMatch(a: unknown, b: unknown): boolean {
  const x = normalizePersonName(a);
  const y = normalizePersonName(b);
  return x.length >= 2 && x === y;
}
