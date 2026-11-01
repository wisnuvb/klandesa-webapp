/**
 * Pembantu tampilan wilayah administratif untuk dokumen cetak. Data desa kadang sudah memuat kata
 * "Kecamatan", "Kabupaten", atau "Kota" di depan nama; helper ini menambah awalan hanya bila belum ada.
 * Murni dan aman dipakai klien maupun server.
 */

const clean = (v: unknown): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

/** "Sawangan" -> "Kecamatan Sawangan"; "Kecamatan Sawangan" dan "Kec. Sawangan" tidak digandakan. */
export function districtLabel(v: unknown): string {
  const s = clean(v);
  if (!s) return "";
  return /^(kecamatan|kec\.?)(\s|$)/i.test(s) ? s : `Kecamatan ${s}`;
}

/** "Karanganyar" -> "Kabupaten Karanganyar"; "Kota Depok" dan "Kabupaten X" dipertahankan; "Kotabaru" bukan awalan "Kota". */
export function regencyLabel(v: unknown): string {
  const s = clean(v);
  if (!s) return "";
  return /^(kabupaten|kab\.?|kota|kotamadya|kota administrasi)(\s|$)/i.test(s) ? s : `Kabupaten ${s}`;
}

/** "Kecamatan X, Kabupaten Y" tanpa awalan ganda dan tanpa koma menggantung bila salah satunya kosong. */
export function regionLine(district: unknown, regency: unknown): string {
  return [districtLabel(district), regencyLabel(regency)].filter(Boolean).join(", ");
}
