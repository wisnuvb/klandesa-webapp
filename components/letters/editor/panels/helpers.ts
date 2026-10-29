/**
 * Logika murni panel samping editor surat: pemetaan bentuk isian → patch dokumen, validasi sebaris,
 * pratinjau nomor, ringkasan "Cek surat", dan pengelompokan bagian. Tanpa React/DOM supaya mudah diuji.
 * Semua pembuat patch mengembalikan nilai yang sudah dibatasi sesuai skema (tidak melempar).
 */
import {
  LIMITS,
  isSafeSrc,
  type Block,
  type CustomField,
  type Group,
  type Inline,
  type LetterDocument,
} from "../../../../lib/letters/document/schema";
import { findBlock } from "../../../../lib/letters/editor/ops";
import { slugId } from "../../../../lib/letters/editor/ids";
import { createFromPreset } from "../../../../lib/letters/editor/presets";
import type {
  BlockPreset,
  EditorApi,
  InsertTarget,
  PresetCategory,
  PresetId,
} from "../../../../lib/letters/editor/types";
import {
  NUMBERING_TOKENS,
  formatLetterNumber,
  validateNumberPattern,
  type NumberingToken,
} from "../../../../lib/letters/numbering";
import { MARGIN_PRESETS, type MarginMm, type MarginPresetId } from "../../../../lib/letters/paper";
import type { FieldType } from "../../../../lib/letters/registry";

type B<T extends Block["type"]> = Extract<Block, { type: T }>;

export const clampNum = (v: number, min: number, max: number): number =>
  Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min;

// ------------------------------------------------------------------ label umum

export const KIND_LABELS = {
  keterangan: "Surat keterangan",
  surat_biasa: "Surat biasa (undangan, pemberitahuan)",
  perintah: "Surat perintah / tugas",
  keputusan: "Keputusan",
  berita_acara: "Berita acara",
  daftar: "Daftar / lampiran",
  lainnya: "Lainnya",
} as const satisfies Record<LetterDocument["kind"], string>;

export const LETTERHEAD_LABELS = {
  desa: { label: "Kop desa", hint: "Logo dan alamat desa dari profil desa." },
  garuda: { label: "Kop Garuda", hint: "Lambang Garuda, untuk keputusan." },
  none: { label: "Tanpa kop", hint: "Kertas polos, tanpa kepala surat." },
} as const satisfies Record<LetterDocument["letterhead"], { label: string; hint: string }>;

export const FIELD_TYPE_LABELS = {
  text: "Teks pendek",
  longtext: "Teks panjang",
  number: "Angka",
  money: "Rupiah",
  date: "Tanggal",
  choice: "Pilihan",
} as const satisfies Record<FieldType, string>;

export const LINE_HEIGHT_LABELS: Array<{ value: LetterDocument["page"]["lineHeight"]; label: string }> = [
  { value: 1, label: "Rapat (1)" },
  { value: 1.15, label: "Normal (1,15)" },
  { value: 1.5, label: "Longgar (1,5)" },
  { value: 2, label: "Ganda (2)" },
];

export const BLOCK_TYPE_LABELS = {
  paragraph: "Paragraf",
  heading: "Judul bagian",
  title: "Judul & nomor surat",
  memo: "Kepala surat",
  personData: "Data orang",
  repeatTable: "Tabel dari daftar",
  table: "Tabel",
  list: "Daftar butir",
  dictum: "Diktum keputusan",
  signature: "Tanda tangan",
  divider: "Garis pemisah",
  spacer: "Jarak kosong",
  pageBreak: "Halaman baru",
  image: "Gambar",
  qr: "Kode QR verifikasi",
  cc: "Tembusan",
  columns: "Kolom",
  conditional: "Bagian bersyarat",
} as const satisfies Record<Block["type"], string>;

// ------------------------------------------------------------------ tambah bagian

export const CATEGORY_LABELS: Record<PresetCategory, string> = {
  teks: "Teks",
  data: "Data & daftar",
  tanda_tangan: "Tanda tangan",
  tata_letak: "Tata letak",
  lainnya: "Lainnya",
};
const CATEGORY_ORDER: PresetCategory[] = ["teks", "data", "tanda_tangan", "tata_letak", "lainnya"];

export type PresetGroup = { category: PresetCategory; label: string; items: BlockPreset[] };

/** Kelompokkan bagian per kategori (urutan tetap), dengan pencarian pada nama dan keterangan. */
export function groupPresets(presets: readonly BlockPreset[], query = ""): PresetGroup[] {
  const q = query.trim().toLowerCase();
  const match = (p: BlockPreset) => !q || p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
  const out: PresetGroup[] = [];
  for (const category of CATEGORY_ORDER) {
    const items = presets.filter((p) => p.category === category && match(p));
    if (items.length) out.push({ category, label: CATEGORY_LABELS[category], items });
  }
  return out;
}

/**
 * Tempat bagian baru: tepat sesudah bagian terpilih. Bila yang terpilih berada di dalam kolom/bagian
 * bersyarat, ditaruh sesudah wadahnya (wadah tidak boleh bersarang). Tanpa pilihan: akhir surat.
 */
export function insertTargetFor(doc: LetterDocument, selectedId: string | null): InsertTarget | undefined {
  if (!selectedId) return undefined;
  const loc = findBlock(doc, selectedId);
  if (!loc) return undefined;
  if (loc.parent.kind === "body") return { after: selectedId };
  return { after: loc.parent.id };
}

// ------------------------------------------------------------------ cek surat

export type CheckSummary = {
  errors: number;
  hints: number;
  total: number;
  ok: boolean;
  /** Teks pendek untuk badge/pembaca layar. */
  label: string;
};

export function checkSummary(editor: Pick<EditorApi, "issues" | "hints">): CheckSummary {
  const errors = editor.issues.length;
  const hints = editor.hints.length;
  const total = errors + hints;
  let label = "Surat siap dipakai";
  if (errors > 0) label = `${errors} hal perlu diperbaiki${hints ? `, ${hints} saran` : ""}`;
  else if (hints > 0) label = `${hints} saran`;
  return { errors, hints, total, ok: total === 0, label };
}

/** Nama awam untuk path galat validasi bila tidak ada bagian yang bisa ditunjuk. */
export function plainIssueMessage(message: string): string {
  return message.replace(/\s+/g, " ").trim();
}

// ------------------------------------------------------------------ penomoran

export const TOKEN_INFO: Record<NumberingToken, { label: string; hint: string }> = {
  URUT: { label: "Nomor urut", hint: "Bertambah otomatis tiap surat terbit." },
  KLASIFIKASI: { label: "Kode klasifikasi", hint: "Mis. 470 atau 145; diisi di bawah." },
  KODE_DESA: { label: "Kode desa", hint: "Dari profil desa." },
  BULAN: { label: "Bulan (angka)", hint: "01 sampai 12." },
  BULAN_ROMAWI: { label: "Bulan (Romawi)", hint: "I sampai XII." },
  TAHUN: { label: "Tahun", hint: "Tahun surat dibuat." },
};
export const TOKEN_LIST = NUMBERING_TOKENS;

export const NUMBER_MODE_LABELS = {
  auto: { label: "Otomatis", hint: "Nomor diberikan sistem saat surat diterbitkan." },
  manual: { label: "Diketik sendiri", hint: "Operator mengisi nomor saat membuat surat." },
  none: { label: "Tanpa nomor", hint: "Surat tidak bernomor." },
} as const;

export const RESET_LABELS = {
  yearly: "Mulai dari 1 tiap tahun",
  monthly: "Mulai dari 1 tiap bulan",
  never: "Tidak pernah mulai ulang",
} as const;

/** Pratinjau nomor contoh. Tanggal bisa disuntik agar deterministik. */
export function previewNumber(
  numbering: Pick<LetterDocument["numbering"], "pattern" | "padding" | "klasifikasi">,
  opts: { urut?: number; date?: Date; kodeDesa?: string } = {},
): string {
  return formatLetterNumber(numbering.pattern, {
    urut: opts.urut ?? 12,
    date: opts.date ?? new Date(),
    padding: numbering.padding,
    klasifikasi: numbering.klasifikasi,
    kodeDesa: opts.kodeDesa ?? "424.304.2.02",
  });
}

export const validatePatternInput = (pattern: string, mode: LetterDocument["numbering"]["mode"]): string | null =>
  validateNumberPattern(pattern, mode);

/** Sisipkan `{TOKEN}` pada posisi kursor (atau menggantikan pilihan); mengembalikan nilai baru dan posisi kursor. */
export function insertTokenAt(
  pattern: string,
  token: NumberingToken,
  start: number = pattern.length,
  end: number = start,
): { value: string; caret: number } {
  const s = clampNum(start, 0, pattern.length);
  const e = clampNum(end, s, pattern.length);
  const piece = `{${token}}`;
  return { value: pattern.slice(0, s) + piece + pattern.slice(e), caret: s + piece.length };
}

export function validateCounterKey(key: string): string | null {
  return /^[a-z][a-z0-9_]{0,39}$/.test(key)
    ? null
    : "Gunakan huruf kecil, angka, dan _ (mulai dengan huruf), paling banyak 40 karakter.";
}

// ------------------------------------------------------------------ halaman

export const FONT_SIZES = [10, 11, 12, 13, 14] as const;

export function marginPresetOf(m: MarginMm): MarginPresetId | "custom" {
  for (const [id, p] of Object.entries(MARGIN_PRESETS)) {
    const x = p.margin;
    if (x.top === m.top && x.right === m.right && x.bottom === m.bottom && x.left === m.left) return id as MarginPresetId;
  }
  return "custom";
}

export const clampMargin = (v: number): number => clampNum(Math.round(v), 5, 60);

export function audienceChange(
  doc: Pick<LetterDocument, "people" | "audience">,
  to: LetterDocument["audience"],
): { needsPemohon: boolean; warning: string | null } {
  if (to === doc.audience) return { needsPemohon: false, warning: null };
  if (to === "warga") return { needsPemohon: !doc.people.some((p) => p.id === "pemohon"), warning: null };
  return {
    needsPemohon: false,
    warning:
      "Surat internal tidak memakai pemohon dan tidak bisa diajukan lewat permohonan warga. Bagian yang memakai data pemohon tetap ada di kertas.",
  };
}

// ------------------------------------------------------------------ teks polos ↔ inline

/** Teks polos dari inline. `simple` = hanya teks tanpa gaya/isian, aman disunting sebagai teks biasa. */
export function plainText(inlines: readonly Inline[] | undefined): { text: string; simple: boolean } {
  let text = "";
  let simple = true;
  for (const n of inlines ?? []) {
    if (n.type === "text") {
      text += n.text;
      if (n.marks?.length) simple = false;
    } else if (n.type === "br") text += "\n";
    else simple = false;
  }
  return { text, simple };
}

export function textToInlines(text: string): Inline[] {
  const out: Inline[] = [];
  text.split("\n").forEach((line, i) => {
    if (i > 0) out.push({ type: "br" });
    if (line) out.push({ type: "text", text: line.slice(0, LIMITS.textLength) });
  });
  return out;
}

// ------------------------------------------------------------------ validasi sebaris

export function validateImageSrc(src: string): string | null {
  if (!src.trim()) return "Alamat gambar wajib diisi.";
  return isSafeSrc(src.trim())
    ? null
    : "Alamat gambar harus diawali / (gambar di situs ini) atau https://. Alamat lain tidak diizinkan.";
}
export const validateAlt = (alt: string): string | null =>
  alt.trim() ? null : "Isi keterangan gambar agar bisa dibacakan untuk pengguna tunanetra.";

export const validateLabel = (label: string, max = 80): string | null =>
  !label.trim() ? "Nama tidak boleh kosong." : label.trim().length > max ? `Paling banyak ${max} karakter.` : null;

// ------------------------------------------------------------------ patch bagian (umum)

const NUM_RULES: Record<string, [number, number]> = {
  spaceAfterMm: [0, 20],
  labelWidthMm: [15, 80],
  heightMm: [1, 100],
  sizeMm: [15, 50],
  gapMm: [10, 60],
};

/**
 * Terapkan patch sederhana (perataan, angka, saklar) pada bagian. Angka dibatasi sesuai skema,
 * alamat gambar yang tidak aman diabaikan, dan jenis/id tidak pernah berubah.
 */
export function patchBlock<T extends Block>(b: T, patch: Partial<T>): T {
  const next: Record<string, unknown> = { ...b };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || k === "id" || k === "type") continue;
    if (typeof v === "number") {
      if (!Number.isFinite(v)) continue;
      if (k === "widthMm" && b.type === "image") next[k] = clampNum(v, 5, 180);
      else if (NUM_RULES[k]) next[k] = clampNum(v, NUM_RULES[k][0], NUM_RULES[k][1]);
      else next[k] = v;
    } else if (k === "src") {
      if (typeof v === "string" && isSafeSrc(v.trim())) next[k] = v.trim();
    } else if (k === "alt") next[k] = String(v).slice(0, 200);
    else if (k === "numberPrefix") next[k] = String(v).slice(0, 30);
    else if (k === "separator") next[k] = String(v).slice(0, 3);
    else if (k === "label" && b.type === "cc") next[k] = String(v).slice(0, 40);
    else next[k] = v;
  }
  return next as T;
}

// ------------------------------------------------------------------ data orang

export function togglePersonField(b: B<"personData">, key: string, on: boolean): B<"personData"> {
  const has = b.fields.includes(key);
  if (on && !has) return b.fields.length >= 20 ? b : { ...b, fields: [...b.fields, key] };
  if (!on && has) return b.fields.length <= 1 ? b : { ...b, fields: b.fields.filter((k) => k !== key) };
  return b;
}

export function movePersonField(b: B<"personData">, key: string, delta: -1 | 1): B<"personData"> {
  const i = b.fields.indexOf(key);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= b.fields.length) return b;
  const fields = [...b.fields];
  [fields[i], fields[j]] = [fields[j], fields[i]];
  return { ...b, fields };
}

// ------------------------------------------------------------------ tabel dari daftar

export function setRepeatGroup(b: B<"repeatTable">, group: Group): B<"repeatTable"> {
  if (group.id === b.group) return b;
  const columns = group.fields.slice(0, LIMITS.tableColumns).map((f) => ({ label: f.label.slice(0, 80), field: f.id }));
  return { ...b, group: group.id, columns };
}

export function addRepeatColumn(b: B<"repeatTable">, group: Group | undefined): B<"repeatTable"> {
  if (!group || b.columns.length >= LIMITS.tableColumns) return b;
  const free = group.fields.find((f) => !b.columns.some((c) => c.field === f.id));
  if (!free) return b;
  return { ...b, columns: [...b.columns, { label: free.label.slice(0, 80), field: free.id }] };
}

export function removeRepeatColumn(b: B<"repeatTable">, index: number): B<"repeatTable"> {
  if (b.columns.length <= 1 || index < 0 || index >= b.columns.length) return b;
  return { ...b, columns: b.columns.filter((_, i) => i !== index) };
}

export function setRepeatColumn(
  b: B<"repeatTable">,
  index: number,
  patch: { label?: string; field?: string; align?: "left" | "center" | "right" | "justify" },
  group?: Group,
): B<"repeatTable"> {
  const cur = b.columns[index];
  if (!cur) return b;
  const next = { ...cur };
  if (patch.label !== undefined && patch.label.trim()) next.label = patch.label.trim().slice(0, 80);
  if (patch.field !== undefined && (!group || group.fields.some((f) => f.id === patch.field))) next.field = patch.field;
  if (patch.align !== undefined) next.align = patch.align;
  return { ...b, columns: b.columns.map((c, i) => (i === index ? next : c)) };
}

// ------------------------------------------------------------------ tabel biasa

export function setTableHeader(b: B<"table">, col: number, label: string): B<"table"> {
  if (!b.columns[col] || !label.trim()) return b;
  return { ...b, columns: b.columns.map((c, i) => (i === col ? { ...c, label: label.trim().slice(0, 80) } : c)) };
}

/** Hanya sel berisi teks polos yang dapat disunting di sini; sel berisi isian/gaya diubah langsung di kertas. */
export function setTableCell(b: B<"table">, row: number, col: number, text: string): B<"table"> {
  if (!b.rows[row] || col < 0 || col >= b.columns.length) return b;
  const cell = b.rows[row][col] ?? [];
  if (!plainText(cell).simple) return b;
  const cells = Array.from({ length: b.columns.length }, (_, i) => b.rows[row][i] ?? []);
  cells[col] = textToInlines(text);
  return { ...b, rows: b.rows.map((r, i) => (i === row ? cells : r)) };
}

export function addTableRow(b: B<"table">): B<"table"> {
  if (b.rows.length >= LIMITS.tableRows) return b;
  return { ...b, rows: [...b.rows, b.columns.map(() => [] as Inline[])] };
}
export function removeTableRow(b: B<"table">, row: number): B<"table"> {
  return b.rows[row] ? { ...b, rows: b.rows.filter((_, i) => i !== row) } : b;
}
export function addTableColumn(b: B<"table">): B<"table"> {
  if (b.columns.length >= LIMITS.tableColumns) return b;
  return {
    ...b,
    columns: [...b.columns, { label: `Kolom ${b.columns.length + 1}` }],
    rows: b.rows.map((r) => [...Array.from({ length: b.columns.length }, (_, i) => r[i] ?? []), [] as Inline[]]),
  };
}
export function removeTableColumn(b: B<"table">, col: number): B<"table"> {
  if (b.columns.length <= 1 || !b.columns[col]) return b;
  return {
    ...b,
    columns: b.columns.filter((_, i) => i !== col),
    rows: b.rows.map((r) => r.filter((_, i) => i !== col)),
  };
}

// ------------------------------------------------------------------ tanda tangan

type Slot = B<"signature">["slots"][number];
type Who = Slot["who"];

export const OFFICIAL_CHOICES = [
  { value: "kades", label: "Kepala Desa" },
  { value: "sekdes", label: "Sekretaris Desa" },
  { value: "camat", label: "Camat" },
] as const;

export const PREFIX_LABELS = {
  none: "Tanpa awalan",
  an: "a.n. (atas nama)",
  plt: "Plt. (pelaksana tugas)",
  pj: "Pj. (penjabat)",
  ub: "u.b. (untuk beliau)",
} as const satisfies Record<Slot["prefix"], string>;

export const whoToValue = (who: Who): string =>
  who.kind === "pejabat" ? `pejabat:${who.official}` : who.kind === "peran" ? `peran:${who.role}` : who.kind === "grup" ? `grup:${who.group}` : "teks";

export function valueToWho(value: string, prevText = ""): Who | null {
  const [kind, rest] = value.split(":");
  if (kind === "pejabat" && (OFFICIAL_CHOICES as readonly { value: string }[]).some((o) => o.value === rest)) {
    return { kind: "pejabat", official: rest as "kades" | "sekdes" | "camat" };
  }
  if (kind === "peran" && /^[a-z][a-z0-9_]{0,29}$/.test(rest ?? "")) return { kind: "peran", role: rest };
  if (kind === "grup" && /^[a-z][a-z0-9_]{0,29}$/.test(rest ?? "")) return { kind: "grup", group: rest };
  if (kind === "teks") return { kind: "teks", text: prevText.slice(0, 120) };
  return null;
}

export function uniqueSlotId(slots: readonly Slot[], base: string): string {
  const taken = new Set(slots.map((s) => s.id));
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}${n}`;
  return id;
}

export function setSlot(b: B<"signature">, slotId: string, patch: Partial<Omit<Slot, "id">>): B<"signature"> {
  return {
    ...b,
    slots: b.slots.map((s) => {
      if (s.id !== slotId) return s;
      const next = { ...s, ...patch };
      if (patch.gapMm !== undefined) next.gapMm = clampNum(patch.gapMm, 10, 60);
      return next;
    }),
  };
}

export function addSlot(b: B<"signature">, who: Who = { kind: "pejabat", official: "kades" }): B<"signature"> {
  if (b.slots.length >= LIMITS.signatureSlots) return b;
  const slot: Slot = {
    id: uniqueSlotId(b.slots, "ttd"),
    who, prefix: "none", showName: true, showNip: false, stamp: false, materai: false, align: "center", gapMm: 25,
  };
  return { ...b, slots: [...b.slots, slot] };
}

export function removeSlot(b: B<"signature">, slotId: string): B<"signature"> {
  return b.slots.length <= 1 ? b : { ...b, slots: b.slots.filter((s) => s.id !== slotId) };
}

export function moveSlot(b: B<"signature">, slotId: string, delta: -1 | 1): B<"signature"> {
  const i = b.slots.findIndex((s) => s.id === slotId);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= b.slots.length) return b;
  const slots = [...b.slots];
  [slots[i], slots[j]] = [slots[j], slots[i]];
  return { ...b, slots };
}

export type SignatureSlotPreset = { id: PresetId; label: string };
/** Susunan tanda tangan siap pakai yang tidak butuh orang/daftar baru. */
export const SIGNATURE_SLOT_PRESETS: SignatureSlotPreset[] = [
  { id: "tanda_tangan_kades", label: "Kepala Desa" },
  { id: "tanda_tangan_an_sekdes", label: "a.n. Kepala Desa (Sekretaris Desa)" },
  { id: "tanda_tangan_mengetahui", label: "Mengetahui Camat + Kepala Desa" },
];

/** Ambil susunan slot dari bagian siap pakai (sumber tunggal: presets.ts); null bila butuh orang/daftar baru. */
export function slotsFromPreset(doc: LetterDocument, preset: PresetId): B<"signature">["slots"] | null {
  const made = createFromPreset(doc, preset);
  if (made.doc.people.length !== doc.people.length || made.doc.groups.length !== doc.groups.length) return null;
  const loc = findBlock(made.doc, made.blockId);
  return loc && loc.block.type === "signature" ? loc.block.slots : null;
}

export const applySignatureSlots = (b: B<"signature">, slots: B<"signature">["slots"]): B<"signature"> => ({ ...b, slots });

// ------------------------------------------------------------------ memo

export function setMemoRow(b: B<"memo">, index: number, patch: { label?: string; valueText?: string }): B<"memo"> {
  const row = b.rows[index];
  if (!row) return b;
  const next = { ...row };
  if (patch.label !== undefined && patch.label.trim()) next.label = patch.label.trim().slice(0, 80);
  if (patch.valueText !== undefined && plainText(row.value).simple) next.value = textToInlines(patch.valueText);
  return { ...b, rows: b.rows.map((r, i) => (i === index ? next : r)) };
}
export function addMemoRow(b: B<"memo">): B<"memo"> {
  return b.rows.length >= 6 ? b : { ...b, rows: [...b.rows, { label: "Keterangan", value: [{ type: "text", text: "-" }] }] };
}
export function removeMemoRow(b: B<"memo">, index: number): B<"memo"> {
  return b.rows[index] ? { ...b, rows: b.rows.filter((_, i) => i !== index) } : b;
}

// ------------------------------------------------------------------ kolom

export const COLUMN_RATIO_PRESETS: Array<{ id: string; label: string; ratios: number[] }> = [
  { id: "1-1", label: "2 kolom sama lebar", ratios: [1, 1] },
  { id: "1-2", label: "2 kolom, kanan lebih lebar", ratios: [1, 2] },
  { id: "2-1", label: "2 kolom, kiri lebih lebar", ratios: [2, 1] },
  { id: "1-1-1", label: "3 kolom sama lebar", ratios: [1, 1, 1] },
];

export const ratioKey = (r: readonly number[]): string => r.join("-");

/** null bila boleh; pesan bila penggabungan kolom akan melebihi batas isi per kolom. */
export function canSetColumnRatios(b: B<"columns">, ratios: readonly number[]): string | null {
  if (ratios.length < b.children.length) {
    const merged = b.children.slice(ratios.length - 1).reduce((n, c) => n + c.length, 0);
    if (merged > LIMITS.childrenPerContainer) return "Isi kolom terlalu banyak untuk digabung.";
  }
  return null;
}

/** Ubah rasio; bila jumlah kolom berkurang, isi kolom yang dibuang digabung ke kolom terakhir. */
export function setColumnRatios(b: B<"columns">, ratios: readonly number[]): B<"columns"> {
  const n = Math.min(3, Math.max(2, ratios.length));
  const r = ratios.slice(0, n).map((x) => Math.round(clampNum(x, 1, 10)));
  if (r.length !== n || canSetColumnRatios(b, r)) return b;
  const kids = b.children.slice(0, n).map((c) => [...c]);
  while (kids.length < n) kids.push([]);
  if (b.children.length > n) kids[n - 1] = [...kids[n - 1], ...b.children.slice(n).flat()];
  return { ...b, ratios: r, children: kids };
}

// ------------------------------------------------------------------ bersyarat

export const CONDITION_OP_LABELS = {
  filled: "sudah diisi",
  empty: "belum diisi",
  eq: "sama dengan",
  neq: "tidak sama dengan",
} as const;
export const conditionNeedsValue = (op: string): boolean => op === "eq" || op === "neq";

const CONDITION_PERSON_FIELDS: Array<[string, string]> = [
  ["umur", "umur"],
  ["jenis_kelamin", "jenis kelamin"],
  ["status_perkawinan", "status perkawinan"],
  ["agama", "agama"],
  ["pekerjaan", "pekerjaan"],
  ["tanggal_meninggal", "tanggal meninggal"],
];

export type ConditionRefOption = { ref: string; label: string; field?: CustomField };

/** Isian yang bisa dijadikan syarat: isian tambahan lebih dulu, lalu beberapa data orang. */
export function conditionRefOptions(doc: LetterDocument, current?: string): ConditionRefOption[] {
  const out: ConditionRefOption[] = doc.fields.map((f) => ({ ref: `isian.${f.id}`, label: f.label, field: f }));
  for (const p of doc.people) {
    for (const [key, name] of CONDITION_PERSON_FIELDS) out.push({ ref: `${p.id}.${key}`, label: `${name} ${p.label}` });
  }
  if (current && !out.some((o) => o.ref === current)) out.unshift({ ref: current, label: current });
  return out;
}

export function setCondition(
  b: B<"conditional">,
  patch: { ref?: string; op?: "filled" | "empty" | "eq" | "neq"; value?: string },
): B<"conditional"> {
  const when = { ...b.when };
  if (patch.ref !== undefined) when.ref = patch.ref;
  if (patch.op !== undefined) when.op = patch.op;
  if (patch.value !== undefined) when.value = patch.value.slice(0, 200);
  if (!conditionNeedsValue(when.op)) delete when.value;
  return { ...b, when };
}

// ------------------------------------------------------------------ orang, isian, daftar

export function parseOptions(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of text.split("\n")) {
    const v = line.trim().slice(0, 80);
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out.slice(0, LIMITS.options);
}
export const optionsToText = (options: readonly string[] | undefined): string => (options ?? []).join("\n");

/** Patch isian: jenis "pilihan" wajib punya minimal 2 opsi agar bisa dipakai; jenis lain membuang opsi. */
export function fieldPatchForType(field: CustomField, type: FieldType): Partial<Omit<CustomField, "id">> {
  if (type === "choice") return { type, options: field.options?.length ? field.options : ["Ya", "Tidak"] };
  return { type, options: undefined };
}

export function optionsError(field: Pick<CustomField, "type" | "options">): string | null {
  return field.type === "choice" && (field.options?.length ?? 0) < 2 ? "Isian pilihan butuh minimal 2 pilihan (satu per baris)." : null;
}

export function groupFieldUsedBy(doc: LetterDocument, groupId: string, fieldId: string): string[] {
  const ids: string[] = [];
  const visit = (b: Block) => {
    if (b.type === "repeatTable" && b.group === groupId && b.columns.some((c) => c.field === fieldId)) ids.push(b.id);
  };
  for (const b of doc.body) {
    visit(b);
    if (b.type === "columns") b.children.flat().forEach(visit);
    else if (b.type === "conditional") b.children.forEach(visit);
  }
  return ids;
}

export function addGroupField(group: Group, label: string, type: FieldType = "text"): Group {
  const name = label.trim().slice(0, 80);
  if (!name || group.fields.length >= LIMITS.groupFields) return group;
  const id = slugId(name, group.fields.map((f) => f.id));
  const field: CustomField = { id, label: name, type, required: true, sensitive: false };
  if (type === "choice") field.options = ["Ya", "Tidak"];
  return { ...group, fields: [...group.fields, field] };
}

export function patchGroupField(group: Group, fieldId: string, patch: Partial<Omit<CustomField, "id">>): Group {
  return { ...group, fields: group.fields.map((f) => (f.id === fieldId ? { ...f, ...patch, id: fieldId } : f)) };
}

export function removeGroupField(
  doc: LetterDocument,
  group: Group,
  fieldId: string,
): { ok: true; group: Group } | { ok: false; error: string } {
  if (group.fields.length <= 1) return { ok: false, error: "Daftar butuh minimal satu kolom." };
  const used = groupFieldUsedBy(doc, group.id, fieldId);
  if (used.length) return { ok: false, error: `Kolom ini masih dipakai di ${used.length} tabel. Ubah tabelnya dulu.` };
  return { ok: true, group: { ...group, fields: group.fields.filter((f) => f.id !== fieldId) } };
}

/** Batas jumlah baris daftar; saling menjaga min ≤ maks. */
export function groupRangePatch(group: Pick<Group, "min" | "max">, patch: { min?: number; max?: number }): { min: number; max: number } {
  let min = patch.min !== undefined ? Math.round(clampNum(patch.min, 0, LIMITS.groupRows)) : group.min;
  let max = patch.max !== undefined ? Math.round(clampNum(patch.max, 1, LIMITS.groupRows)) : group.max;
  if (patch.min !== undefined && min > max) max = Math.max(min, 1);
  if (patch.max !== undefined && max < min) min = max;
  return { min, max };
}
