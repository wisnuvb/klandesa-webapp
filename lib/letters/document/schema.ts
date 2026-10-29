/**
 * Skema dokumen surat v2. Disimpan di `MailTemplate.templateStructure` (JSON) dengan
 * `schemaVersion: 2`. Tidak pernah berisi HTML/skrip: teks kaya berupa struktur `Inline`,
 * dan semua nilai dirender lewat escape otomatis React. Batas ukuran ada di skema sehingga
 * dokumen dari klien tidak bisa membengkak.
 *
 * Fleksibilitas datang dari komposisi bagian (blok), bukan dari fitur khusus per jenis surat.
 */
import { z } from "zod";
import { FORMAT_IDS } from "../format";
import { FONT_IDS, PAPER_SIZE_IDS } from "../paper";
import { NUMBER_PATTERN_MAX, DEFAULT_NUMBER_PATTERN } from "../numbering";
import { REF_PATTERN } from "../registry";

export const LIMITS = {
  blocks: 400,
  childrenPerContainer: 60,
  inlinePerText: 200,
  textLength: 5_000,
  people: 12,
  fields: 60,
  groups: 6,
  groupFields: 12,
  groupRows: 50,
  options: 30,
  signatureSlots: 8,
  tableRows: 100,
  tableColumns: 8,
  listItems: 50,
  totalNodes: 6_000,
} as const;

const Id = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,39}$/, "ID hanya huruf, angka, _ dan -");
const SnakeId = z.string().regex(/^[a-z][a-z0-9_]{0,29}$/, "Gunakan huruf kecil, angka, dan _");
const Label = z.string().trim().min(1).max(80);
const Align = z.enum(["left", "center", "right", "justify"]);
const Ref = z.string().max(80).regex(REF_PATTERN, "Rujukan isian tidak valid");

// ---------------------------------------------------------------- teks bergaya

const InlineText = z.object({
  type: z.literal("text"),
  text: z.string().max(LIMITS.textLength),
  marks: z.array(z.enum(["b", "i", "u"])).max(3).optional(),
});
const InlineField = z.object({
  type: z.literal("field"),
  ref: Ref,
  format: z.enum(FORMAT_IDS).optional(),
  /** Tampil bila nilai kosong (mis. "-"). */
  fallback: z.string().max(100).optional(),
});
const InlineBreak = z.object({ type: z.literal("br") });
export const InlineSchema = z.discriminatedUnion("type", [InlineText, InlineField, InlineBreak]);
const Inlines = z.array(InlineSchema).max(LIMITS.inlinePerText);

export type Inline = z.infer<typeof InlineSchema>;

// -------------------------------------------------------------------- kondisi

export const ConditionSchema = z.object({
  ref: Ref,
  op: z.enum(["filled", "empty", "eq", "neq"]),
  value: z.string().max(200).optional(),
});

// ------------------------------------------------------------ gambar & tanda tangan

/** Hanya path relatif situs atau https; menolak `javascript:`, `data:`, dan protokol lain. */
export function isSafeSrc(s: string): boolean {
  return s.length <= 500 && (/^\/(?!\/)[A-Za-z0-9_\-./%]+$/.test(s) || /^https:\/\/[^\s"'<>]+$/.test(s));
}
const SafeSrc = z.string().max(500).refine(isSafeSrc, "Alamat gambar tidak diizinkan");

const SignatureWho = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("pejabat"), official: z.enum(["kades", "sekdes", "camat"]) }),
  z.object({ kind: z.literal("peran"), role: SnakeId }),
  /** Satu kolom tanda tangan per baris grup (mis. saksi 1..N). */
  z.object({ kind: z.literal("grup"), group: SnakeId }),
  z.object({ kind: z.literal("teks"), text: z.string().max(120) }),
]);

const SignatureSlot = z.object({
  id: Id,
  who: SignatureWho,
  /** a.n. = atas nama, Plt = pelaksana tugas, Pj = penjabat, u.b. = untuk beliau. */
  prefix: z.enum(["none", "an", "plt", "pj", "ub"]).default("none"),
  caption: Inlines.max(20).optional(),
  showName: z.boolean().default(true),
  showNip: z.boolean().default(false),
  stamp: z.boolean().default(false),
  materai: z.boolean().default(false),
  align: z.enum(["left", "center", "right"]).default("center"),
  gapMm: z.number().min(10).max(60).default(25),
});

// ---------------------------------------------------------------------- blok

const base = { id: Id };

const Paragraph = z.object({
  ...base,
  type: z.literal("paragraph"),
  align: Align.default("justify"),
  indentFirst: z.boolean().default(false),
  spaceAfterMm: z.number().min(0).max(20).default(3),
  content: Inlines,
});
const Heading = z.object({
  ...base,
  type: z.literal("heading"),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  align: Align.default("center"),
  underline: z.boolean().default(false),
  content: Inlines,
});
/** Judul surat + nomor ("SURAT KETERANGAN / Nomor : …"). */
const Title = z.object({
  ...base,
  type: z.literal("title"),
  title: Inlines,
  showNumber: z.boolean().default(true),
  numberPrefix: z.string().max(30).default("Nomor : "),
  align: Align.default("center"),
});
/** Kepala surat biasa: Nomor/Sifat/Lampiran/Perihal, tanggal, dan alamat tujuan. */
const Memo = z.object({
  ...base,
  type: z.literal("memo"),
  rows: z.array(z.object({ label: Label, value: Inlines })).max(6),
  dateline: Inlines.optional(),
  addressee: Inlines.optional(),
});
/** Baris label : nilai untuk satu orang, field dipilih dari registry. */
const PersonData = z.object({
  ...base,
  type: z.literal("personData"),
  role: SnakeId,
  fields: z.array(SnakeId).min(1).max(20),
  labelWidthMm: z.number().min(15).max(80).default(45),
  separator: z.string().max(3).default(":"),
});
/** Tabel yang barisnya mengikuti jumlah baris sebuah grup (ahli waris, anggota keluarga, daftar hadir). */
const RepeatTable = z.object({
  ...base,
  type: z.literal("repeatTable"),
  group: SnakeId,
  showIndex: z.boolean().default(true),
  columns: z
    .array(z.object({ label: Label, field: SnakeId, widthPct: z.number().min(5).max(100).optional(), align: Align.optional() }))
    .min(1)
    .max(LIMITS.tableColumns),
});
const StaticTable = z.object({
  ...base,
  type: z.literal("table"),
  bordered: z.boolean().default(true),
  columns: z.array(z.object({ label: Label, widthPct: z.number().min(5).max(100).optional() })).min(1).max(LIMITS.tableColumns),
  rows: z.array(z.array(Inlines).max(LIMITS.tableColumns)).max(LIMITS.tableRows),
});
const List = z.object({
  ...base,
  type: z.literal("list"),
  style: z.enum(["number", "alpha", "bullet"]).default("number"),
  items: z.array(Inlines).max(LIMITS.listItems),
});
/** Menimbang / Mengingat / Menetapkan / diktum KESATU, KEDUA, … pada keputusan. */
const Dictum = z.object({
  ...base,
  type: z.literal("dictum"),
  kind: z.enum(["menimbang", "mengingat", "menetapkan", "diktum"]),
  items: z.array(Inlines).max(LIMITS.listItems),
});
const Signature = z.object({
  ...base,
  type: z.literal("signature"),
  layout: z.enum(["row", "stack"]).default("row"),
  /** Teks lokasi & tanggal di atas tanda tangan, mis. "{desa.nama}, {surat.tanggal}" atau "Ditetapkan di …". */
  dateline: Inlines.optional(),
  slots: z.array(SignatureSlot).min(1).max(LIMITS.signatureSlots),
});
const Divider = z.object({ ...base, type: z.literal("divider"), style: z.enum(["single", "double", "dashed"]).default("single") });
const Spacer = z.object({ ...base, type: z.literal("spacer"), heightMm: z.number().min(1).max(100).default(5) });
const PageBreak = z.object({ ...base, type: z.literal("pageBreak") });
const Img = z.object({
  ...base,
  type: z.literal("image"),
  src: SafeSrc,
  alt: z.string().max(200).default(""),
  widthMm: z.number().min(5).max(180).default(40),
  align: z.enum(["left", "center", "right"]).default("center"),
});
const Qr = z.object({
  ...base,
  type: z.literal("qr"),
  sizeMm: z.number().min(15).max(50).default(22),
  align: z.enum(["left", "center", "right"]).default("right"),
});
const Cc = z.object({
  ...base,
  type: z.literal("cc"),
  label: z.string().max(40).default("Tembusan :"),
  items: z.array(Inlines).max(10),
});

const leaf = [
  Paragraph, Heading, Title, Memo, PersonData, RepeatTable, StaticTable, List,
  Dictum, Signature, Divider, Spacer, PageBreak, Img, Qr, Cc,
] as const;
export const LeafBlockSchema = z.discriminatedUnion("type", [...leaf]);
export type LeafBlock = z.infer<typeof LeafBlockSchema>;

const LeafList = z.array(LeafBlockSchema).max(LIMITS.childrenPerContainer);

/** 2–3 kolom sejajar (mis. TTD berdampingan, "Mengetahui" di kiri). Isinya hanya blok biasa — tidak bersarang. */
const Columns = z
  .object({
    ...base,
    type: z.literal("columns"),
    ratios: z.array(z.number().int().min(1).max(10)).min(2).max(3),
    children: z.array(LeafList).min(2).max(3),
  })
  .refine((c) => c.children.length === c.ratios.length, { message: "Jumlah kolom dan rasio harus sama" });

/** Tampilkan bagian hanya bila kondisi terpenuhi (mis. "Jika pemohon di bawah 21 tahun"). */
const Conditional = z.object({
  ...base,
  type: z.literal("conditional"),
  when: ConditionSchema,
  children: LeafList,
});

export const BlockSchema = z.union([LeafBlockSchema, Columns, Conditional]);
export type Block = z.infer<typeof BlockSchema>;

// ------------------------------------------------------------ isian & orang

export const FieldTypeSchema = z.enum(["text", "longtext", "number", "money", "date", "choice"]);

export const CustomFieldSchema = z.object({
  id: SnakeId,
  label: Label,
  type: FieldTypeSchema.default("text"),
  required: z.boolean().default(true),
  placeholder: z.string().max(120).optional(),
  help: z.string().max(200).optional(),
  options: z.array(z.string().trim().min(1).max(80)).max(LIMITS.options).optional(),
  /** Data sensitif (mis. penyebab kematian): disembunyikan dari daftar dan dicatat saat dibuka. */
  sensitive: z.boolean().default(false),
});
export type CustomField = z.infer<typeof CustomFieldSchema>;

export const PersonRoleSchema = z.object({
  id: SnakeId,
  label: Label,
  required: z.boolean().default(true),
  /** Boleh diisi manual untuk orang yang bukan warga desa. */
  allowManual: z.boolean().default(true),
});
export type PersonRole = z.infer<typeof PersonRoleSchema>;

/** Grup berulang: tiap baris = satu item (ahli waris, saksi, anggota keluarga). */
export const GroupSchema = z.object({
  id: SnakeId,
  label: Label,
  min: z.number().int().min(0).max(LIMITS.groupRows).default(1),
  max: z.number().int().min(1).max(LIMITS.groupRows).default(10),
  /** true: tiap baris bisa diisi dari pencarian warga (isian ber-ID sama dengan isian orang ikut terisi). */
  personRows: z.boolean().default(false),
  fields: z.array(CustomFieldSchema).min(1).max(LIMITS.groupFields),
});
export type Group = z.infer<typeof GroupSchema>;

// ------------------------------------------------------------ penomoran & halaman

export const NumberingSchema = z.object({
  mode: z.enum(["auto", "manual", "none"]).default("auto"),
  pattern: z.string().max(NUMBER_PATTERN_MAX).default(DEFAULT_NUMBER_PATTERN),
  reset: z.enum(["never", "yearly", "monthly"]).default("yearly"),
  padding: z.number().int().min(0).max(6).default(3),
  counterKey: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/).default("umum"),
  klasifikasi: z.string().max(40).optional(),
});

export const PageSchema = z.object({
  size: z.enum(PAPER_SIZE_IDS).default("F4"),
  orientation: z.enum(["portrait", "landscape"]).default("portrait"),
  margin: z
    .object({
      top: z.number().min(5).max(60).default(20),
      right: z.number().min(5).max(60).default(20),
      bottom: z.number().min(5).max(60).default(20),
      left: z.number().min(5).max(60).default(25),
    })
    .default({ top: 20, right: 20, bottom: 20, left: 25 }),
  font: z.enum(FONT_IDS).default("times"),
  fontSizePt: z.number().min(9).max(16).default(12),
  lineHeight: z.union([z.literal(1), z.literal(1.15), z.literal(1.5), z.literal(2)]).default(1.15),
});

export const DOCUMENT_KINDS = ["keterangan", "surat_biasa", "perintah", "keputusan", "berita_acara", "daftar", "lainnya"] as const;

export const DocumentSchema = z.object({
  schemaVersion: z.literal(2),
  kind: z.enum(DOCUMENT_KINDS).default("keterangan"),
  /** `warga`: ada pemohon (peran "pemohon" wajib). `internal`: naskah dinas tanpa pemohon. */
  audience: z.enum(["warga", "internal"]).default("warga"),
  page: PageSchema.default(() => PageSchema.parse({})),
  /** `desa`: kop dari Profil Tata Naskah Desa; `garuda`: kop keputusan; `none`: tanpa kop. */
  letterhead: z.enum(["desa", "garuda", "none"]).default("desa"),
  numbering: NumberingSchema.default(() => NumberingSchema.parse({})),
  people: z.array(PersonRoleSchema).max(LIMITS.people).default([]),
  fields: z.array(CustomFieldSchema).max(LIMITS.fields).default([]),
  groups: z.array(GroupSchema).max(LIMITS.groups).default([]),
  body: z.array(BlockSchema).max(LIMITS.blocks),
});

export type LetterDocument = z.infer<typeof DocumentSchema>;
export type LetterDocumentInput = z.input<typeof DocumentSchema>;
