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

export type CatalogCategory = "Keterangan" | "Pengantar" | "Kependudukan" | "Administrasi Desa";

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

type Penutup = "keterangan" | "pengantar" | "pernyataan" | "kuasa" | "undangan" | "edaran" | "tugas" | "berita_acara" | "dinas";
const PENUTUP: Record<Penutup, string> = {
  keterangan: "Demikian surat keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.",
  pengantar: "Demikian surat pengantar ini dibuat untuk dipergunakan sebagaimana mestinya.",
  pernyataan: "Demikian pernyataan ini dibuat dengan sebenarnya tanpa paksaan dari pihak mana pun.",
  kuasa: "Demikian surat kuasa ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.",
  undangan: "Demikian undangan ini kami sampaikan. Atas kehadiran dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.",
  edaran: "Demikian surat edaran ini disampaikan untuk diketahui dan dilaksanakan sebagaimana mestinya.",
  tugas: "Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.",
  berita_acara: "Demikian berita acara ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.",
  dinas: "Demikian disampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.",
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

/**
 * Kepala surat biasa: Nomor/Lampiran/Perihal, tanggal, dan alamat tujuan.
 * `sisipan` menambah baris (mis. "Dari") dan `diTempat: false` menghapus baris "di tempat".
 */
export const memo = (
  perihal: string | Inline[],
  tujuan: Inline[],
  id = "kepala",
  opts: { sisipan?: Array<{ label: string; value: Inline[] }>; diTempat?: boolean } = {},
): BlockIn => ({
  id,
  type: "memo",
  rows: [
    { label: "Nomor", value: [f("surat.nomor")] },
    ...(opts.sisipan ?? []),
    { label: "Lampiran", value: [t("-")] },
    { label: "Perihal", value: typeof perihal === "string" ? [t(perihal)] : perihal },
  ],
  dateline: datelineSurat,
  addressee: [t("Yth. "), ...tujuan, ...(opts.diTempat === false ? [] : [br, t("di tempat")])],
});

/** Paragraf rata kiri satu baris per `br` (mis. "Hari, tanggal : …"), untuk rincian acara. */
export const rincian = (id: string, ...content: Inline[]): LeafIn => ({ id, type: "paragraph", align: "left", content });

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

/** Surat dinas internal desa (tanpa pemohon): undangan, tugas, edaran, keputusan, berita acara, dst. */
export function internalLetter(o: {
  kind: NonNullable<LetterDocumentInput["kind"]>;
  klasifikasi?: string;
  letterhead?: NonNullable<LetterDocumentInput["letterhead"]>;
  numbering?: NonNullable<LetterDocumentInput["numbering"]>;
  fields?: FieldIn[];
  groups?: GroupIn[];
  body: BlockIn[];
}): LetterDocumentInput {
  return {
    schemaVersion: 2,
    kind: o.kind,
    audience: "internal",
    letterhead: o.letterhead ?? "desa",
    numbering: o.numbering ?? numbering(o.klasifikasi ?? KLASIFIKASI_UMUM),
    people: [],
    fields: o.fields ?? [],
    groups: o.groups ?? [],
    body: o.body,
  };
}

/** Kode klasifikasi umum surat dinas; desa menyesuaikannya dengan klasifikasi arsip setempat. */
export const KLASIFIKASI_UMUM = "000";
