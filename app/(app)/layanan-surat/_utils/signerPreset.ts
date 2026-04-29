import type { DesaSettings, TemplateBody } from "../types";

import { SIGNER_JABATAN_FOOTER_KEY } from "@/utils/templateVariables";

export { SIGNER_JABATAN_FOOTER_KEY };

/** Baris «a.n. …» kolom pertama — sama seperti `SIGNER_ON_BEHALF_KEY` di FooterSignatureBlock */
export const ATAS_NAMA_SLOTX0_FORM_KEY = "ATAS_NAMA" as const;

/** Kunci «atas nama» per slot (slot pertama = ATAS_NAMA). */
export function signerSlotOnBehalfKey(slotIndex: number): string {
  return slotIndex <= 0 ? ATAS_NAMA_SLOTX0_FORM_KEY : `SIGNER_SLOT_${slotIndex}_ATAS_NAMA`;
}

/** Peran struktural yang bisa dipilih di form (+ label di footer / PENANDA). */
export const SIGNER_ROLE_VALUES = [
  "kepala_desa",
  "sekretaris",
  "bendahara_desa",
  "kaur_umum",
  "kasi_pemerintahan",
  "kasi_kesejahteraan",
  "kasi_pelayanan",
  "camat",
] as const;

export type SignerRole = (typeof SIGNER_ROLE_VALUES)[number];

const ROLE_SET = new Set<string>(SIGNER_ROLE_VALUES);

export const SIGNER_ROLE_OPTIONS: readonly { value: SignerRole; label: string }[] = [
  { value: "kepala_desa", label: "Kepala Desa" },
  { value: "sekretaris", label: "Sekretaris Desa" },
  { value: "bendahara_desa", label: "Bendahara Desa" },
  { value: "kaur_umum", label: "Kaur Umum" },
  { value: "kasi_pemerintahan", label: "Kasi Pemerintahan" },
  { value: "kasi_kesejahteraan", label: "Kasi Kesejahteraan & Sosial" },
  { value: "kasi_pelayanan", label: "Kasi Pelayanan" },
  { value: "camat", label: "Camat" },
];

/** Slot 0: peran utama (arsip/API). Untuk lebih dari satu TTD juga dipakai per slot pertama. */
export const SIGNER_ROLE_FORM_KEY = "SIGNER_ROLE" as const;

/** Override per slot (opsional): `SIGNER_ROLE` untuk slot pertama, `SIGNER_SLOT_n_ROLE` untuk n≥1 — kosong = ikuti teks/footer template. */
export function signerSlotRoleKey(slotIndex: number): string {
  return slotIndex <= 0 ? SIGNER_ROLE_FORM_KEY : `SIGNER_SLOT_${slotIndex}_ROLE`;
}

/**
 * Variabel footer untuk baris jabatan pendek kolom slot (slot pertama = SIGNER_JABATAN_FOOTER).
 */
export function signerSlotJabatanKey(slotIndex: number): string {
  return slotIndex <= 0 ? SIGNER_JABATAN_FOOTER_KEY : `SIGNER_JABATAN_SLOT_${slotIndex}`;
}

/** Nilai eksplisit dari form atau null jika kosong (= tidak ada override untuk slot ini). */
export function parseSignerRoleOverrideForSlot(
  form: Record<string, string>,
  slotIndex: number,
): SignerRole | null {
  const raw = String(form[signerSlotRoleKey(slotIndex)] ?? "").trim();
  if (!raw || !ROLE_SET.has(raw)) return null;
  return raw as SignerRole;
}

/** Sumber nama di blok TTD: preset peran | perangkat desa | ketik manual. */
export const SIGNER_SOURCE_FORM_KEY = "SIGNER_SOURCE" as const;
export type SignerSourcePreset = "preset" | "official" | "manual";

export function parseSignerSource(form: Record<string, string>): SignerSourcePreset {
  const raw = String(form[SIGNER_SOURCE_FORM_KEY] ?? "").trim();
  if (raw === "official") return "official";
  if (raw === "manual") return "manual";
  return "preset";
}

export const SIGNER_OFFICIAL_ID_KEY = "SIGNER_OFFICIAL_ID" as const;

/** Kunci form untuk sumbernama per slot (slot 0 = `SIGNER_SOURCE`, slot 2+ = `SIGNER_SLOT_n_SOURCE`). */
export function signerSlotSourceKey(slotIndex: number): string {
  return slotIndex <= 0 ? SIGNER_SOURCE_FORM_KEY : `SIGNER_SLOT_${slotIndex}_SOURCE`;
}

export function signerSlotOfficialIdKey(slotIndex: number): string {
  return slotIndex <= 0 ? SIGNER_OFFICIAL_ID_KEY : `SIGNER_SLOT_${slotIndex}_OFFICIAL_ID`;
}

/** Metadata form penandatang per slot — tidak di-grid pemohon. */
export function isSignerSlotPersistenceKey(variable: string): boolean {
  return (
    /^SIGNER_SLOT_\d+_(SOURCE|OFFICIAL_ID|ROLE)$/.test(variable) ||
    /^SIGNER_SLOT_\d+_ATAS_NAMA$/.test(variable) ||
    /^SIGNER_JABATAN_SLOT_\d+$/.test(variable)
  );
}

/** Sumber nama untuk slot tertentu; slot 0 memakai `SIGNER_SOURCE` agar cocok dengan data surat lama. */
export function parseSignerSlotSource(
  form: Record<string, string>,
  slotIndex: number,
): SignerSourcePreset {
  if (slotIndex <= 0) return parseSignerSource(form);
  const raw = String(form[signerSlotSourceKey(slotIndex)] ?? "").trim();
  if (raw === "official") return "official";
  if (raw === "manual") return "manual";
  return "preset";
}

/**
 * Satu baris jabatan di blok TTD footer (singkat), tidak sama dengan pengantar kalimat isi ({PENANDA_TANGAN}).
 */
export function footerRoleLabel(role: SignerRole, desa: DesaSettings): string {
  switch (role) {
    case "sekretaris":
      return "Sekretaris Desa";
    case "bendahara_desa":
      return "Bendahara Desa";
    case "kaur_umum":
      return "Kaur Umum";
    case "kasi_pemerintahan":
      return "Kasi Pemerintahan";
    case "kasi_kesejahteraan":
      return "Kasi Kesejahteraan dan Sosial";
    case "kasi_pelayanan":
      return "Kasi Pelayanan";
    case "camat":
      return (
        String(desa.camat_jabatan ?? "")
          .replace(/^camat\b/i, "Camat")
          .trim() || "Camat"
      );
    default:
      return "Kepala Desa";
  }
}

/**
 * Nama penandatangan untuk kolom DB (display / arsip).
 */
export function signerDisplayName(role: SignerRole, desa: DesaSettings): string {
  switch (role) {
    case "sekretaris":
      return desa.sekretaris_nama?.trim() || desa.kepala_desa_nama;
    case "camat":
      return desa.camat_nama?.trim() || "";
    case "bendahara_desa":
    case "kaur_umum":
    case "kasi_pemerintahan":
    case "kasi_kesejahteraan":
    case "kasi_pelayanan":
      return desa.kepala_desa_nama?.trim() || "";
    default:
      return desa.kepala_desa_nama?.trim() || "";
  }
}

/**
 * Mengisi PENANDA_TANGAN, variabel pejabat utama (nama/NIP) untuk blok TTD/footer.
 * Optional: `skipRoleFooterPersistence` — jangan tulis SIGNER_ROLE / SIGNER_JABATAN_FOOTER (multi-TTD inherit).
 */
export function applySignerPresetToForm(
  form: Record<string, string>,
  template: Pick<TemplateBody, "variables">,
  role: SignerRole,
  desa: DesaSettings,
  opts?: { skipRoleFooterPersistence?: boolean },
): void {
  if (!opts?.skipRoleFooterPersistence) {
    form[SIGNER_ROLE_FORM_KEY] = role;
    form[SIGNER_JABATAN_FOOTER_KEY] = footerRoleLabel(role, desa);
  }
  const vars = new Set(template.variables || []);

  const setPejabatKadesVars = () => {
    const n = desa.kepala_desa_nama || "";
    const nip = desa.kepala_desa_nip || "";
    if (vars.has("KEPALA_DESA_NAMA")) form.KEPALA_DESA_NAMA = n;
    if (vars.has("nama_kades")) form.nama_kades = n;
    if (vars.has("NAMA_KADES")) form.NAMA_KADES = n;
    if (vars.has("KEPALA_DESA_NIP")) form.KEPALA_DESA_NIP = nip;
    if (vars.has("nip_kades")) form.nip_kades = nip;
    if (vars.has("NIP_KEPALA_DESA")) form.NIP_KEPALA_DESA = nip;
  };

  const setSecretaryAsSigningName = () => {
    const n = desa.sekretaris_nama || "";
    const nip = "";
    if (vars.has("KEPALA_DESA_NAMA")) form.KEPALA_DESA_NAMA = n;
    if (vars.has("nama_kades")) form.nama_kades = n;
    if (vars.has("NAMA_KADES")) form.NAMA_KADES = n;
    if (vars.has("SEKRETARIS_NAMA")) form.SEKRETARIS_NAMA = n;
    if (vars.has("KEPALA_DESA_NIP")) form.KEPALA_DESA_NIP = nip;
    if (vars.has("nip_kades")) form.nip_kades = nip;
    if (vars.has("NIP_KEPALA_DESA")) form.NIP_KEPALA_DESA = nip;
  };

  const setCamatAsSigningName = () => {
    const n = desa.camat_nama || "";
    if (vars.has("KEPALA_DESA_NAMA")) form.KEPALA_DESA_NAMA = n;
    if (vars.has("nama_kades")) form.nama_kades = n;
    if (vars.has("NAMA_KADES")) form.NAMA_KADES = n;
    if (vars.has("CAMAT_NAMA")) form.CAMAT_NAMA = n;
    if (vars.has("KEPALA_DESA_NIP")) form.KEPALA_DESA_NIP = "";
    if (vars.has("nip_kades")) form.nip_kades = "";
    if (vars.has("NIP_KEPALA_DESA")) form.NIP_KEPALA_DESA = "";
  };

  const namaDesaPart = desa.nama_desa.trim();
  const pejabatLainFallback = `${footerRoleLabel(role, desa)}${namaDesaPart ? ` ${namaDesaPart}` : ""}`.trim();

  switch (role) {
    case "sekretaris":
      form.PENANDA_TANGAN = `${desa.sekretaris_jabatan || "Sekretaris Desa"} ${desa.nama_desa}`.trim();
      setSecretaryAsSigningName();
      break;
    case "camat":
      form.PENANDA_TANGAN = `${desa.camat_jabatan || "Camat"}, Kecamatan ${desa.kecamatan}`.trim();
      setCamatAsSigningName();
      break;
    case "bendahara_desa":
    case "kaur_umum":
    case "kasi_pemerintahan":
    case "kasi_kesejahteraan":
    case "kasi_pelayanan":
      form.PENANDA_TANGAN = pejabatLainFallback;
      setPejabatKadesVars();
      break;
    default:
      form.PENANDA_TANGAN = "Kepala Desa " + desa.nama_desa;
      setPejabatKadesVars();
  }
}

export function parseSignerRoleFromForm(
  form: Record<string, string>,
): SignerRole {
  const o = parseSignerRoleOverrideForSlot(form, 0);
  if (o) return o;
  return "kepala_desa";
}
