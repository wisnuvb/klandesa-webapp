/**
 * Draf pengaturan kop & tanda tangan yang diedit operator di editor jenis surat — murni (tanpa React/DB)
 * supaya validasi dan perbandingannya bisa diuji. Draf baru disimpan ke profil desa saat operator menekan Simpan.
 */
import { isSafeSrc } from "./document/schema";
import { validateNip } from "./nip";
import { DEFAULT_LETTERHEAD_STYLE, normalizeLetterheadStyle, sameLetterheadStyle, type LetterheadStyle } from "./letterhead";
import type { VillagePreviewContext } from "./values";

export type KopDraft = {
  style: LetterheadStyle;
  logoUrl: string;
  alamat: string;
  kodePos: string;
  telepon: string;
  email: string;
  kadesNama: string;
  kadesNip: string;
  sekdesNama: string;
  camatNama: string;
  camatGolongan: string;
  camatNip: string;
};

export type KopErrors = Partial<Record<Exclude<keyof KopDraft, "style">, string>>;

/** Pola validasi — dipakai bersama oleh formulir dan API agar pesannya tidak bergeser. */
export const KOP_PATTERNS = {
  postalCode: /^\d{5}$/,
  phone: /^[0-9+()\-.\s]{6,20}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

export const KOP_MESSAGES = {
  address: "Alamat kantor desa wajib diisi.",
  postalCode: "Kode pos berupa 5 angka.",
  phone: "Nomor telepon tidak valid.",
  email: "Format email tidak valid.",
  logo: "Logo harus berupa berkas publik (alamat diawali https:// atau /).",
} as const;

export function draftFromContext(ctx: VillagePreviewContext): KopDraft {
  const d = ctx.desa;
  return {
    style: normalizeLetterheadStyle(ctx.kop ?? DEFAULT_LETTERHEAD_STYLE),
    logoUrl: ctx.logoUrl ?? "",
    alamat: d.alamat ?? "",
    kodePos: d.kode_pos ?? "",
    telepon: d.telepon ?? "",
    email: d.email ?? "",
    kadesNama: ctx.pejabat.kades.nama,
    kadesNip: ctx.pejabat.kades.nip,
    sekdesNama: ctx.pejabat.sekdes.nama,
    camatNama: ctx.pejabat.camat.nama,
    camatGolongan: ctx.pejabat.camat.golongan ?? "",
    camatNip: ctx.pejabat.camat.nip,
  };
}

/** Konteks desa dengan isi draf diterapkan (untuk pratinjau langsung di kertas). */
export function applyDraft(ctx: VillagePreviewContext, draft: KopDraft): VillagePreviewContext {
  return {
    ...ctx,
    desa: {
      ...ctx.desa,
      alamat: draft.alamat.trim(),
      kode_pos: draft.kodePos.trim(),
      telepon: draft.telepon.trim(),
      email: draft.email.trim(),
    },
    pejabat: {
      kades: { ...ctx.pejabat.kades, nama: draft.kadesNama.trim(), nip: draft.kadesNip.trim() },
      sekdes: { ...ctx.pejabat.sekdes, nama: draft.sekdesNama.trim() },
      camat: { ...ctx.pejabat.camat, nama: draft.camatNama.trim(), golongan: draft.camatGolongan.trim(), nip: draft.camatNip.trim() },
    },
    logoUrl: draft.logoUrl.trim() && isSafeSrc(draft.logoUrl.trim()) ? draft.logoUrl.trim() : null,
    kop: draft.style,
  };
}

export function validateDraft(d: KopDraft): KopErrors {
  const e: KopErrors = {};
  if (!d.alamat.trim()) e.alamat = KOP_MESSAGES.address;
  const pos = d.kodePos.trim();
  if (pos && !KOP_PATTERNS.postalCode.test(pos)) e.kodePos = KOP_MESSAGES.postalCode;
  const tel = d.telepon.trim();
  if (tel && !KOP_PATTERNS.phone.test(tel)) e.telepon = KOP_MESSAGES.phone;
  const mail = d.email.trim();
  if (mail && !KOP_PATTERNS.email.test(mail)) e.email = KOP_MESSAGES.email;
  const logo = d.logoUrl.trim();
  if (logo && !isSafeSrc(logo)) e.logoUrl = KOP_MESSAGES.logo;
  const kadesNip = validateNip(d.kadesNip);
  if (kadesNip) e.kadesNip = kadesNip;
  const camatNip = validateNip(d.camatNip);
  if (camatNip) e.camatNip = camatNip;
  return e;
}

export function isDirty(saved: KopDraft, draft: KopDraft): boolean {
  return patchFromDraft(saved, draft) !== null;
}

/** Badan PATCH `/api/letters/letterhead` berisi HANYA yang berubah; `null` bila tidak ada perubahan. */
export function patchFromDraft(saved: KopDraft, draft: KopDraft): Record<string, unknown> | null {
  const body: Record<string, unknown> = {};
  const t = (v: string) => v.trim();
  if (t(draft.logoUrl) !== t(saved.logoUrl)) body.logoUrl = t(draft.logoUrl);
  if (t(draft.alamat) !== t(saved.alamat)) body.address = t(draft.alamat);
  if (t(draft.kodePos) !== t(saved.kodePos)) body.postalCode = t(draft.kodePos);
  if (t(draft.telepon) !== t(saved.telepon)) body.phone = t(draft.telepon);
  if (t(draft.email) !== t(saved.email)) body.email = t(draft.email);

  const officials: Record<string, string> = {};
  if (t(draft.kadesNama) !== t(saved.kadesNama)) officials.kepalaDesaNama = t(draft.kadesNama);
  if (t(draft.kadesNip) !== t(saved.kadesNip)) officials.kepalaDesaNip = t(draft.kadesNip);
  if (t(draft.sekdesNama) !== t(saved.sekdesNama)) officials.sekretarisNama = t(draft.sekdesNama);
  if (t(draft.camatNama) !== t(saved.camatNama)) officials.camatNama = t(draft.camatNama);
  if (t(draft.camatGolongan) !== t(saved.camatGolongan)) officials.camatGolongan = t(draft.camatGolongan);
  if (t(draft.camatNip) !== t(saved.camatNip)) officials.camatNip = t(draft.camatNip);
  if (Object.keys(officials).length) body.officials = officials;

  if (!sameLetterheadStyle(draft.style, saved.style)) body.style = draft.style;
  return Object.keys(body).length ? body : null;
}
