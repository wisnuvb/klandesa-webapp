/**
 * Nilai yang mengisi sebuah dokumen: orang berperan, isian tambahan, baris grup, plus data
 * desa/pejabat/surat. Bentuk yang sama dipakai klien (pratinjau), server (penyimpanan, render
 * HTML) dan renderer. Semua nilai berupa string; format (tanggal, terbilang) diterapkan saat tampil.
 */
import { applyFormat, formatHariId, romanMonth, type FormatId } from "./format";
import {
  DESA_FIELDS,
  OFFICIAL_IDS,
  OFFICIAL_FIELDS,
  PERSON_FIELDS,
  SURAT_FIELDS,
  parseRef,
  type FieldType,
  type OfficialId,
  type PersonFieldKey,
} from "./registry";
import type { Inline, LetterDocument } from "./document/schema";

export type PersonValues = Partial<Record<PersonFieldKey, string>>;
export type OfficialValues = { nama: string; nip: string; jabatan: string };

export type LetterValues = {
  /** peran → isian orang (`pemohon` → { nama, nik, … }) */
  people: Record<string, PersonValues>;
  /** id isian tambahan → nilai */
  fields: Record<string, string>;
  /** id grup → baris; tiap baris: id isian grup → nilai */
  groups: Record<string, Array<Record<string, string>>>;
  desa: Record<string, string>;
  pejabat: Record<OfficialId, OfficialValues>;
  surat: Record<string, string>;
  /** Logo desa untuk kop (path relatif atau https). */
  logoUrl?: string;
};

const blankOfficial = (jabatan: string): OfficialValues => ({ nama: "", nip: "", jabatan });

export function emptyLetterValues(): LetterValues {
  return {
    people: {},
    fields: {},
    groups: {},
    desa: {},
    pejabat: {
      kades: blankOfficial("Kepala Desa"),
      sekdes: blankOfficial("Sekretaris Desa"),
      camat: blankOfficial("Camat"),
    },
    surat: {},
  };
}

/** Data surat itu sendiri. `tanggal` disimpan ISO (yyyy-mm-dd); nomor boleh kosong (belum terbit). */
export function buildSuratValues(input: { date: Date; nomor?: string; tempat?: string }): Record<string, string> {
  const y = input.date.getFullYear();
  const m = input.date.getMonth() + 1;
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(input.date.getDate()).padStart(2, "0")}`;
  return {
    nomor: input.nomor ?? "",
    tanggal: iso,
    hari: formatHariId(iso) ?? "",
    bulan_romawi: romanMonth(m),
    tahun: String(y),
    tempat: input.tempat ?? "",
  };
}

/** Isian contoh semua kolom — untuk pratinjau template di kanvas. */
export function sampleLetterValues(doc: Pick<LetterDocument, "people" | "fields" | "groups">): LetterValues {
  const v = emptyLetterValues();
  const personSample = Object.fromEntries(PERSON_FIELDS.map((f) => [f.key, f.example])) as PersonValues;
  for (const r of doc.people) v.people[r.id] = { ...personSample };
  for (const f of doc.fields) v.fields[f.id] = f.type === "choice" ? (f.options?.[0] ?? "") : `[${f.label}]`;
  for (const g of doc.groups) {
    const row = Object.fromEntries(g.fields.map((f) => [f.id, `[${f.label}]`]));
    v.groups[g.id] = Array.from({ length: Math.max(g.min, 1) }, () => ({ ...row }));
  }
  v.desa = Object.fromEntries(DESA_FIELDS.map((f) => [f.key, f.example]));
  for (const id of OFFICIAL_IDS) {
    v.pejabat[id] = {
      nama: OFFICIAL_FIELDS[0].example,
      nip: OFFICIAL_FIELDS[1].example,
      jabatan: v.pejabat[id].jabatan,
    };
  }
  v.surat = Object.fromEntries(SURAT_FIELDS.map((f) => [f.key, f.example]));
  v.surat.tanggal = "2026-10-29";
  return v;
}

/** Nilai mentah suatu rujukan; "" bila tidak ada. Tidak pernah melempar. */
export function resolveRef(ref: string, v: LetterValues): string {
  const p = parseRef(ref);
  if (!p) return "";
  switch (p.kind) {
    case "person": return v.people[p.role]?.[p.field] ?? "";
    case "desa": return v.desa[p.field] ?? "";
    case "pejabat": return v.pejabat[p.official]?.[p.field as keyof OfficialValues] ?? "";
    case "surat": return v.surat[p.field] ?? "";
    case "isian": return v.fields[p.id] ?? "";
  }
}

/** Jenis isian suatu rujukan (dipakai untuk memformat tanggal otomatis). */
export function refType(ref: string, doc: Pick<LetterDocument, "fields">): FieldType | null {
  const p = parseRef(ref);
  if (!p) return null;
  if (p.kind === "person") return PERSON_FIELDS.find((f) => f.key === p.field)?.type ?? null;
  if (p.kind === "desa") return DESA_FIELDS.find((f) => f.key === p.field)?.type ?? null;
  if (p.kind === "surat") return SURAT_FIELDS.find((f) => f.key === p.field)?.type ?? null;
  if (p.kind === "pejabat") return "text";
  return doc.fields.find((f) => f.id === p.id)?.type ?? null;
}

/** Nilai tampil satu rujukan: format eksplisit, atau tanggal Indonesia otomatis untuk isian bertipe tanggal. */
export function displayValue(
  ref: string,
  v: LetterValues,
  doc: Pick<LetterDocument, "fields">,
  format?: FormatId,
  fallback?: string,
): string {
  const raw = resolveRef(ref, v);
  if (raw === "") return fallback ?? "";
  const auto: FormatId | undefined = !format && refType(ref, doc) === "date" ? "tanggal" : format;
  return applyFormat(raw, auto);
}

/** Teks polos dari rangkaian Inline (untuk nama pemohon, ringkasan, tes). */
export function inlinesToText(
  inlines: readonly Inline[] | undefined,
  v: LetterValues,
  doc: Pick<LetterDocument, "fields">,
): string {
  let out = "";
  for (const n of inlines ?? []) {
    if (n.type === "text") out += n.text;
    else if (n.type === "br") out += "\n";
    else out += displayValue(n.ref, v, doc, n.format, n.fallback);
  }
  return out;
}

export function evaluateCondition(
  c: { ref: string; op: "filled" | "empty" | "eq" | "neq"; value?: string },
  v: LetterValues,
): boolean {
  const val = resolveRef(c.ref, v).trim();
  switch (c.op) {
    case "filled": return val !== "";
    case "empty": return val === "";
    case "eq": return val === (c.value ?? "");
    case "neq": return val !== (c.value ?? "");
  }
}

/** Isian grup untuk satu baris; id yang sama dengan isian orang diisi dari data warga. */
export function personRowFromPerson(groupFieldIds: readonly string[], person: PersonValues): Record<string, string> {
  const row: Record<string, string> = {};
  for (const id of groupFieldIds) row[id] = (person as Record<string, string | undefined>)[id] ?? "";
  return row;
}
