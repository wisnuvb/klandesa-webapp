import type { TemplateBody } from "../types";
import { DEFAULT_FOOTER_CONFIG } from "@/components/template-builder/types";
import {
  parseSignerSlotSource,
  parseSignerSource,
} from "./signerPreset";

const BRACE_RE = /\{([A-Z0-9_]+)\}/g;

export function extractPlaceholderKeysFromTemplateField(
  templateText: string | null | undefined,
): string[] {
  if (!templateText || typeof templateText !== "string") return [];
  const keys: string[] = [];
  for (const m of templateText.matchAll(BRACE_RE)) {
    if (m[1]) keys.push(m[1]);
  }
  return keys;
}

function resolveFooterConfig(template: Pick<TemplateBody, "footer" | "shared_footer">) {
  return template.footer || template.shared_footer || DEFAULT_FOOTER_CONFIG;
}

/** Jumlah slot TTD di footer (= jumlah blok penandatang di template). Min 1 untuk fallback tunggal. */
export function getFooterSignerSlotsCount(
  template: Pick<TemplateBody, "footer" | "shared_footer">,
): number {
  const f = resolveFooterConfig(template);
  const n = f?.signers?.length ?? 0;
  return n > 0 ? n : 1;
}

/**
 * Variabel nama/NIP yang dipakai slot ke-`slotIndex` (0 = pertama / kiri, dst.).
 */
export function getFooterSignerPlaceholderKeys(
  template: Pick<TemplateBody, "footer" | "shared_footer">,
  slotIndex: number,
): { nameKeys: string[]; nipKeys: string[] } {
  const f = resolveFooterConfig(template);
  const signers = f?.signers;
  if (!signers?.length) {
    return slotIndex === 0
      ? { nameKeys: ["KEPALA_DESA_NAMA"], nipKeys: ["KEPALA_DESA_NIP"] }
      : { nameKeys: [], nipKeys: [] };
  }
  if (slotIndex < 0 || slotIndex >= signers.length) {
    return { nameKeys: [], nipKeys: [] };
  }
  const signer = signers[slotIndex];
  const nameKeys = extractPlaceholderKeysFromTemplateField(String(signer.name ?? ""));
  const nipKeys = extractPlaceholderKeysFromTemplateField(String(signer.nip ?? ""));
  return {
    nameKeys: nameKeys.length ? nameKeys : slotIndex === 0 ? ["KEPALA_DESA_NAMA"] : [],
    nipKeys: nipKeys.length ? nipKeys : slotIndex === 0 ? ["KEPALA_DESA_NIP"] : [],
  };
}

/** Variabel nama/NIP slot pertama — alias `getFooterSignerPlaceholderKeys(template, 0)`. */
export function getPrimaryFooterSignerPlaceholderKeys(
  template: Pick<TemplateBody, "footer" | "shared_footer">,
): { nameKeys: string[]; nipKeys: string[] } {
  return getFooterSignerPlaceholderKeys(template, 0);
}

/** Semua key variabel yang dilindungi panel penandatang (tidak lagi di-grid pemohon). */
export function collectFooterSignerReservedVariableKeys(
  template: Pick<TemplateBody, "footer" | "shared_footer">,
): Set<string> {
  const out = new Set<string>();
  const n = getFooterSignerSlotsCount(template);
  for (let i = 0; i < n; i++) {
    const { nameKeys, nipKeys } = getFooterSignerPlaceholderKeys(template, i);
    for (const k of nameKeys) out.add(k);
    for (const k of nipKeys) out.add(k);
  }
  return out;
}

export type OfficialRow = {
  id: number;
  name: string;
  nik: string;
  certification?: string | null;
  /** Dari `/api/officials` — untuk label dropdown. */
  position?: { id: number; name: string; level?: number } | null;
};

/**
 * Isi variabel footer slot tertentu dari pilihan perangkat desa (nama + NIP/SK).
 */
export function applyOfficialToFooterSlotPlaceholders(
  form: Record<string, string>,
  template: Pick<TemplateBody, "footer" | "shared_footer">,
  slotIndex: number,
  official: OfficialRow,
): void {
  const { nameKeys, nipKeys } = getFooterSignerPlaceholderKeys(template, slotIndex);
  const nama = String(official.name ?? "").trim();
  const nipVal = pickNipForFooter(official);
  for (const k of nameKeys) {
    form[k] = nama;
  }
  for (const k of nipKeys) {
    form[k] = nipVal;
  }
}

/** Isi slot pertama — kompatibilitas nama lama. */
export function applyOfficialToPrimaryFooterPlaceholders(
  form: Record<string, string>,
  template: Pick<TemplateBody, "footer" | "shared_footer">,
  official: OfficialRow,
): void {
  applyOfficialToFooterSlotPlaceholders(form, template, 0, official);
}

/**
 * Isi variabel footer slot tertentu dari input manual.
 */
export function applyManualToFooterSlotPlaceholders(
  form: Record<string, string>,
  template: Pick<TemplateBody, "footer" | "shared_footer">,
  slotIndex: number,
  manualNama: string,
  manualNip: string,
): void {
  const { nameKeys, nipKeys } = getFooterSignerPlaceholderKeys(template, slotIndex);
  const nama = String(manualNama ?? "").trim();
  const nip = String(manualNip ?? "").trim();
  for (const k of nameKeys) {
    form[k] = nama;
  }
  for (const k of nipKeys) {
    form[k] = nip;
  }
}

export function applyManualToPrimaryFooterPlaceholders(
  form: Record<string, string>,
  template: Pick<TemplateBody, "footer" | "shared_footer">,
  manualNama: string,
  manualNip: string,
): void {
  applyManualToFooterSlotPlaceholders(form, template, 0, manualNama, manualNip);
}

function pickNipForFooter(official: OfficialRow): string {
  const cert = String(official.certification ?? "").trim();
  if (cert) {
    const digits = cert.replace(/\D/g, "");
    if (digits.length >= 8) return digits.slice(0, 32);
  }
  return String(official.nik ?? "").trim();
}

/** Baris identitas di footer: NIP untuk perangkat (`official`/`preset` ke variabel ASN), NIK untuk pemohon/manual & template yang mem-bind variabel NIK. */
export type FooterSignerIdLabelKind = "nip" | "nik";

/** True jika pola variabel footer mengacu Nomor Induk Kependudukan bukan ASN. */
function nipPlaceholderKeysLooksLikeNik(nipKeys: string[]): boolean {
  return nipKeys.some(
    (k) =>
      k === "NIK" ||
      /(^|_)NIK($|_)/i.test(k) ||
      (k.includes("NIK") && !/\bNIP\b/i.test(k)),
  );
}

/**
 * Deduce label footer baris kedua nama (NIP vs NIK) untuk preview/cetak.
 * Tidak bergantung pada nama variabel salah — `manual` ⇒ NIK; `official` ⇒ NIP; `preset` mengikuti template + placeholder.
 */
export function inferFooterSignerIdLabelKind(
  signerNipTemplate: string | null | undefined,
  slotIndex: number,
  data: Record<string, string>,
): FooterSignerIdLabelKind {
  const nipKeys = extractPlaceholderKeysFromTemplateField(
    String(signerNipTemplate ?? ""),
  );
  const looksNik = nipPlaceholderKeysLooksLikeNik(nipKeys);

  const src =
    slotIndex <= 0 ? parseSignerSource(data) : parseSignerSlotSource(data, slotIndex);

  if (src === "manual") return "nik";
  if (src === "official") return "nip";
  if (src === "preset") return looksNik ? "nik" : "nip";
  return looksNik ? "nik" : "nip";
}

export function buildFooterSignerPatchFromOfficial(
  template: Pick<TemplateBody, "footer" | "shared_footer">,
  slotIndex: number,
  official: OfficialRow,
): Record<string, string> {
  const out: Record<string, string> = {};
  applyOfficialToFooterSlotPlaceholders(out, template, slotIndex, official);
  return out;
}

export function buildFooterSignerPatchFromManual(
  template: Pick<TemplateBody, "footer" | "shared_footer">,
  slotIndex: number,
  nama: string,
  nip: string,
): Record<string, string> {
  const out: Record<string, string> = {};
  applyManualToFooterSlotPlaceholders(out, template, slotIndex, nama, nip);
  return out;
}

export function buildPrimarySignerPatchFromOfficial(
  template: Pick<TemplateBody, "footer" | "shared_footer">,
  official: OfficialRow,
): Record<string, string> {
  return buildFooterSignerPatchFromOfficial(template, 0, official);
}

export function buildPrimarySignerPatchFromManual(
  template: Pick<TemplateBody, "footer" | "shared_footer">,
  nama: string,
  nip: string,
): Record<string, string> {
  return buildFooterSignerPatchFromManual(template, 0, nama, nip);
}
