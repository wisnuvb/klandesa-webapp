import { parse } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type { DesaSettings } from "../types";

/** Mulai hari kalender zona waktu lokal (tanpa jam). */
export function startOfLocalDay(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Teks tanggal untuk variabel `{TANGGAL_SURAT}` (Bahasa Indonesia). */
export function formatTanggalSuratId(d: Date): string {
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Coba mengurai tanggal dari string yang disimpan di form (hasil `toLocaleDateString id-ID`). */
export function parseIndonesianLetterDateString(
  s: string | undefined,
): Date | null {
  if (!s?.trim()) return null;
  const t = s.trim();
  const variants = ["d MMMM yyyy", "dd MMMM yyyy", "d MMM yyyy"];
  for (const pattern of variants) {
    try {
      const parsed = parse(t, pattern, new Date(), { locale: idLocale });
      if (!Number.isNaN(parsed.getTime())) return startOfLocalDay(parsed);
    } catch {
      // abaikan format tanggal yang tidak cocok
    }
  }
  for (const pattern of ["d MMMM yyyy", "dd MMMM yyyy"]) {
    try {
      const parsed = parse(t, pattern, new Date());
      if (!Number.isNaN(parsed.getTime())) return startOfLocalDay(parsed);
    } catch {
      // abaikan format tanggal yang tidak cocok
    }
  }
  return null;
}

/** Nomor untuk slot `{NOMOR_SURAT}` di template: hanya digit (huruf/format panjang dibuang). */
export function sanitizeNomorUrutSegment(value: string): string {
  return value.replace(/\D/g, "");
}

/** Variabel wilayah administratif yang diisi dari Pengaturan Desa / snapshot desa. */
export const WILAYAH_ADMIN_VARIABLES = [
  "KABUPATEN",
  "KECAMATAN",
  "DESA",
  "NAMA_DESA",
  "NAMA_KABUPATEN",
  "NAMA_KECAMATAN",
] as const;

/** Isi field wilayah + penandatangan + pejabat (sesuai variabel di template) dari pengaturan desa. */
export function applyWilayahDariPengaturanDesa(
  form: Record<string, string>,
  template: { variables: string[] },
  desa: DesaSettings,
): void {
  const vars = new Set(template.variables);
  if (vars.has("KABUPATEN")) form.KABUPATEN = desa.kabupaten;
  if (vars.has("NAMA_KABUPATEN")) form.NAMA_KABUPATEN = desa.kabupaten;
  if (vars.has("KECAMATAN")) form.KECAMATAN = desa.kecamatan;
  if (vars.has("NAMA_KECAMATAN")) form.NAMA_KECAMATAN = desa.kecamatan;
  if (vars.has("DESA")) form.DESA = desa.nama_desa;
  if (vars.has("NAMA_DESA")) form.NAMA_DESA = desa.nama_desa;

  const namaKades = desa.kepala_desa_nama;
  const nipKades = desa.kepala_desa_nip;
  if (vars.has("KEPALA_DESA_NAMA")) form.KEPALA_DESA_NAMA = namaKades;
  if (vars.has("nama_kades")) form.nama_kades = namaKades;
  if (vars.has("NAMA_KADES")) form.NAMA_KADES = namaKades;
  if (vars.has("KEPALA_DESA_NIP")) form.KEPALA_DESA_NIP = nipKades;
  if (vars.has("nip_kades")) form.nip_kades = nipKades;
  if (vars.has("NIP_KEPALA_DESA")) form.NIP_KEPALA_DESA = nipKades;
}

/** Variabel pertama di template untuk combobox pencarian warga (nama/NIK). */
export function getResidentPickerVariable(variables: string[]): string | null {
  const prio = new Set(["NAMA_LENGKAP", "NAMA", "NIK"]);
  for (const v of variables) {
    if (prio.has(v)) return v;
  }
  return null;
}

/** Kunci form untuk edit manual satu tingkat wilayah (prioritas nama_* bila ada di template). */
export function pickWilayahEditorKey(
  vars: Set<string>,
  kind: "kabupaten" | "kecamatan" | "desa",
): string | null {
  const order = {
    kabupaten: ["NAMA_KABUPATEN", "KABUPATEN"],
    kecamatan: ["NAMA_KECAMATAN", "KECAMATAN"],
    desa: ["NAMA_DESA", "DESA"],
  }[kind];
  for (const k of order) {
    if (vars.has(k)) return k;
  }
  return null;
}

/** Nilai tampilan ringkas kab/kec/desa (gabungan alias template + fallback). */
export function wilayahDisplayValue(
  form: Record<string, string>,
  desa: DesaSettings,
  kind: "kabupaten" | "kecamatan" | "desa",
): string {
  if (kind === "kabupaten") {
    return form.NAMA_KABUPATEN || form.KABUPATEN || desa.kabupaten;
  }
  if (kind === "kecamatan") {
    return form.NAMA_KECAMATAN || form.KECAMATAN || desa.kecamatan;
  }
  return form.NAMA_DESA || form.DESA || desa.nama_desa;
}
