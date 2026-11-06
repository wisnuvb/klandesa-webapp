/** Penyamaran data pribadi untuk Inspektur Desa (baca-saja). Murni, tanpa DB. */

/** "budi.santoso@desa.id" -> "bu***@desa.id". Bentuk tak dikenal -> "***". */
export function maskEmail(email: string | null | undefined): string {
  const s = String(email ?? "").trim();
  const at = s.lastIndexOf("@");
  if (at < 1 || at === s.length - 1) return "***";
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  return `${local.slice(0, Math.min(2, local.length))}***@${domain}`;
}

/** Id entitas yang aman ditampilkan: hanya angka pendek (id baris). NIK/KK (16 digit) dan teks bebas dibuang. */
export function safeEntityId(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  return /^\d{1,10}$/.test(raw) ? raw : null;
}
