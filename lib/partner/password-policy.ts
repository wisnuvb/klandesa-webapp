/**
 * Validasi kata sandi mitra / pendaftar (plaintext sebelum bcrypt).
 */
export function validatePartnerPasswordPlain(pw: string): string | null {
  if (pw.length < 8) return "Password minimal 8 karakter.";
  if (pw.length > 128) return "Password maksimal 128 karakter.";
  return null;
}
