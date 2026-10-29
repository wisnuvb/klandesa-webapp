/**
 * Konversi dua arah antara `Inline[]` (skema dokumen) dan JSON dokumen Tiptap.
 *
 * Satu `Inline[]` = satu paragraf Tiptap. Sebaliknya, bila editor menghasilkan beberapa
 * paragraf (tombol Enter), antar-paragraf dipetakan ke satu `br` — jadi Enter dan Shift+Enter
 * sama-sama menjadi baris baru di surat. `tiptapToInlines` menganggap masukan TIDAK tepercaya:
 * node/mark tak dikenal dibuang, batas `LIMITS` dipaksa, dan hasilnya selalu lolos `InlineSchema`.
 */
import { FORMAT_IDS } from "../format";
import { InlineSchema, LIMITS, type Inline } from "../document/schema";
import { REF_PATTERN } from "../registry";

export type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
};
export type TiptapDoc = { type: "doc"; content: TiptapNode[] };

const MARK_TO_TIPTAP = { b: "bold", i: "italic", u: "underline" } as const;
const MARK_FROM_TIPTAP: Record<string, "b" | "i" | "u"> = { bold: "b", italic: "i", underline: "u" };
const MARK_ORDER = ["b", "i", "u"] as const;
const FORMATS = new Set<string>(FORMAT_IDS);
/** Batas jumlah node yang diperiksa, supaya masukan raksasa tidak membebani. */
const MAX_NODES_SCANNED = 2_000;
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

// ------------------------------------------------------------- Inline → Tiptap

export function inlinesToTiptap(inlines: readonly Inline[] | undefined): TiptapDoc {
  const content: TiptapNode[] = [];
  for (const n of inlines ?? []) {
    if (n.type === "br") content.push({ type: "hardBreak" });
    else if (n.type === "field") {
      content.push({
        type: "field",
        attrs: { ref: n.ref, format: n.format ?? null, fallback: n.fallback ?? null },
      });
    } else if (n.text !== "") {
      const node: TiptapNode = { type: "text", text: n.text };
      if (n.marks?.length) node.marks = n.marks.map((m) => ({ type: MARK_TO_TIPTAP[m] }));
      content.push(node);
    }
  }
  return { type: "doc", content: [content.length ? { type: "paragraph", content } : { type: "paragraph" }] };
}

// ------------------------------------------------------------- Tiptap → Inline

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function marksOf(raw: unknown): Array<"b" | "i" | "u"> {
  const found = new Set<"b" | "i" | "u">();
  if (Array.isArray(raw)) {
    for (const m of raw) {
      const key = isObj(m) && typeof m.type === "string" ? MARK_FROM_TIPTAP[m.type] : undefined;
      if (key) found.add(key);
    }
  }
  return MARK_ORDER.filter((m) => found.has(m));
}

function sameMarks(a: readonly string[] | undefined, b: readonly string[] | undefined): boolean {
  return (a ?? []).join() === (b ?? []).join();
}

/** Satu node inline Tiptap → nol atau lebih `Inline` mentah (belum digabung). */
function convertInline(node: unknown, out: Inline[], scanned: { n: number }): void {
  if (scanned.n++ > MAX_NODES_SCANNED || !isObj(node)) return;
  switch (node.type) {
    case "text": {
      if (typeof node.text !== "string") return;
      const marks = marksOf(node.marks);
      // Baris baru di dalam teks menjadi `br`.
      const parts = node.text.replace(CONTROL, "").split(/\r\n|\r|\n/);
      parts.forEach((part, i) => {
        if (i > 0) out.push({ type: "br" });
        if (part !== "") out.push(marks.length ? { type: "text", text: part, marks } : { type: "text", text: part });
      });
      return;
    }
    case "hardBreak":
      out.push({ type: "br" });
      return;
    case "field": {
      const a = isObj(node.attrs) ? node.attrs : {};
      const ref = typeof a.ref === "string" ? a.ref : "";
      if (ref.length > 80 || !REF_PATTERN.test(ref)) return;
      const field: Extract<Inline, { type: "field" }> = { type: "field", ref };
      if (typeof a.format === "string" && FORMATS.has(a.format)) field.format = a.format as typeof field.format;
      if (typeof a.fallback === "string" && a.fallback.trim() !== "") field.fallback = a.fallback.slice(0, 100);
      out.push(field);
      return;
    }
    default:
      return; // node tak dikenal (script, image, link, …) dibuang
  }
}

export function tiptapToInlines(json: unknown): Inline[] {
  const raw: Inline[] = [];
  const scanned = { n: 0 };
  const top = isObj(json) && Array.isArray(json.content) ? json.content : [];
  let paragraphs = 0;

  for (const node of top) {
    if (scanned.n++ > MAX_NODES_SCANNED) break;
    if (!isObj(node)) continue;
    if (node.type === "paragraph") {
      if (paragraphs++ > 0) raw.push({ type: "br" }); // Enter = baris baru
      const kids = Array.isArray(node.content) ? node.content : [];
      for (const k of kids) convertInline(k, raw, scanned);
    } else {
      convertInline(node, raw, scanned); // inline langsung di bawah doc (tidak lazim)
    }
  }

  // Gabungkan teks bertetangga bermark sama; panjang per teks dibatasi; buang `br` di ujung belakang.
  const merged: Inline[] = [];
  for (const n of raw) {
    const last = merged[merged.length - 1];
    if (n.type === "text" && last?.type === "text" && sameMarks(last.marks, n.marks)) {
      merged[merged.length - 1] = { ...last, text: last.text + n.text };
    } else {
      merged.push(n);
    }
  }
  while (merged.length && merged[merged.length - 1].type === "br") merged.pop();

  const result: Inline[] = [];
  for (const n of merged) {
    const item: Inline = n.type === "text" && n.text.length > LIMITS.textLength ? { ...n, text: n.text.slice(0, LIMITS.textLength) } : n;
    if (!InlineSchema.safeParse(item).success) continue;
    result.push(item);
    if (result.length >= LIMITS.inlinePerText) break;
  }
  return result;
}
