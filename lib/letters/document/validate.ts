/**
 * Validasi dokumen v2: bentuk (zod) + konsistensi antar-bagian (rujukan isian, peran, grup,
 * ID unik, jumlah node). Dipakai server saat menyimpan dan klien saat mengedit, dengan
 * hasil yang sama.
 */
import { parseRef, RESERVED_NAMESPACES, isPersonField } from "../registry";
import { validateNumberPattern } from "../numbering";
import {
  DocumentSchema,
  LIMITS,
  type Block,
  type Inline,
  type LeafBlock,
  type LetterDocument,
} from "./schema";

export type DocumentIssue = { path: string; message: string };
export type ValidateResult =
  | { ok: true; doc: LetterDocument }
  | { ok: false; issues: DocumentIssue[] };

const MAX_ISSUES = 20;

type Inlines = readonly Inline[] | undefined;

/** Semua blok bertingkat dijadikan daftar datar (kolom & kondisi dibuka). */
export function flattenBlocks(body: readonly Block[]): LeafBlock[] {
  const out: LeafBlock[] = [];
  for (const b of body) {
    if (b.type === "columns") for (const col of b.children) out.push(...col);
    else if (b.type === "conditional") out.push(...b.children);
    else out.push(b);
  }
  return out;
}

function inlinesOf(b: LeafBlock): Inlines[] {
  switch (b.type) {
    case "paragraph":
    case "heading":
      return [b.content];
    case "title":
      return [b.title];
    case "memo":
      return [...b.rows.map((r) => r.value), b.dateline, b.addressee];
    case "table":
      return b.rows.flat();
    case "list":
    case "dictum":
    case "cc":
      return b.items;
    case "signature":
      return [b.dateline, ...b.slots.map((s) => s.caption)];
    default:
      return [];
  }
}

export function collectRefs(doc: LetterDocument): string[] {
  const refs: string[] = [];
  const visit = (list: Inlines) => {
    for (const n of list ?? []) if (n.type === "field") refs.push(n.ref);
  };
  for (const b of doc.body) {
    if (b.type === "conditional") refs.push(b.when.ref);
  }
  for (const b of flattenBlocks(doc.body)) for (const list of inlinesOf(b)) visit(list);
  return refs;
}

function countNodes(doc: LetterDocument): number {
  let n = 0;
  for (const b of doc.body) {
    n += 1;
    if (b.type === "columns") n += b.children.reduce((a, c) => a + c.length, 0);
    else if (b.type === "conditional") n += b.children.length;
  }
  for (const b of flattenBlocks(doc.body)) {
    for (const list of inlinesOf(b)) n += list?.length ?? 0;
    if (b.type === "table") n += b.rows.length;
  }
  return n;
}

export function validateDocument(input: unknown): ValidateResult {
  const parsed = DocumentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.slice(0, MAX_ISSUES).map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    };
  }
  const doc = parsed.data;
  const issues: DocumentIssue[] = [];
  const add = (path: string, message: string) => {
    if (issues.length < MAX_ISSUES) issues.push({ path, message });
  };

  if (countNodes(doc) > LIMITS.totalNodes) add("body", "Dokumen terlalu kompleks");

  // ---- ID unik
  const dup = (ids: string[], where: string) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) add(where, `ID ganda: ${id}`);
      seen.add(id);
    }
  };
  dup(doc.people.map((p) => p.id), "people");
  dup(doc.fields.map((f) => f.id), "fields");
  dup(doc.groups.map((g) => g.id), "groups");
  const blockIds: string[] = [];
  for (const b of doc.body) {
    blockIds.push(b.id);
    if (b.type === "columns") for (const c of b.children) blockIds.push(...c.map((x) => x.id));
    if (b.type === "conditional") blockIds.push(...b.children.map((x) => x.id));
  }
  dup(blockIds, "body");

  const roles = new Set(doc.people.map((p) => p.id));
  for (const r of roles) {
    if ((RESERVED_NAMESPACES as readonly string[]).includes(r)) add("people", `Nama peran "${r}" dipakai sistem`);
  }
  if (doc.audience === "warga" && !roles.has("pemohon")) {
    add("people", 'Surat untuk warga harus punya peran "pemohon"');
  }

  const fieldIds = new Set(doc.fields.map((f) => f.id));
  const groups = new Map(doc.groups.map((g) => [g.id, new Set(g.fields.map((f) => f.id))]));
  for (const f of [...doc.fields, ...doc.groups.flatMap((g) => g.fields)]) {
    if (f.type === "choice" && !(f.options && f.options.length >= 2)) {
      add(`fields.${f.id}`, "Isian pilihan butuh minimal 2 opsi");
    }
  }

  // ---- penomoran
  if (doc.numbering.mode !== "none") {
    const err = validateNumberPattern(doc.numbering.pattern, doc.numbering.mode);
    if (err) add("numbering.pattern", err);
  }

  // ---- rujukan isian
  const checkRef = (ref: string, path: string) => {
    const p = parseRef(ref);
    if (!p) return add(path, `Isian tidak dikenal: ${ref}`);
    if (p.kind === "person" && !roles.has(p.role)) add(path, `Peran "${p.role}" belum dibuat`);
    if (p.kind === "isian" && !fieldIds.has(p.id)) add(path, `Isian tambahan "${p.id}" belum dibuat`);
  };
  const checkRole = (role: string, path: string) => {
    if (!roles.has(role)) add(path, `Peran "${role}" belum dibuat`);
  };

  for (const b of doc.body) {
    if (b.type === "conditional") checkRef(b.when.ref, `body.${b.id}.when`);
  }
  for (const b of flattenBlocks(doc.body)) {
    for (const list of inlinesOf(b)) {
      for (const n of list ?? []) if (n.type === "field") checkRef(n.ref, `body.${b.id}`);
    }
    if (b.type === "personData") {
      checkRole(b.role, `body.${b.id}.role`);
      for (const f of b.fields) if (!isPersonField(f)) add(`body.${b.id}.fields`, `Isian orang tidak dikenal: ${f}`);
    }
    if (b.type === "repeatTable") {
      const g = groups.get(b.group);
      if (!g) add(`body.${b.id}.group`, `Daftar "${b.group}" belum dibuat`);
      else for (const c of b.columns) if (!g.has(c.field)) add(`body.${b.id}.columns`, `Kolom "${c.field}" tidak ada di daftar "${b.group}"`);
    }
    if (b.type === "signature") {
      for (const s of b.slots) {
        if (s.who.kind === "peran") checkRole(s.who.role, `body.${b.id}.slots.${s.id}`);
        if (s.who.kind === "grup" && !groups.has(s.who.group)) add(`body.${b.id}.slots.${s.id}`, `Daftar "${s.who.group}" belum dibuat`);
      }
    }
  }

  return issues.length ? { ok: false, issues } : { ok: true, doc };
}
