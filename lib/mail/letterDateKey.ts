/**
 * Kunci satu hari untuk skoping unik nomor surat per desa/template.
 * Mengikuti pola ISO `YYYY-MM-DD` dari pemakaian `Date#toISOString()` di penyimpanan.
 */
export function letterDateKeyFromInput(letterDate: Date): string {
  if (Number.isNaN(letterDate.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return letterDate.toISOString().slice(0, 10);
}
