/**
 * Satu sumber untuk secret JWT/cookie NextAuth (harus sama di auth.ts dan middleware Edge).
 */
export function getResolvedAuthSecret(): string {
  const fromEnv = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV !== "production") {
    return "__dev_only_nextauth_secret_min_32_chars_static__";
  }
  return "";
}

/**
 * Secret untuk menandatangani/memverifikasi token (JWT login, QR absensi, dsb).
 * Gagal tertutup: bila belum diset di produksi, lempar error — tidak ada nilai bawaan yang bisa ditebak.
 * Dipanggil saat dipakai (bukan saat modul dimuat) agar `next build` tanpa env tidak gagal.
 */
export function requireAuthSecret(): string {
  const secret = getResolvedAuthSecret();
  if (!secret) throw new Error("AUTH_SECRET belum diset");
  return secret;
}
