/**
 * Variabel placeholder `{KEY}` / `{{KEY}}` untuk template surat — tanpa dependensi React.
 * Dipakai `templateRenderer` dan `FooterSignatureBlock` tanpa siklus impor.
 */

/** Baris jabatan singkat di blok TTD (footer), selaras `layanan-surat/_utils/signerPreset`. */
export const SIGNER_JABATAN_FOOTER_KEY = "SIGNER_JABATAN_FOOTER";

/**
 * Samakan variabel template yang beda penamaan (legacy / bahasa) ke satu nilai.
 * Contoh: `nama_kades`, `NAMA_KADES` ↔ `KEPALA_DESA_NAMA`
 */
export function expandTemplateVariableData(
  data: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = { ...data };

  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      const v = out[k];
      if (v != null && String(v).trim() !== "") return String(v);
    }
    return "";
  };

  const setIfEmpty = (key: string, val: string) => {
    if (!val) return;
    if (out[key] == null || String(out[key]).trim() === "") out[key] = val;
  };

  const kepala = pick("KEPALA_DESA_NAMA", "nama_kades", "NAMA_KADES");
  const nip = pick("KEPALA_DESA_NIP", "nip_kades", "NIP_KADES", "NIP_KEPALA_DESA");

  setIfEmpty("KEPALA_DESA_NAMA", kepala);
  setIfEmpty("nama_kades", kepala);
  setIfEmpty("NAMA_KADES", kepala);
  setIfEmpty("KEPALA_DESA_NIP", nip);
  setIfEmpty("nip_kades", nip);
  setIfEmpty("NIP_KEPALA_DESA", nip);

  const kab = pick("KABUPATEN", "kabupaten");
  setIfEmpty("KABUPATEN", kab);
  setIfEmpty("kabupaten", kab);

  const kec = pick("KECAMATAN", "kecamatan");
  setIfEmpty("KECAMATAN", kec);
  setIfEmpty("kecamatan", kec);

  const desa = pick("NAMA_DESA", "DESA", "nama_desa");
  setIfEmpty("NAMA_DESA", desa);
  setIfEmpty("DESA", desa);
  setIfEmpty("nama_desa", desa);

  /**
   * Tanpa key ini, `Object.keys(expanded)` tidak memuat mis. `KEPALA_DESA_NAMA`
   * dan `replaceVariables` tidak pernah mengganti `{KEPALA_DESA_NAMA}` (tampil mentah).
   */
  const mustExistForReplace = [
    "KEPALA_DESA_NAMA",
    "KEPALA_DESA_NIP",
    "NAMA_DESA",
    "DESA",
    "KABUPATEN",
    "KECAMATAN",
    "ALAMAT_DESA",
    "KODE_POS",
    "TANGGAL_SURAT",
    "TANGGAL_CUSTOM",
    "NOMOR_SURAT",
    "PENANDA_TANGAN",
    "SEKRETARIS_NAMA",
    "CAMAT_NAMA",
    "BULAN_ROMAWI",
    "TAHUN",
    "nama_kades",
    "NAMA_KADES",
    "nip_kades",
    "NIP_KEPALA_DESA",
    "ATAS_NAMA",
    "SIGNER_ROLE",
    SIGNER_JABATAN_FOOTER_KEY,
  ];
  for (const k of mustExistForReplace) {
    if (!(k in out)) out[k] = "";
  }
  for (let i = 1; i <= 8; i++) {
    const sj = `SIGNER_JABATAN_SLOT_${i}`;
    if (!(sj in out)) out[sj] = "";
  }
  for (let i = 1; i <= 8; i++) {
    const aan = `SIGNER_SLOT_${i}_ATAS_NAMA`;
    if (!(aan in out)) out[aan] = "";
  }

  return out;
}

/**
 * Ganti placeholder di teks: `{KEY}`, `{{KEY}}`, `{{ KEY }}` (spasi diabaikan).
 */
export const replaceVariables = (
  text: string,
  data: Record<string, string>,
): string => {
  if (text == null || text === "") return "";
  const expanded = expandTemplateVariableData(data);
  let result = text;

  const keys = Object.keys(expanded).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const value = expanded[key] ?? "";
    result = result.split(`{${key}}`).join(value);
    result = result.split(`{{${key}}}`).join(value);
    result = result.split(`{{ ${key} }}`).join(value);
  }

  result = result.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (full, inner: string) => {
    const k = inner.trim();
    if (expanded[k] !== undefined) return expanded[k]!;
    return full;
  });

  return result;
};

/**
 * Teks setelah semua variabel diganti; dipakai untuk menyembunyikan baris NIP
 * bila template berisi `{KEPALA_DESA_NIP}` tetapi data kosong.
 */
export function resolveTemplateText(
  template: string | null | undefined,
  data: Record<string, string>,
): string {
  if (template == null || String(template).trim() === "") return "";
  return replaceVariables(String(template), data).trim();
}
