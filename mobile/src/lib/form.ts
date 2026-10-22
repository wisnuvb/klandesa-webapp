/** Ketik "28021990" → "28/02/1990". Hanya angka, maks 8 digit. */
export function formatDateInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** "28/02/1990" → "1990-02-28"; null bila tidak lengkap atau tanggal mustahil. */
export function dateInputToIso(value: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!m) return null;
  const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (y < 1900 || dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function digitsOnly(v: string, max: number): string {
  return v.replace(/\D/g, '').slice(0, max);
}

/** Kode desa "ab3dk7mn" → "AB3D-K7MN" saat diketik. */
export function formatCodeInput(raw: string): string {
  const c = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return c.length > 4 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}
