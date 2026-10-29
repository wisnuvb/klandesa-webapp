/**
 * Operasi dokumen murni & imutabel untuk editor kanvas. Tidak pernah memutasi masukan.
 * Operasi yang ditolak mengembalikan `{ ok:false, error }` berbahasa awam (tidak melempar).
 *
 * Blok dialamatkan lewat `id` (unik di seluruh dokumen). `columns` dan `conditional` hanya
 * berisi blok daun — tidak ada wadah di dalam wadah.
 */
import type { Block, CustomField, Group, LeafBlock, LetterDocument, PersonRole } from "../document/schema";
import type { FieldType } from "../registry";
import { newBlockId, slugId, type Rng } from "./ids";
import type { InsertTarget } from "./types";

export type DocResult = { ok: true; doc: LetterDocument } | { ok: false; error: string };

type ColumnsBlock = Extract<Block, { type: "columns" }>;
type ConditionalBlock = Extract<Block, { type: "conditional" }>;
type Container = ColumnsBlock | ConditionalBlock;

export type Parent =
  | { kind: "body" }
  | { kind: "columns"; id: string; column: number }
  | { kind: "conditional"; id: string };

export type Located = { block: Block; parent: Parent; index: number };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
export const isContainer = (b: Block): b is Container => b.type === "columns" || b.type === "conditional";

// ------------------------------------------------------------------ penelusuran

export function walkBlocks(
  doc: LetterDocument,
  visit: (block: Block, info: { parent: Parent; index: number }) => void,
): void {
  doc.body.forEach((b, index) => {
    visit(b, { parent: { kind: "body" }, index });
    if (b.type === "columns") {
      b.children.forEach((col, column) =>
        col.forEach((c, i) => visit(c, { parent: { kind: "columns", id: b.id, column }, index: i })),
      );
    } else if (b.type === "conditional") {
      b.children.forEach((c, i) => visit(c, { parent: { kind: "conditional", id: b.id }, index: i }));
    }
  });
}

export function findBlock(doc: LetterDocument, id: string): Located | null {
  let found: Located | null = null;
  walkBlocks(doc, (block, info) => {
    if (!found && block.id === id) found = { block, parent: info.parent, index: info.index };
  });
  return found;
}

export function allBlockIds(doc: LetterDocument): Set<string> {
  const ids = new Set<string>();
  walkBlocks(doc, (b) => ids.add(b.id));
  return ids;
}

function listOf(doc: LetterDocument, parent: Parent): readonly Block[] {
  if (parent.kind === "body") return doc.body;
  const c = doc.body.find((b) => b.id === parent.id);
  if (!c) return [];
  if (parent.kind === "columns" && c.type === "columns") return c.children[parent.column] ?? [];
  if (parent.kind === "conditional" && c.type === "conditional") return c.children;
  return [];
}

function withList(doc: LetterDocument, parent: Parent, list: readonly Block[]): LetterDocument {
  if (parent.kind === "body") return { ...doc, body: list as Block[] };
  const body = doc.body.map((b): Block => {
    if (b.id !== parent.id) return b;
    if (parent.kind === "columns" && b.type === "columns") {
      return { ...b, children: b.children.map((col, i) => (i === parent.column ? (list as LeafBlock[]) : col)) };
    }
    if (parent.kind === "conditional" && b.type === "conditional") return { ...b, children: list as LeafBlock[] };
    return b;
  });
  return { ...doc, body };
}

// --------------------------------------------------------------------- sasaran

type Spot = { parent: Parent; index: number };

function resolveTarget(doc: LetterDocument, at?: InsertTarget): Spot | { error: string } {
  if (!at) return { parent: { kind: "body" }, index: doc.body.length };
  if ("before" in at || "after" in at) {
    const ref = "before" in at ? at.before : at.after;
    const loc = findBlock(doc, ref);
    if (!loc) return { error: "Bagian acuan tidak ditemukan." };
    return { parent: loc.parent, index: loc.index + ("after" in at ? 1 : 0) };
  }
  const c = doc.body.find((b) => b.id === at.container);
  if (!c || !isContainer(c)) return { error: "Tempat tujuan bukan kolom atau bagian bersyarat." };
  if (c.type === "columns") {
    const column = at.column ?? 0;
    if (column < 0 || column >= c.children.length) return { error: "Kolom tujuan tidak ada." };
    const len = c.children[column].length;
    return { parent: { kind: "columns", id: c.id, column }, index: Math.min(Math.max(at.index ?? len, 0), len) };
  }
  return {
    parent: { kind: "conditional", id: c.id },
    index: Math.min(Math.max(at.index ?? c.children.length, 0), c.children.length),
  };
}

const NEST_ERROR = "Kolom dan bagian bersyarat tidak bisa diletakkan di dalam kolom atau bagian bersyarat lain.";

function spliceIn(doc: LetterDocument, block: Block, spot: Spot): DocResult {
  if (isContainer(block) && spot.parent.kind !== "body") return fail(NEST_ERROR);
  const list = [...listOf(doc, spot.parent)];
  list.splice(spot.index, 0, block);
  return { ok: true, doc: withList(doc, spot.parent, list) };
}

function spliceOut(doc: LetterDocument, loc: Located): LetterDocument {
  const list = [...listOf(doc, loc.parent)];
  list.splice(loc.index, 1);
  return withList(doc, loc.parent, list);
}

// ------------------------------------------------------------------- operasi blok

export function insertBlockAt(doc: LetterDocument, block: Block, at?: InsertTarget): DocResult {
  if (findBlock(doc, block.id)) return fail("ID bagian sudah dipakai.");
  const spot = resolveTarget(doc, at);
  if ("error" in spot) return fail(spot.error);
  return spliceIn(doc, block, spot);
}

/** `columns`: jumlah kolom selalu sama dengan jumlah rasio; kelebihan isi digabung ke kolom terakhir. */
function normalizeColumns(c: ColumnsBlock): ColumnsBlock {
  const n = c.ratios.length;
  if (c.children.length === n) return c;
  const kids = c.children.slice(0, n).map((x) => [...x]);
  while (kids.length < n) kids.push([]);
  if (c.children.length > n) kids[n - 1] = [...kids[n - 1], ...c.children.slice(n).flat()];
  return { ...c, children: kids };
}

export function updateBlockById(
  doc: LetterDocument,
  id: string,
  patch: Partial<Block> | ((b: Block) => Block),
): DocResult {
  const loc = findBlock(doc, id);
  if (!loc) return fail("Bagian tidak ditemukan.");
  let next = (typeof patch === "function" ? patch(loc.block) : { ...loc.block, ...patch }) as Block;
  if (next.type !== loc.block.type) return fail("Jenis bagian tidak boleh diubah.");
  if (next.id !== id) next = { ...next, id } as Block;
  if (next.type === "columns") next = normalizeColumns(next);
  const list = [...listOf(doc, loc.parent)];
  list[loc.index] = next;
  return { ok: true, doc: withList(doc, loc.parent, list) };
}

export function removeBlockById(doc: LetterDocument, id: string): DocResult {
  const loc = findBlock(doc, id);
  return loc ? { ok: true, doc: spliceOut(doc, loc) } : fail("Bagian tidak ditemukan.");
}

export function moveBlockTo(doc: LetterDocument, id: string, to: InsertTarget): DocResult {
  const loc = findBlock(doc, id);
  if (!loc) return fail("Bagian tidak ditemukan.");
  if ("container" in to && to.container === id) return fail("Bagian tidak bisa dipindahkan ke dalam dirinya sendiri.");
  if (("before" in to && to.before === id) || ("after" in to && to.after === id)) return { ok: true, doc };
  const without = spliceOut(doc, loc);
  const spot = resolveTarget(without, to);
  if ("error" in spot) return fail(spot.error);
  return spliceIn(without, loc.block, spot);
}

export function moveBlockByDelta(doc: LetterDocument, id: string, delta: -1 | 1): DocResult {
  const loc = findBlock(doc, id);
  if (!loc) return fail("Bagian tidak ditemukan.");
  const list = [...listOf(doc, loc.parent)];
  const target = loc.index + delta;
  if (target < 0) return fail("Sudah berada di posisi paling atas.");
  if (target >= list.length) return fail("Sudah berada di posisi paling bawah.");
  [list[loc.index], list[target]] = [list[target], list[loc.index]];
  return { ok: true, doc: withList(doc, loc.parent, list) };
}

/** Klon dalam dengan id baru untuk blok dan semua anaknya. */
export function cloneWithNewIds(block: Block, taken: Set<string>, rng?: Rng): Block {
  const fresh = (): string => {
    const id = newBlockId(taken, rng);
    taken.add(id);
    return id;
  };
  const copy = JSON.parse(JSON.stringify(block)) as Block;
  copy.id = fresh();
  if (copy.type === "columns") copy.children.forEach((col) => col.forEach((c) => (c.id = fresh())));
  else if (copy.type === "conditional") copy.children.forEach((c) => (c.id = fresh()));
  return copy;
}

export function duplicateBlockById(
  doc: LetterDocument,
  id: string,
  rng?: Rng,
): (DocResult & { ok: true; newId: string }) | { ok: false; error: string } {
  const loc = findBlock(doc, id);
  if (!loc) return fail("Bagian tidak ditemukan.");
  const copy = cloneWithNewIds(loc.block, allBlockIds(doc), rng);
  const res = spliceIn(doc, copy, { parent: loc.parent, index: loc.index + 1 });
  return res.ok ? { ok: true, doc: res.doc, newId: copy.id } : res;
}

// ------------------------------------------------------- halaman, penomoran, meta

export const patchPage = (doc: LetterDocument, patch: Partial<LetterDocument["page"]>): LetterDocument => ({
  ...doc,
  page: { ...doc.page, ...patch },
});
export const patchNumbering = (doc: LetterDocument, patch: Partial<LetterDocument["numbering"]>): LetterDocument => ({
  ...doc,
  numbering: { ...doc.numbering, ...patch },
});
export const patchMeta = (
  doc: LetterDocument,
  patch: Partial<Pick<LetterDocument, "kind" | "audience" | "letterhead">>,
): LetterDocument => ({ ...doc, ...patch });

// ------------------------------------------------- orang, isian, daftar berulang

const patchById = <T extends { id: string }>(list: readonly T[], id: string, patch: Partial<Omit<T, "id">>): T[] =>
  list.map((x) => (x.id === id ? { ...x, ...patch, id } : x));

export function addPersonRole(
  doc: LetterDocument,
  label: string,
  opts: Partial<Omit<PersonRole, "id" | "label">> = {},
): { doc: LetterDocument; id: string } {
  const id = slugId(label, doc.people.map((p) => p.id));
  const role: PersonRole = { id, label: label.trim() || "Orang", required: true, allowManual: true, ...opts };
  return { doc: { ...doc, people: [...doc.people, role] }, id };
}
export const patchPerson = (doc: LetterDocument, id: string, patch: Partial<Omit<PersonRole, "id">>): LetterDocument => ({
  ...doc,
  people: patchById(doc.people, id, patch),
});

export function addCustomField(
  doc: LetterDocument,
  label: string,
  type: FieldType = "text",
  opts: Partial<Omit<CustomField, "id" | "label" | "type">> = {},
): { doc: LetterDocument; id: string } {
  const id = slugId(label, doc.fields.map((f) => f.id));
  const field: CustomField = { id, label: label.trim() || "Isian", type, required: true, sensitive: false, ...opts };
  return { doc: { ...doc, fields: [...doc.fields, field] }, id };
}
export const patchField = (doc: LetterDocument, id: string, patch: Partial<Omit<CustomField, "id">>): LetterDocument => ({
  ...doc,
  fields: patchById(doc.fields, id, patch),
});

export function addGroupDef(
  doc: LetterDocument,
  label: string,
  opts: Partial<Omit<Group, "id" | "label" | "fields">> & { fields?: CustomField[] } = {},
): { doc: LetterDocument; id: string } {
  const id = slugId(label, doc.groups.map((g) => g.id));
  const { fields, ...rest } = opts;
  const group: Group = {
    id,
    label: label.trim() || "Daftar",
    min: 1,
    max: 10,
    personRows: false,
    fields: fields ?? [
      { id: "nama", label: "Nama", type: "text", required: true, sensitive: false },
      { id: "nik", label: "NIK", type: "text", required: true, sensitive: false },
    ],
    ...rest,
  };
  return { doc: { ...doc, groups: [...doc.groups, group] }, id };
}
export const patchGroup = (doc: LetterDocument, id: string, patch: Partial<Omit<Group, "id">>): LetterDocument => ({
  ...doc,
  groups: patchById(doc.groups, id, patch),
});
