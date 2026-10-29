/**
 * Logika murni komposer surat (tanpa React/DOM): bentuk state formulir, pembangunan nilai
 * pratinjau, payload API, rekonstruksi dari draf, dan pemetaan klik-di-kertas → input.
 * Dipisah dari komponen agar bisa diuji dan dipakai ulang.
 */
import type { CustomField, LetterDocument } from "@/lib/letters/document/schema";
import type { FormSpec } from "@/lib/letters/document/form-spec";
import { isPersonField, parseRef, type PersonFieldKey } from "@/lib/letters/registry";
import { completeManualPerson, isRealIsoDate } from "@/lib/letters/server/input";
import {
  buildSuratValues,
  emptyLetterValues,
  type LetterValues,
  type OfficialValues,
  type PersonValues,
} from "@/lib/letters/values";
import type { OfficialId } from "@/lib/letters/registry";

export type PreviewContext = {
  desa: Record<string, string>;
  pejabat: Record<OfficialId, OfficialValues>;
  logoUrl?: string | null;
};

/** Satu orang berperan. `db` = nilai dari database (hanya mode resident); `values` = yang tampil/diedit. */
export type PersonState = {
  mode: "unset" | "resident" | "manual";
  residentId?: number;
  /** Teks di kotak pencarian warga. */
  query: string;
  db: PersonValues;
  values: PersonValues;
};

export type GroupRowState = {
  key: string;
  residentId?: number;
  query: string;
  /** Nilai isian grup dari database (kunci = id isian grup yang sama dengan isian orang). */
  db: Record<string, string>;
  values: Record<string, string>;
};

export type ComposerState = {
  people: Record<string, PersonState>;
  fields: Record<string, string>;
  groups: Record<string, GroupRowState[]>;
  /** YYYY-MM-DD */
  date: string;
  /** Nomor manual (mode penomoran `manual`). */
  number: string;
};

export type ApiPersonPayload =
  | { residentId: number; overrides?: PersonValues }
  | { manual: PersonValues };

export type LetterPayload = {
  templateId?: number;
  status: "draft" | "completed";
  letterDate: string;
  number?: string;
  people: Record<string, ApiPersonPayload>;
  fields: Record<string, string>;
  groups: Record<string, Array<{ residentId?: number; values: Record<string, string> }>>;
};

let rowSeq = 0;
export const newRowKey = () => `r${Date.now().toString(36)}${(rowSeq++).toString(36)}`;

export function todayIso(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

export function emptyPerson(): PersonState {
  return { mode: "unset", query: "", db: {}, values: {} };
}

export function emptyRow(): GroupRowState {
  return { key: newRowKey(), query: "", db: {}, values: {} };
}

/** State awal: tiap orang kosong, tiap grup dimulai dengan jumlah baris minimum (paling sedikit 1). */
export function initialState(spec: FormSpec, today: string = todayIso()): ComposerState {
  const people: Record<string, PersonState> = {};
  for (const p of spec.people) people[p.id] = emptyPerson();
  const fields: Record<string, string> = {};
  for (const f of spec.fields) fields[f.id] = "";
  const groups: Record<string, GroupRowState[]> = {};
  for (const g of spec.groups) groups[g.id] = Array.from({ length: Math.max(g.min, 1) }, emptyRow);
  return { people, fields, groups, date: today, number: "" };
}

const digitsOnly = (s: string) => s.replace(/\D/g, "");
export const moneyDigits = (s: string): string => digitsOnly(s).slice(0, 15);

/** Tanggal ISO → Date lokal jam 12 (sama dengan yang disimpan server). */
export function isoToDate(iso: string): Date {
  if (!isRealIsoDate(iso)) return new Date();
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/** Nilai kertas untuk pratinjau, dibangun dari state + konteks desa. Tidak pernah melempar. */
export function buildPreviewValues(args: {
  doc: Pick<LetterDocument, "groups" | "people">;
  context: PreviewContext;
  state: ComposerState;
  date: Date;
  nomor: string;
  today?: Date;
}): LetterValues {
  const { doc, context, state, date, nomor } = args;
  const today = args.today ?? new Date();
  const v = emptyLetterValues();

  for (const [role, p] of Object.entries(state.people)) {
    if (p.mode === "unset") continue;
    v.people[role] = p.mode === "manual" ? completeManualPerson(p.values, today) : { ...p.values };
  }
  v.fields = { ...state.fields };
  for (const g of doc.groups) {
    v.groups[g.id] = (state.groups[g.id] ?? []).map((r) => {
      const row: Record<string, string> = {};
      for (const f of g.fields) row[f.id] = r.values[f.id] ?? "";
      return row;
    });
  }
  v.desa = { ...context.desa };
  v.pejabat = context.pejabat;
  v.logoUrl = context.logoUrl ?? undefined;
  v.surat = buildSuratValues({ date, nomor, tempat: context.desa.nama ?? "" });
  return v;
}

const isBlankRecord = (r: Record<string, string>) => Object.values(r).every((x) => x.trim() === "");

/** Isian orang yang nilainya berbeda dari database (termasuk yang dikosongkan). */
export function personOverrides(p: PersonState): PersonValues {
  const out: PersonValues = {};
  const keys = new Set<string>([...Object.keys(p.values), ...Object.keys(p.db)]);
  for (const k of keys) {
    if (!isPersonField(k)) continue;
    const now = (p.values[k] ?? "").trim();
    const was = (p.db[k] ?? "").trim();
    if (now !== was) out[k as PersonFieldKey] = now;
  }
  return out;
}

function manualValues(values: PersonValues): PersonValues {
  const out: PersonValues = {};
  for (const [k, v] of Object.entries(values)) {
    if (isPersonField(k) && typeof v === "string" && v.trim() !== "") out[k as PersonFieldKey] = v.trim();
  }
  return out;
}

function fieldValue(def: Pick<CustomField, "type">, raw: string): string {
  const v = raw.trim();
  return def.type === "money" ? moneyDigits(v) : v;
}

/** Payload API dari state. Hanya yang perlu dikirim: selisih terhadap database, uang = digit, baris kosong dibuang. */
export function buildPayload(args: {
  spec: FormSpec;
  state: ComposerState;
  status: "draft" | "completed";
  templateId?: number;
  numberingMode: "auto" | "manual" | "none";
}): LetterPayload {
  const { spec, state, status, templateId, numberingMode } = args;

  const people: Record<string, ApiPersonPayload> = {};
  for (const role of spec.people) {
    const p = state.people[role.id];
    if (!p || p.mode === "unset") continue;
    if (p.mode === "resident" && p.residentId != null) {
      const overrides = personOverrides(p);
      people[role.id] = Object.keys(overrides).length ? { residentId: p.residentId, overrides } : { residentId: p.residentId };
    } else if (p.mode === "manual") {
      people[role.id] = { manual: manualValues(p.values) };
    }
  }

  const fields: Record<string, string> = {};
  for (const f of spec.fields) fields[f.id] = fieldValue(f, state.fields[f.id] ?? "");

  const groups: LetterPayload["groups"] = {};
  for (const g of spec.groups) {
    const rows: Array<{ residentId?: number; values: Record<string, string> }> = [];
    for (const r of state.groups[g.id] ?? []) {
      const values: Record<string, string> = {};
      for (const f of g.fields) {
        const now = fieldValue(f, r.values[f.id] ?? "");
        const was = r.residentId != null ? (r.db[f.id] ?? "").trim() : "";
        // Dikosongkan sengaja (ada isi dari database, kini kosong) dikirim sebagai "" agar benar-benar menghapus.
        if (now !== was) values[f.id] = now;
      }
      if (r.residentId == null && isBlankRecord(values)) continue;
      rows.push(r.residentId != null ? { residentId: r.residentId, values } : { values });
    }
    groups[g.id] = rows;
  }

  const payload: LetterPayload = { status, letterDate: state.date, people, fields, groups };
  if (templateId != null) payload.templateId = templateId;
  if (numberingMode === "manual" && state.number.trim() !== "") payload.number = state.number.trim();
  return payload;
}

/**
 * Rekonstruksi state dari nilai draf tersimpan. `residentId` tidak tersimpan, jadi semua orang/baris
 * dibuka sebagai isian manual yang bisa diubah.
 */
export function stateFromValues(args: {
  doc: Pick<LetterDocument, "groups">;
  spec: FormSpec;
  values: LetterValues;
  letterDate: string;
  letterNumber?: string;
}): ComposerState {
  const { spec, values, doc } = args;
  const state = initialState(spec, (args.letterDate || "").slice(0, 10) || todayIso());
  if (!isRealIsoDate(state.date)) state.date = todayIso();

  for (const role of spec.people) {
    const saved = values.people[role.id];
    if (saved && Object.values(saved).some((x) => typeof x === "string" && x.trim() !== "")) {
      state.people[role.id] = {
        mode: "manual",
        query: saved.nama ?? "",
        db: {},
        values: { ...saved },
      };
    }
  }
  for (const f of spec.fields) state.fields[f.id] = values.fields[f.id] ?? "";
  for (const g of doc.groups) {
    const rows = values.groups[g.id] ?? [];
    if (rows.length > 0) {
      state.groups[g.id] = rows.map((r) => ({
        key: newRowKey(),
        query: r.nama ?? "",
        db: {},
        values: { ...r },
      }));
    }
  }
  const n = args.letterNumber ?? "";
  state.number = /^(DRAFT-|TANPA-NOMOR-)/.test(n) ? "" : n;
  return state;
}

// ---------------------------------------------------------------- pemetaan klik kertas → input

export type FieldTarget =
  | { kind: "input"; id: string; fallbackId?: string }
  | { kind: "auto"; message: string }
  | null;

export const MSG_AUTO_DESA = "Terisi otomatis dari Pengaturan Desa.";
export const MSG_AUTO_SURAT = "Terisi otomatis dari tanggal dan nomor surat.";

const GROUP_REF = /^grup\.([a-z][a-z0-9_]{0,29})\.(\d{1,3})\.([a-z][a-z0-9_]{0,29})$/;

/** Id elemen input yang cocok dengan isian di kertas (`data-ref`). */
export function refToTarget(ref: string): FieldTarget {
  const g = GROUP_REF.exec(ref);
  if (g) return { kind: "input", id: `group-${g[1]}-${g[2]}-${g[3]}`, fallbackId: `group-${g[1]}-${g[2]}-cari` };
  const p = parseRef(ref);
  if (!p) return null;
  switch (p.kind) {
    case "person": return { kind: "input", id: `person-${p.role}-${p.field}`, fallbackId: `person-${p.role}-cari` };
    case "isian": return { kind: "input", id: `field-${p.id}` };
    case "desa":
    case "pejabat": return { kind: "auto", message: MSG_AUTO_DESA };
    case "surat": return { kind: "auto", message: MSG_AUTO_SURAT };
  }
}

// ---------------------------------------------------------------- pemeriksaan sebelum terbit

export type MissingItem = { inputId: string; message: string };

/** Isian wajib yang masih kosong (untuk memfokuskan yang pertama sebelum menerbitkan). */
export function missingForCompletion(spec: FormSpec, state: ComposerState, numberingMode: "auto" | "manual" | "none"): MissingItem[] {
  const out: MissingItem[] = [];
  for (const role of spec.people) {
    const p = state.people[role.id];
    const filled = p && p.mode !== "unset" && (p.values.nama ?? "").trim() !== "";
    if (role.required && !filled) out.push({ inputId: `person-${role.id}-cari`, message: `${role.label} belum diisi` });
  }
  for (const f of spec.fields) {
    if (f.required && (state.fields[f.id] ?? "").trim() === "") out.push({ inputId: `field-${f.id}`, message: `${f.label} belum diisi` });
  }
  for (const g of spec.groups) {
    const rows = state.groups[g.id] ?? [];
    const filledRows = rows.filter((r) => !isBlankRecord(r.values) || r.residentId != null).length;
    if (filledRows < g.min) out.push({ inputId: `group-${g.id}-0-${g.fields[0]?.id ?? "cari"}`, message: `${g.label} minimal ${g.min} baris` });
    rows.forEach((r, i) => {
      if (isBlankRecord(r.values) && r.residentId == null) return;
      for (const f of g.fields) {
        if (f.required && (r.values[f.id] ?? "").trim() === "") {
          out.push({ inputId: `group-${g.id}-${i}-${f.id}`, message: `${g.label} baris ${i + 1}: ${f.label} belum diisi` });
        }
      }
    });
  }
  if (numberingMode === "manual" && state.number.trim() === "") out.push({ inputId: "letter-number", message: "Nomor surat belum diisi" });
  return out;
}

/** Apakah state berbeda dari awal (untuk peringatan "belum tersimpan"). */
export function stateSignature(state: ComposerState): string {
  return JSON.stringify({
    p: Object.entries(state.people).map(([k, v]) => [k, v.mode, v.residentId, v.values]),
    f: state.fields,
    g: Object.entries(state.groups).map(([k, rows]) => [k, rows.map((r) => [r.residentId, r.values])]),
    d: state.date,
    n: state.number,
  });
}
