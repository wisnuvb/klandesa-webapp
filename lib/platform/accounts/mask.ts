/**
 * Penyamaran data pribadi untuk konsol super admin (fungsi murni, tanpa DB).
 * Bawaan semua daftar/detail: tersamar. Data utuh hanya lewat aksi "reveal" yang beraudit.
 */

/** "budi@desa.id" -> "b***@desa.id". Format tak dikenal -> semua bintang (tidak membocorkan potongan). */
export function maskEmail(email: string | null | undefined): string {
  const s = (email ?? "").trim();
  const at = s.lastIndexOf("@");
  if (at < 1 || at === s.length - 1) return s ? "***" : "";
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  return `${local.slice(0, 1)}${"*".repeat(Math.max(2, Math.min(6, local.length - 1)))}@${domain}`;
}

/** "081234567890" -> "08*******890" (dua digit awal + tiga akhir). Terlalu pendek -> semua bintang. */
export function maskPhone(phone: string | null | undefined): string {
  const s = (phone ?? "").replace(/\s+/g, "");
  if (!s) return "";
  if (s.length < 7) return "*".repeat(s.length);
  return `${s.slice(0, 2)}${"*".repeat(s.length - 5)}${s.slice(-3)}`;
}

/** NIK 16 digit -> "************1234" (hanya 4 digit terakhir). */
export function maskNik(nik: string | null | undefined): string {
  const s = (nik ?? "").trim();
  if (!s) return "";
  if (s.length <= 4) return "*".repeat(s.length);
  return `${"*".repeat(s.length - 4)}${s.slice(-4)}`;
}

/** Ringkasan perubahan email untuk jejak audit: kedua sisi tersamar. */
export function maskedEmailChange(oldEmail: string, newEmail: string): string {
  return `${maskEmail(oldEmail)} -> ${maskEmail(newEmail)}`;
}
