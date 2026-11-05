/**
 * Sel CSV yang aman dari injeksi rumus spreadsheet (Excel/LibreOffice/Sheets mengeksekusi sel berawalan = + - @ tab CR,
 * mis. `=HYPERLINK(...)` / `+cmd|...` dari nama/alamat yang diketik pengguna lalu diekspor dan dibuka petugas desa).
 * Sel berbahaya diberi awalan apostrof. Dikecualikan: "-" saja (penanda kosong) dan angka bertanda murni ("-5", "+62812"),
 * yang bukan rumus; sel bertipe number tidak pernah diubah.
 */
const FORMULA_START = /^[=+\-@\t\r]/;
const PLAIN_SIGNED_NUMBER = /^[+-]?[\d.,]+$/;

export function neutralizeFormula(s: string): string {
  if (!FORMULA_START.test(s)) return s;
  if (s === "-" || PLAIN_SIGNED_NUMBER.test(s)) return s;
  return `'${s}`;
}

export function csvSafeCell(v: unknown, opts: { alwaysQuote?: boolean } = {}): string {
  const raw = v == null ? "" : String(v);
  const s = typeof v === "number" ? raw : neutralizeFormula(raw);
  if (opts.alwaysQuote || /[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
