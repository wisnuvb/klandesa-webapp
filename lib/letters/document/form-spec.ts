/**
 * Dari dokumen → apa yang harus ditanyakan form pembuatan surat. Operator tidak pernah
 * mendeklarasikan form; form turun otomatis dari isi kanvas, sehingga "isian" yang dipakai
 * di kertas = pertanyaan yang muncul, tidak lebih dan tidak kurang.
 */
import { parseRef, type PersonFieldKey } from "../registry";
import { collectRefs, flattenBlocks } from "./validate";
import type { CustomField, Group, LetterDocument, PersonRole } from "./schema";

export type FormSpec = {
  /** Orang yang perlu dipilih/diisi, beserta isian orang yang benar-benar dipakai di kertas. */
  people: Array<PersonRole & { fields: PersonFieldKey[] }>;
  fields: CustomField[];
  groups: Group[];
  /** Terisi otomatis dari profil desa, pejabat, dan data surat; tidak ditanyakan. */
  auto: { desa: string[]; pejabat: string[]; surat: string[] };
};

export function deriveFormSpec(doc: LetterDocument): FormSpec {
  const used = new Map<string, Set<PersonFieldKey>>();
  const auto = { desa: new Set<string>(), pejabat: new Set<string>(), surat: new Set<string>() };
  const usedIsian = new Set<string>();

  const touchRole = (role: string, field?: PersonFieldKey) => {
    if (!used.has(role)) used.set(role, new Set());
    if (field) used.get(role)!.add(field);
  };

  for (const ref of collectRefs(doc)) {
    const p = parseRef(ref);
    if (!p) continue;
    if (p.kind === "person") touchRole(p.role, p.field);
    else if (p.kind === "isian") usedIsian.add(p.id);
    else if (p.kind === "desa") auto.desa.add(ref);
    else if (p.kind === "pejabat") auto.pejabat.add(ref);
    else auto.surat.add(ref);
  }
  for (const b of flattenBlocks(doc.body)) {
    if (b.type === "personData") for (const f of b.fields) touchRole(b.role, f as PersonFieldKey);
    if (b.type === "signature") {
      for (const s of b.slots) {
        if (s.who.kind === "peran") touchRole(s.who.role, "nama");
        if (s.who.kind === "pejabat") auto.pejabat.add(`pejabat.${s.who.official}.nama`);
      }
    }
  }

  return {
    people: doc.people.map((r) => ({ ...r, fields: [...(used.get(r.id) ?? [])] })),
    fields: doc.fields.filter((f) => usedIsian.has(f.id)),
    groups: doc.groups,
    auto: { desa: [...auto.desa], pejabat: [...auto.pejabat], surat: [...auto.surat] },
  };
}

export type LintWarning = { code: string; message: string };

/** "Cek surat": saran ramah operator, tidak menghalangi penyimpanan. */
export function lintDocument(doc: LetterDocument): LintWarning[] {
  const out: LintWarning[] = [];
  const blocks = flattenBlocks(doc.body);
  const refs = collectRefs(doc);

  if (doc.body.length === 0) out.push({ code: "EMPTY_BODY", message: "Surat masih kosong." });
  if (!blocks.some((b) => b.type === "signature")) {
    out.push({ code: "NO_SIGNATURE", message: "Belum ada bagian tanda tangan." });
  }
  const showsNumber =
    blocks.some((b) => (b.type === "title" && b.showNumber) || b.type === "memo") ||
    refs.includes("surat.nomor");
  if (doc.numbering.mode !== "none" && !showsNumber) {
    out.push({ code: "NUMBER_NOT_SHOWN", message: "Nomor surat diatur tetapi tidak tampil di kertas." });
  }
  if (doc.numbering.mode === "none" && (blocks.some((b) => b.type === "title" && b.showNumber) || refs.includes("surat.nomor"))) {
    out.push({ code: "NUMBER_DISABLED", message: "Kertas menampilkan nomor, tetapi penomoran dimatikan." });
  }
  const usedIsian = new Set(refs.map(parseRef).flatMap((p) => (p?.kind === "isian" ? [p.id] : [])));
  for (const f of doc.fields) {
    if (!usedIsian.has(f.id)) out.push({ code: "UNUSED_FIELD", message: `Isian "${f.label}" dibuat tetapi belum dipakai di kertas.` });
  }
  const usedRoles = new Set<string>();
  for (const r of refs.map(parseRef)) if (r?.kind === "person") usedRoles.add(r.role);
  for (const b of blocks) {
    if (b.type === "personData") usedRoles.add(b.role);
    if (b.type === "signature") for (const s of b.slots) if (s.who.kind === "peran") usedRoles.add(s.who.role);
  }
  for (const r of doc.people) {
    if (!usedRoles.has(r.id) && r.id !== "pemohon") out.push({ code: "UNUSED_ROLE", message: `Orang "${r.label}" belum dipakai di kertas.` });
  }
  const usedGroups = new Set<string>();
  for (const b of blocks) {
    if (b.type === "repeatTable") usedGroups.add(b.group);
    if (b.type === "signature") for (const s of b.slots) if (s.who.kind === "grup") usedGroups.add(s.who.group);
  }
  for (const g of doc.groups) {
    if (!usedGroups.has(g.id)) out.push({ code: "UNUSED_GROUP", message: `Daftar "${g.label}" belum dipakai di kertas.` });
  }
  return out;
}
