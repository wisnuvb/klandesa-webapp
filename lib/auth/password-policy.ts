/**
 * Aturan kata sandi baru. Berkas murni (tanpa impor server) agar form di peramban dan API memakai aturan yang SAMA:
 * form memberi tahu pengguna sebelum mengirim, API tetap menjadi penentu.
 */
export const PASSWORD_HINT = "Minimal 8 karakter, memuat huruf dan angka.";

export function validateNewPassword(raw: unknown): string | null {
  const pw = typeof raw === "string" ? raw : "";
  if (pw.length < 8) return "Kata sandi minimal 8 karakter.";
  if (pw.length > 128) return "Kata sandi terlalu panjang.";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "Kata sandi harus memuat huruf dan angka.";
  return null;
}
