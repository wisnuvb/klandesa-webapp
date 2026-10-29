/**
 * Pemakaian peran, isian tambahan, dan daftar berulang di kertas — dipakai untuk memperingatkan
 * sebelum menghapus, dan untuk menolak penghapusan yang akan merusak surat.
 */
import type { Block, Inline, LeafBlock, LetterDocument } from "../document/schema";
import { parseRef } from "../registry";
import { walkBlocks, type DocResult } from "./ops";
import type { Usage } from "./types";

type Inlines = readonly Inline[] | undefined;

/** Semua rangkaian teks bergaya dalam satu blok daun (tempat rujukan isian bisa muncul). */
function inlineListsOf(b: LeafBlock): Inlines[] {
  switch (b.type) {
    case "paragraph":
    case "heading": return [b.content];
    case "title": return [b.title];
    case "memo": return [...b.rows.map((r) => r.value), b.dateline, b.addressee];
    case "table": return b.rows.flat();
    case "list":
    case "dictum":
    case "cc": return b.items;
    case "signature": return [b.dateline, ...b.slots.map((s) => s.caption)];
    default: return [];
  }
}

function blockUses(
  b: Block,
  test: {
    ref?: (p: NonNullable<ReturnType<typeof parseRef>>) => boolean;
    role?: string;
    group?: string;
  },
): boolean {
  if (b.type === "conditional" && test.ref) {
    const p = parseRef(b.when.ref);
    if (p && test.ref(p)) return true;
  }
  if (b.type === "columns" || b.type === "conditional") return false; // anak diperiksa sendiri
  if (test.ref) {
    for (const list of inlineListsOf(b)) {
      for (const n of list ?? []) {
        if (n.type !== "field") continue;
        const p = parseRef(n.ref);
        if (p && test.ref(p)) return true;
      }
    }
  }
  if (test.role !== undefined) {
    if (b.type === "personData" && b.role === test.role) return true;
    if (b.type === "signature" && b.slots.some((s) => s.who.kind === "peran" && s.who.role === test.role)) return true;
  }
  if (test.group !== undefined) {
    if (b.type === "repeatTable" && b.group === test.group) return true;
    if (b.type === "signature" && b.slots.some((s) => s.who.kind === "grup" && s.who.group === test.group)) return true;
  }
  return false;
}

function collect(doc: LetterDocument, test: Parameters<typeof blockUses>[1]): Usage {
  const blockIds: string[] = [];
  walkBlocks(doc, (b) => {
    if (blockUses(b, test)) blockIds.push(b.id);
  });
  return { count: blockIds.length, blockIds };
}

export const personUsage = (doc: LetterDocument, id: string): Usage =>
  collect(doc, { role: id, ref: (p) => p.kind === "person" && p.role === id });

export const fieldUsage = (doc: LetterDocument, id: string): Usage =>
  collect(doc, { ref: (p) => p.kind === "isian" && p.id === id });

export const groupUsage = (doc: LetterDocument, id: string): Usage => collect(doc, { group: id });

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
const inUse = (n: number) => fail(`Masih dipakai di ${n} bagian. Hapus atau ganti bagian itu dulu.`);

export function removePersonFromDoc(doc: LetterDocument, id: string): DocResult {
  const role = doc.people.find((p) => p.id === id);
  if (!role) return fail("Orang tidak ditemukan.");
  if (id === "pemohon" && doc.audience === "warga") return fail('Surat untuk warga selalu membutuhkan "Pemohon".');
  const u = personUsage(doc, id);
  if (u.count > 0) return inUse(u.count);
  return { ok: true, doc: { ...doc, people: doc.people.filter((p) => p.id !== id) } };
}

export function removeFieldFromDoc(doc: LetterDocument, id: string): DocResult {
  if (!doc.fields.some((f) => f.id === id)) return fail("Isian tidak ditemukan.");
  const u = fieldUsage(doc, id);
  if (u.count > 0) return inUse(u.count);
  return { ok: true, doc: { ...doc, fields: doc.fields.filter((f) => f.id !== id) } };
}

export function removeGroupFromDoc(doc: LetterDocument, id: string): DocResult {
  if (!doc.groups.some((g) => g.id === id)) return fail("Daftar tidak ditemukan.");
  const u = groupUsage(doc, id);
  if (u.count > 0) return inUse(u.count);
  return { ok: true, doc: { ...doc, groups: doc.groups.filter((g) => g.id !== id) } };
}

