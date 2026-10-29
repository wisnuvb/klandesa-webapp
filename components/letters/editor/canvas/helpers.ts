/**
 * Logika murni kanvas editor (tanpa React/DOM) supaya bisa diuji dengan node:test:
 * label awam isian, pengelompokan & pencarian isian, pemicu `/`, skala kertas,
 * pengelompokan preset, dan "slot teks" tiap jenis bagian.
 */
import type { Block, Inline, LetterDocument } from "../../../../lib/letters/document/schema";
import type { FormatId } from "../../../../lib/letters/format";
import {
  DESA_FIELDS,
  OFFICIAL_FIELDS,
  OFFICIAL_IDS,
  OFFICIAL_LABELS,
  PERSON_FIELDS,
  SURAT_FIELDS,
  parseRef,
  type FieldType,
} from "../../../../lib/letters/registry";
import { PAPER_SIZES } from "../../../../lib/letters/paper";
import type { BlockPreset, PresetCategory } from "../../../../lib/letters/editor/types";

// ------------------------------------------------------------------ label awam

/** Label isian untuk chip dan daftar, mis. "Nama lengkap pemohon", "Nama Kepala Desa". */
export function refLabel(ref: string, doc: Pick<LetterDocument, "people" | "fields">): string {
  const p = parseRef(ref);
  if (!p) return ref;
  switch (p.kind) {
    case "person": {
      const base = PERSON_FIELDS.find((f) => f.key === p.field)?.label ?? p.field;
      const role = doc.people.find((r) => r.id === p.role)?.label ?? p.role;
      return `${base} ${role.toLowerCase()}`;
    }
    case "desa":
      return DESA_FIELDS.find((f) => f.key === p.field)?.label ?? p.field;
    case "surat":
      return SURAT_FIELDS.find((f) => f.key === p.field)?.label ?? p.field;
    case "pejabat":
      return `${OFFICIAL_FIELDS.find((f) => f.key === p.field)?.label ?? p.field} ${OFFICIAL_LABELS[p.official]}`;
    case "isian":
      return doc.fields.find((f) => f.id === p.id)?.label ?? p.id;
  }
}

export const FORMAT_LABELS: Record<FormatId, string> = {
  upper: "HURUF BESAR",
  lower: "huruf kecil",
  title: "Huruf Awal Besar",
  angka: "Angka berpemisah ribuan",
  rupiah: "Rupiah (Rp 1.500.000)",
  terbilang: "Terbilang (satu juta lima ratus ribu)",
  terbilang_rupiah: "Terbilang rupiah",
  tanggal: "Tanggal (29 Oktober 2026)",
  hari: "Nama hari (Kamis)",
};

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Teks pendek",
  longtext: "Teks panjang",
  number: "Angka",
  money: "Nominal rupiah",
  date: "Tanggal",
  choice: "Pilihan",
};

// ------------------------------------------------------------------ pilihan isian

export type FieldOption = {
  ref: string;
  label: string;
  /** Keterangan kecil (kelompok atau contoh). */
  hint: string;
  example: string;
  type: FieldType;
  sensitive: boolean;
};
export type FieldOptionGroup = { id: string; title: string; options: FieldOption[] };

/** Semua isian yang bisa disisipkan sebagai chip, dikelompokkan dengan bahasa awam. */
export function buildFieldOptions(doc: Pick<LetterDocument, "people" | "fields">): FieldOptionGroup[] {
  const groups: FieldOptionGroup[] = [];

  for (const role of doc.people) {
    groups.push({
      id: `orang:${role.id}`,
      title: `Data ${role.label.toLowerCase()}`,
      options: PERSON_FIELDS.map((f) => ({
        ref: `${role.id}.${f.key}`,
        label: `${f.label} ${role.label.toLowerCase()}`,
        hint: f.group,
        example: f.example,
        type: f.type,
        sensitive: "sensitive" in f && f.sensitive === true,
      })),
    });
  }

  if (doc.fields.length) {
    groups.push({
      id: "isian",
      title: "Isian tambahan",
      options: doc.fields.map((f) => ({
        ref: `isian.${f.id}`,
        label: f.label,
        hint: FIELD_TYPE_LABELS[f.type],
        example: "",
        type: f.type,
        sensitive: f.sensitive,
      })),
    });
  }

  groups.push({
    id: "pejabat",
    title: "Pejabat desa",
    options: OFFICIAL_IDS.flatMap((o) =>
      OFFICIAL_FIELDS.map((f) => ({
        ref: `pejabat.${o}.${f.key}`,
        label: `${f.label} ${OFFICIAL_LABELS[o]}`,
        hint: OFFICIAL_LABELS[o],
        example: f.example,
        type: f.type,
        sensitive: false,
      })),
    ),
  });

  groups.push({
    id: "desa",
    title: "Data desa",
    options: DESA_FIELDS.map((f) => ({
      ref: `desa.${f.key}`, label: f.label, hint: "Desa", example: f.example, type: f.type, sensitive: false,
    })),
  });

  groups.push({
    id: "surat",
    title: "Data surat ini",
    options: SURAT_FIELDS.map((f) => ({
      ref: `surat.${f.key}`, label: f.label, hint: "Surat", example: f.example, type: f.type, sensitive: false,
    })),
  });

  return groups;
}

/** Huruf kecil tanpa tanda diakritik, spasi dirapatkan — untuk pencarian yang toleran. */
export function normalizeSearch(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Setiap kata pencarian harus muncul di label, kelompok, atau keterangan. Kelompok kosong dibuang. */
export function filterFieldOptions(groups: FieldOptionGroup[], query: string): FieldOptionGroup[] {
  const words = normalizeSearch(query).split(" ").filter(Boolean);
  if (words.length === 0) return groups;
  const out: FieldOptionGroup[] = [];
  for (const g of groups) {
    const title = normalizeSearch(g.title);
    const options = g.options.filter((o) => {
      const hay = `${normalizeSearch(o.label)} ${normalizeSearch(o.hint)} ${title}`;
      return words.every((w) => hay.includes(w));
    });
    if (options.length) out.push({ ...g, options });
  }
  return out;
}

// ------------------------------------------------------------------ pemicu "/"

/**
 * Ketikan `/` membuka pemilih isian hanya di awal baris atau setelah spasi
 * (supaya "dan/atau" dan "RT 02/RW 05" tetap bisa diketik biasa).
 */
export function slashTrigger(textBefore: string): boolean {
  return textBefore === "" || /\s$/.test(textBefore);
}

/** Paragraf kosong sepenuhnya: `/` membuka menu "Tambah bagian", bukan pemilih isian. */
export function isEmptyInlines(inlines: readonly Inline[] | undefined): boolean {
  return !inlines || inlines.every((n) => n.type === "text" && n.text.trim() === "");
}

// ------------------------------------------------------------------ skala kertas

const MM_PER_INCH = 25.4;
const CSS_DPI = 96;
export const mmToPx = (mm: number): number => (mm * CSS_DPI) / MM_PER_INCH;

export function paperPx(page: Pick<LetterDocument["page"], "size" | "orientation">): { width: number; height: number } {
  const p = PAPER_SIZES[page.size] ?? PAPER_SIZES.F4;
  const [w, h] = page.orientation === "landscape" ? [p.heightMm, p.widthMm] : [p.widthMm, p.heightMm];
  return { width: mmToPx(w), height: mmToPx(h) };
}

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 1.5;
export const ZOOM_STEP = 0.25;
export const clampZoom = (z: number): number =>
  Number.isFinite(z) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100)) : 1;

/**
 * Skala tampilan: kertas diperkecil agar muat lebar kontainer (tidak pernah diperbesar otomatis),
 * lalu dikalikan zoom pilihan operator. Hasil minimal 0,2 supaya tidak menghilang.
 */
export function paperScale(containerWidthPx: number, paperWidthPx: number, zoom = 1, gutterPx = 32, minFit = 0): number {
  if (!(containerWidthPx > 0) || !(paperWidthPx > 0)) return 1;
  const fit = Math.min(1, Math.max(0, containerWidthPx - gutterPx) / paperWidthPx);
  return Math.max(0.2, Math.round(Math.max(fit, Math.min(1, minFit)) * clampZoom(zoom) * 1000) / 1000);
}

/** Lebar kanvas sempit (HP): kertas tidak diperkecil di bawah skala ini agar teks tetap terbaca; selebihnya digulir di dalam kanvas. */
export const NARROW_CANVAS_PX = 640;
export const NARROW_MIN_FIT = 0.6;
export const minFitFor = (containerWidthPx: number): number =>
  containerWidthPx > 0 && containerWidthPx <= NARROW_CANVAS_PX ? NARROW_MIN_FIT : 0;

// ------------------------------------------------------------------ preset

export const CATEGORY_ORDER: PresetCategory[] = ["teks", "data", "tanda_tangan", "tata_letak", "lainnya"];
export const CATEGORY_LABELS: Record<PresetCategory, string> = {
  teks: "Teks",
  data: "Data & daftar",
  tanda_tangan: "Tanda tangan",
  tata_letak: "Tata letak",
  lainnya: "Lainnya",
};

export type PresetGroup = { category: PresetCategory; title: string; presets: BlockPreset[] };

export function groupPresets(presets: readonly BlockPreset[], query: string): PresetGroup[] {
  const words = normalizeSearch(query).split(" ").filter(Boolean);
  const match = (p: BlockPreset) => {
    if (!words.length) return true;
    const hay = `${normalizeSearch(p.label)} ${normalizeSearch(p.description)}`;
    return words.every((w) => hay.includes(w));
  };
  return CATEGORY_ORDER.map((category) => ({
    category,
    title: CATEGORY_LABELS[category],
    presets: presets.filter((p) => p.category === category && match(p)),
  })).filter((g) => g.presets.length > 0);
}

/** Nama ikon (string dari preset) → ikon yang tersedia, dengan cadangan; tidak pernah mengembalikan undefined. */
export function resolveIcon<T>(available: Readonly<Record<string, T>>, name: string, fallback: T): T {
  return Object.prototype.hasOwnProperty.call(available, name) ? available[name] : fallback;
}

// ------------------------------------------------------------------ nama bagian

const DICTUM_LABELS = { menimbang: "Menimbang", mengingat: "Mengingat", menetapkan: "Menetapkan", diktum: "Diktum" } as const;

export function blockLabel(b: Block): string {
  switch (b.type) {
    case "paragraph": return "Paragraf";
    case "heading": return "Judul bagian";
    case "title": return "Judul & nomor surat";
    case "memo": return "Kepala surat";
    case "personData": return "Data orang";
    case "repeatTable": return "Daftar berulang";
    case "table": return "Tabel";
    case "list": return "Daftar butir";
    case "dictum": return DICTUM_LABELS[b.kind];
    case "signature": return "Tanda tangan";
    case "divider": return "Garis pemisah";
    case "spacer": return "Jarak kosong";
    case "pageBreak": return "Halaman baru";
    case "image": return "Gambar";
    case "qr": return "Kode QR";
    case "cc": return "Tembusan";
    case "columns": return "Kolom";
    case "conditional": return "Bagian bersyarat";
  }
}

/** Teks ringkas (maks. `max` huruf) untuk pengumuman pembaca layar dan tooltip. */
export function blockSummary(b: Block, doc: Pick<LetterDocument, "people" | "fields">, max = 60): string {
  const slots = getTextSlots(b);
  let out = "";
  for (const s of slots) {
    for (const n of s.inlines) {
      if (n.type === "text") out += n.text;
      else if (n.type === "field") out += `«${refLabel(n.ref, doc)}»`;
      else out += " ";
    }
    if (out.trim()) break;
  }
  out = out.replace(/\s+/g, " ").trim();
  if (!out) return blockLabel(b);
  return out.length > max ? `${out.slice(0, max - 1)}…` : out;
}

/** Jenis bagian yang teksnya bisa diketik langsung di kertas. */
export function isTextEditable(b: Block): boolean {
  return getTextSlots(b).length > 0;
}

// ------------------------------------------------------------------ slot teks

export type TextSlot = {
  key: string;
  label: string;
  inlines: Inline[];
  /** true: satu baris/butir (Enter menambah butir baru bila bagian itu daftar). */
  item: boolean;
};

const EMPTY: Inline[] = [];

/** Daftar kolom teks yang bisa disunting di kertas untuk sebuah bagian (urutannya = urutan tampil). */
export function getTextSlots(b: Block): TextSlot[] {
  switch (b.type) {
    case "paragraph":
    case "heading":
      return [{ key: "content", label: b.type === "heading" ? "Judul" : "Isi paragraf", inlines: b.content, item: false }];
    case "title":
      return [{ key: "title", label: "Judul surat", inlines: b.title, item: false }];
    case "memo":
      return [
        ...b.rows.map((r, i) => ({ key: `row.${i}`, label: r.label, inlines: r.value, item: false })),
        { key: "dateline", label: "Tempat dan tanggal", inlines: b.dateline ?? EMPTY, item: false },
        { key: "addressee", label: "Tujuan surat", inlines: b.addressee ?? EMPTY, item: false },
      ];
    case "list":
    case "dictum":
    case "cc":
      return b.items.map((it, i) => ({ key: `item.${i}`, label: `Butir ${i + 1}`, inlines: it, item: true }));
    case "table":
      return b.rows.flatMap((row, r) =>
        b.columns.map((c, ci) => ({ key: `cell.${r}.${ci}`, label: `${c.label}, baris ${r + 1}`, inlines: row[ci] ?? EMPTY, item: false })),
      );
    case "signature":
      return [{ key: "dateline", label: "Tempat dan tanggal", inlines: b.dateline ?? EMPTY, item: false }];
    default:
      return [];
  }
}

const idx = (s: string): number => Number(s);

/** Ganti isi satu slot; kunci tak dikenal membiarkan bagian apa adanya. Tidak mengubah masukan. */
export function setTextSlot(b: Block, key: string, inlines: Inline[]): Block {
  const [kind, a, c] = key.split(".");
  switch (b.type) {
    case "paragraph":
    case "heading":
      return key === "content" ? { ...b, content: inlines } : b;
    case "title":
      return key === "title" ? { ...b, title: inlines } : b;
    case "memo":
      if (key === "dateline") return { ...b, dateline: inlines };
      if (key === "addressee") return { ...b, addressee: inlines };
      if (kind === "row" && b.rows[idx(a)]) {
        return { ...b, rows: b.rows.map((r, i) => (i === idx(a) ? { ...r, value: inlines } : r)) };
      }
      return b;
    case "list":
    case "dictum":
    case "cc":
      if (kind === "item" && idx(a) >= 0 && idx(a) < b.items.length) {
        return { ...b, items: b.items.map((it, i) => (i === idx(a) ? inlines : it)) };
      }
      return b;
    case "table":
      if (kind === "cell" && b.rows[idx(a)] && idx(c) >= 0 && idx(c) < b.columns.length) {
        return {
          ...b,
          rows: b.rows.map((row, r) => {
            if (r !== idx(a)) return row;
            const next = [...row];
            while (next.length < b.columns.length) next.push([]);
            next[idx(c)] = inlines;
            return next;
          }),
        };
      }
      return b;
    case "signature":
      return key === "dateline" ? { ...b, dateline: inlines } : b;
    default:
      return b;
  }
}

const ITEM_MAX = { list: 50, dictum: 50, cc: 10 } as const;

/** Sisipkan butir kosong setelah butir `afterKey` (daftar/diktum/tembusan). null bila tak bisa. */
export function insertItemAfter(b: Block, afterKey: string): { block: Block; focusKey: string } | null {
  if (b.type !== "list" && b.type !== "dictum" && b.type !== "cc") return null;
  const at = idx(afterKey.split(".")[1]);
  if (!Number.isInteger(at) || b.items.length >= ITEM_MAX[b.type]) return null;
  const items = [...b.items];
  items.splice(at + 1, 0, []);
  return { block: { ...b, items } as Block, focusKey: `item.${at + 1}` };
}

/** Hapus satu butir (minimal tersisa satu). `focusKey` = butir sebelumnya, atau yang baru menempati posisinya. */
export function removeItem(b: Block, key: string): { block: Block; focusKey: string } | null {
  if (b.type !== "list" && b.type !== "dictum" && b.type !== "cc") return null;
  const at = idx(key.split(".")[1]);
  if (!Number.isInteger(at) || at < 0 || at >= b.items.length || b.items.length <= 1) return null;
  const items = b.items.filter((_, i) => i !== at);
  return { block: { ...b, items } as Block, focusKey: `item.${Math.max(0, at - 1)}` };
}

export function appendItem(b: Block): { block: Block; focusKey: string } | null {
  if (b.type !== "list" && b.type !== "dictum" && b.type !== "cc") return null;
  return insertItemAfter(b, `item.${b.items.length - 1}`) ?? null;
}

// ------------------------------------------------------------------ letak bagian

export type BlockPlace = {
  block: Block;
  /** Posisi dalam wadahnya (0-based) dan jumlah saudara, untuk menonaktifkan Naik/Turun. */
  index: number;
  count: number;
  /** id bagian tingkat atas yang memuatnya (dirinya sendiri bila sudah tingkat atas). */
  topId: string;
  nested: boolean;
};

export function locateBlock(doc: Pick<LetterDocument, "body">, id: string | null): BlockPlace | null {
  if (!id) return null;
  for (let i = 0; i < doc.body.length; i++) {
    const top = doc.body[i];
    if (top.id === id) return { block: top, index: i, count: doc.body.length, topId: top.id, nested: false };
    if (top.type === "columns") {
      for (const col of top.children) {
        const j = col.findIndex((c) => c.id === id);
        if (j >= 0) return { block: col[j], index: j, count: col.length, topId: top.id, nested: true };
      }
    } else if (top.type === "conditional") {
      const j = top.children.findIndex((c) => c.id === id);
      if (j >= 0) return { block: top.children[j], index: j, count: top.children.length, topId: top.id, nested: true };
    }
  }
  return null;
}

/** Kalimat awam untuk syarat sebuah bagian bersyarat. */
export function describeCondition(
  when: { ref: string; op: "filled" | "empty" | "eq" | "neq"; value?: string },
  doc: Pick<LetterDocument, "people" | "fields">,
): string {
  const name = `“${refLabel(when.ref, doc)}”`;
  switch (when.op) {
    case "filled": return `Tampil hanya jika ${name} terisi`;
    case "empty": return `Tampil hanya jika ${name} kosong`;
    case "eq": return `Tampil hanya jika ${name} berisi “${when.value ?? ""}”`;
    case "neq": return `Tampil hanya jika ${name} bukan “${when.value ?? ""}”`;
  }
}

/** Posisi (px, dalam koordinat kertas tanpa skala) perkiraan batas halaman di aliran isi yang panjang. */
export function pageGuides(
  contentBottomPx: number,
  page: Pick<LetterDocument["page"], "size" | "orientation" | "margin">,
  max = 20,
): number[] {
  const { height } = paperPx(page);
  const usable = height - mmToPx(page.margin.top) - mmToPx(page.margin.bottom);
  if (!(usable > 0)) return [];
  const out: number[] = [];
  for (let k = 1; out.length < max; k++) {
    const y = mmToPx(page.margin.top) + k * usable;
    if (y >= contentBottomPx) break;
    out.push(Math.round(y));
  }
  return out;
}

/** Pesan galat per id bagian (gabungan bila ada beberapa). */
export function issuesByBlock(issues: ReadonlyArray<{ blockId?: string; message: string }>): Map<string, string> {
  const map = new Map<string, string>();
  for (const i of issues) {
    if (!i.blockId) continue;
    const prev = map.get(i.blockId);
    map.set(i.blockId, prev ? (prev.includes(i.message) ? prev : `${prev}; ${i.message}`) : i.message);
  }
  return map;
}
