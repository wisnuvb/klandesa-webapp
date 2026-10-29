/**
 * Pembangun ringkas untuk katalog surat v2. Tiap template cukup menyusun bagian
 * (judul, pembuka, data orang, tanda tangan) tanpa mengulang struktur dokumen.
 */
import type { Inline, LetterDocumentInput } from "../document/schema";
import type { FormatId } from "../format";
import type { FieldType, PersonFieldKey } from "../registry";

export type BlockIn = LetterDocumentInput["body"][number];
/** Blok biasa (bukan kolom/kondisi): satu-satunya jenis yang boleh berada di dalam kolom atau kondisi. */
export type LeafIn = Exclude<BlockIn, { type: "columns" } | { type: "conditional" }>;
export type FieldIn = NonNullable<LetterDocumentInput["fields"]>[number];
export type GroupIn = NonNullable<LetterDocumentInput["groups"]>[number];
export type PersonRoleIn = NonNullable<LetterDocumentInput["people"]>[number];

export type CatalogCategory = "Keterangan" | "Pengantar" | "Kependudukan";

export type CatalogEntry = {
  catalogKey: string;
  name: string;
  description: string;
  category: CatalogCategory;
  document: LetterDocumentInput;
};

// ------------------------------------------------------------------ teks

export const t = (text: string, marks?: Array<"b" | "i" | "u">): Inline =>
  marks ? { type: "text", text, marks } : { type: "text", text };
export const f = (ref: string, format?: FormatId, fallback?: string): Inline => ({
  type: "field",
  ref,
  ...(format ? { format } : {}),
  ...(fallback ? { fallback } : {}),
});
export const br: Inline = { type: "br" };

export const para = (id: string, ...content: Inline[]): LeafIn => ({ id, type: "paragraph", content });

/** Lokasi + tanggal surat di atas tanda tangan: "Brambang, 29 Oktober 2026". */
export const datelineSurat: Inline[] = [f("desa.nama"), t(", "), f("surat.tanggal", "tanggal")];

// --------------------------------------------------------------- isian

export const field = (
  id: string,
  label: string,
  type: FieldType = "text",
  extra: Partial<Omit<FieldIn, "id" | "label" | "type">> = {},
): FieldIn => ({ id, label, type, ...extra });

export const KEPERLUAN: FieldIn = field("keperluan", "Keperluan", "longtext", {
  placeholder: "mis. persyaratan beasiswa, melamar pekerjaan",
});

export const PEMOHON: PersonRoleIn = { id: "pemohon", label: "Pemohon" };

/** Grup saksi yang bisa diisi dari data warga atau manual. */
export const saksiGroup = (min = 2, max = 5): GroupIn => ({
  id: "saksi",
  label: "Saksi",
  min,
  max,
  personRows: true,
  fields: [field("nama", "Nama", "text"), field("nik", "NIK", "text")],
});

// ----------------------------------------------------------------- bagian

export const judul = (text: string): BlockIn => ({
  id: "judul",
  type: "title",
  title: [t(text, ["b", "u"])],
  showNumber: true,
});

/** "Yang bertanda tangan di bawah ini Kepala Desa …, menerangkan bahwa:" */
export const pembuka = (id = "pembuka"): LeafIn =>
  para(
    id,
    t("Yang bertanda tangan di bawah ini Kepala Desa "),
    f("desa.nama"),
    t(", Kecamatan "),
    f("desa.kecamatan"),
    t(", Kabupaten "),
    f("desa.kabupaten"),
    t(", dengan ini menerangkan dengan sebenarnya bahwa:"),
  );

export const PEMOHON_LENGKAP: PersonFieldKey[] = [
  "nama", "nik", "ttl", "jenis_kelamin", "pekerjaan", "status_perkawinan", "alamat_lengkap",
];
export const PEMOHON_NARASI: PersonFieldKey[] = ["nama", "nik", "ttl", "jenis_kelamin", "pekerjaan", "alamat_lengkap"];
export const PEMOHON_IDENTITAS: PersonFieldKey[] = ["nama", "nik", "ttl", "alamat_lengkap"];
export const PEMOHON_RINGKAS: PersonFieldKey[] = ["nama", "nik", "alamat_lengkap"];

export const personData = (
  role: string,
  fields: PersonFieldKey[],
  id = `data_${role}`,
  labelWidthMm = 45,
): LeafIn => ({ id, type: "personData", role, fields, labelWidthMm });

export const pemohonData = (fields: PersonFieldKey[] = PEMOHON_NARASI, id = "data_pemohon"): LeafIn =>
  personData("pemohon", fields, id);

type Penutup = "keterangan" | "pengantar" | "pernyataan";
const PENUTUP: Record<Penutup, string> = {
  keterangan: "Demikian surat keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.",
  pengantar: "Demikian surat pengantar ini dibuat untuk dipergunakan sebagaimana mestinya.",
  pernyataan: "Demikian pernyataan ini dibuat dengan sebenarnya tanpa paksaan dari pihak mana pun.",
};
export const penutup = (jenis: Penutup = "keterangan", id = "penutup"): LeafIn => para(id, t(PENUTUP[jenis]));

/** Tanda tangan Kepala Desa (bersama stempel desa). */
export const kadesSignature = (id = "ttd", caption?: Inline[]): BlockIn => ({
  id,
  type: "signature",
  dateline: datelineSurat,
  slots: [{ id: "kades", who: { kind: "pejabat", official: "kades" }, stamp: true, ...(caption ? { caption } : {}) }],
});

/** Tanda tangan: saksi (satu kolom per baris grup) di kiri, Kepala Desa di kanan. */
export const saksiKadesSignature = (id = "ttd"): BlockIn => ({
  id,
  type: "signature",
  dateline: datelineSurat,
  slots: [
    { id: "saksi", who: { kind: "grup", group: "saksi" }, caption: [t("Saksi,")] },
    { id: "kades", who: { kind: "pejabat", official: "kades" }, stamp: true },
  ],
});

/** Kepala surat biasa (pengantar): Nomor/Lampiran/Perihal, tanggal, dan alamat tujuan. */
export const memo = (perihal: string, tujuan: Inline[], id = "kepala"): BlockIn => ({
  id,
  type: "memo",
  rows: [
    { label: "Nomor", value: [f("surat.nomor")] },
    { label: "Lampiran", value: [t("-")] },
    { label: "Perihal", value: [t(perihal)] },
  ],
  dateline: datelineSurat,
  addressee: [t("Yth. "), ...tujuan, br, t("di tempat")],
});

// ----------------------------------------------------------------- dokumen

/** Kode klasifikasi arsip di tiap template adalah nilai umum; desa dapat menyesuaikan dengan Perbup setempat. */
export const numbering = (klasifikasi: string): NonNullable<LetterDocumentInput["numbering"]> => ({
  mode: "auto",
  pattern: "{URUT}/{KLASIFIKASI}/{KODE_DESA}/{BULAN_ROMAWI}/{TAHUN}",
  reset: "yearly",
  padding: 3,
  // Semua surat keluar berbagi satu buku agenda.
  counterKey: "umum",
  klasifikasi,
});

export function letter(o: {
  kind?: NonNullable<LetterDocumentInput["kind"]>;
  klasifikasi: string;
  people?: PersonRoleIn[];
  fields?: FieldIn[];
  groups?: GroupIn[];
  body: BlockIn[];
}): LetterDocumentInput {
  return {
    schemaVersion: 2,
    kind: o.kind ?? "keterangan",
    audience: "warga",
    letterhead: "desa",
    numbering: numbering(o.klasifikasi),
    people: o.people ?? [PEMOHON],
    fields: o.fields ?? [],
    groups: o.groups ?? [],
    body: o.body,
  };
}
