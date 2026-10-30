/** Batas digit agar tetap aman sebagai Number (< 2^53) dan kolom Float/Decimal. */
export const CURRENCY_MAX_DIGITS = 15;

/**
 * Ambil angka mentah (hanya digit) dari teks apa pun, termasuk hasil paste seperti
 * "Rp 1.500.000" atau "1.500.000,00". Rupiah tidak memakai desimal, jadi bagian
 * pecahan setelah koma (1–2 digit di akhir) dibuang, bukan digabung ke nominal.
 */
export function toDigits(input: string): string {
  const withoutFraction = input.replace(/,\d{1,2}\s*$/, "");
  const digits = withoutFraction.replace(/\D/g, "").slice(0, CURRENCY_MAX_DIGITS);
  if (digits === "") return "";
  const trimmed = digits.replace(/^0+/, "");
  return trimmed === "" ? "0" : trimmed;
}

/** "89000000" -> "89.000.000" (pemisah ribuan format id-ID). */
export function formatDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function countDigitsBefore(text: string, caret: number): number {
  let count = 0;
  for (let i = 0; i < Math.min(caret, text.length); i++) {
    if (text.charCodeAt(i) >= 48 && text.charCodeAt(i) <= 57) count++;
  }
  return count;
}

/** Posisi kursor tepat setelah digit ke-`digitCount` pada teks yang sudah diformat. */
export function caretAfterDigits(formatted: string, digitCount: number): number {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (formatted.charCodeAt(i) >= 48 && formatted.charCodeAt(i) <= 57) {
      seen++;
      if (seen === digitCount) return i + 1;
    }
  }
  return formatted.length;
}
