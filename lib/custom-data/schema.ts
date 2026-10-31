/**
 * Tabel/kolom kustom per desa: aturan murni (tanpa DB) untuk skema, nilai, evolusi skema, dan CSV.
 * Prinsip: tipe terbatas, tanpa SQL bebas, skema hanya bertambah (kolom diarsipkan, tak dihapus; tipe tak bisa diubah),
 * dan setiap kolom punya kelas data pribadi yang menentukan apakah nilainya boleh keluar lewat API.
 */

export const FIELD_TYPES = ["text", "longtext", "number", "date", "boolean", "select"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];
export const PII_CLASSES = ["NONE", "PERSONAL", "SENSITIVE"] as const;
export type PiiClass = (typeof PII_CLASSES)[number];

export const LIMITS = {
  tablesPerVillage: 20,
  activeFieldsPerTable: 30,
  totalFieldsPerTable: 60,
  recordsPerTable: 20_000,
  selectOptions: 30,
  optionLength: 60,
  text: 255,
  longtext: 5000,
  name: 100,
  description: 500,
} as const;

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: "Teks pendek",
  longtext: "Teks panjang",
  number: "Angka",
  date: "Tanggal",
  boolean: "Ya / Tidak",
  select: "Pilihan",
};

export const PII_LABEL: Record<PiiClass, { label: string; hint: string }> = {
  NONE: { label: "Bukan data pribadi", hint: "Boleh dibaca aplikasi lain lewat API (bila kuncinya punya akses data kustom)." },
  PERSONAL: { label: "Data pribadi", hint: "Tidak pernah keluar lewat API. Hanya terlihat di aplikasi Klandesa oleh yang berwenang." },
  SENSITIVE: { label: "Data sangat sensitif", hint: "Misalnya kesehatan atau penghasilan. Tidak pernah keluar lewat API." },
};

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: unknown;
  piiClass: PiiClass;
  position: number;
  isArchived: boolean;
}

export const isFieldType = (v: unknown): v is FieldType => typeof v === "string" && (FIELD_TYPES as readonly string[]).includes(v);
export const isPiiClass = (v: unknown): v is PiiClass => typeof v === "string" && (PII_CLASSES as readonly string[]).includes(v);

const RESERVED_KEYS = new Set(["id", "data", "created_at", "updated_at", "deleted_at", "resident_id", "resident", "table", "village", "village_id", "constructor", "prototype", "proto"]);
export const KEY_PATTERN = /^[a-z][a-z0-9_]{0,59}$/;
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,59}$/;

const fold = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** "Penerima Bantuan Beras!" → "penerima-bantuan-beras". Kosong bila tak ada huruf/angka. */
export function slugify(name: string, max = 60): string {
  return fold(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}

/** Label → kunci kolom ("Jumlah Anggota" → "jumlah_anggota"), dijamin lolos KEY_PATTERN, bukan kata cadangan, dan unik. */
export function fieldKeyFor(label: string, taken: ReadonlySet<string>): string {
  let base = fold(label).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!base || !/^[a-z]/.test(base)) base = `kolom_${base}`.replace(/_$/, "");
  base = base.slice(0, 54).replace(/_+$/g, "") || "kolom";
  if (RESERVED_KEYS.has(base)) base = `${base}_1`;
  let key = base;
  for (let i = 2; taken.has(key) || RESERVED_KEYS.has(key); i++) key = `${base}_${i}`;
  return key;
}

export interface NewFieldInput {
  label?: unknown;
  type?: unknown;
  required?: unknown;
  options?: unknown;
  piiClass?: unknown;
}

export interface CleanNewField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: unknown;
  piiClass: PiiClass;
}

type Errs = string[];

function cleanOptions(type: FieldType, raw: unknown, errors: Errs, label: string): unknown {
  if (type === "select") {
    const list = Array.isArray(raw) ? raw.map((o) => (typeof o === "string" ? o.trim().replace(/\s+/g, " ") : "")) : [];
    if (list.some((o) => !o)) errors.push(`Kolom "${label}": pilihan tidak boleh kosong.`);
    const unique = [...new Set(list.filter(Boolean))];
    if (unique.length < 2) errors.push(`Kolom "${label}": beri minimal 2 pilihan.`);
    if (unique.length > LIMITS.selectOptions) errors.push(`Kolom "${label}": maksimal ${LIMITS.selectOptions} pilihan.`);
    if (unique.some((o) => o.length > LIMITS.optionLength)) errors.push(`Kolom "${label}": tiap pilihan maksimal ${LIMITS.optionLength} karakter.`);
    return unique;
  }
  if (type === "number") {
    const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const out: Record<string, unknown> = {};
    for (const k of ["min", "max"] as const) {
      if (o[k] === undefined || o[k] === null || o[k] === "") continue;
      const n = Number(o[k]);
      if (!Number.isFinite(n)) errors.push(`Kolom "${label}": batas ${k === "min" ? "bawah" : "atas"} harus angka.`);
      else out[k] = n;
    }
    if (typeof out.min === "number" && typeof out.max === "number" && out.min > out.max) errors.push(`Kolom "${label}": batas bawah lebih besar dari batas atas.`);
    if (typeof o.unit === "string" && o.unit.trim()) out.unit = o.unit.trim().slice(0, 20);
    return Object.keys(out).length ? out : null;
  }
  return null;
}

export function cleanNewField(input: NewFieldInput, taken: ReadonlySet<string>, errors: Errs): CleanNewField | null {
  const label = typeof input.label === "string" ? input.label.trim().replace(/\s+/g, " ") : "";
  if (!label) {
    errors.push("Nama kolom wajib diisi.");
    return null;
  }
  if (label.length > LIMITS.name) {
    errors.push(`Nama kolom "${label.slice(0, 20)}…" terlalu panjang (maksimal ${LIMITS.name} karakter).`);
    return null;
  }
  if (!isFieldType(input.type)) {
    errors.push(`Kolom "${label}": jenis isian tidak dikenal.`);
    return null;
  }
  const piiClass = input.piiClass === undefined || input.piiClass === "" ? "NONE" : input.piiClass;
  if (!isPiiClass(piiClass)) {
    errors.push(`Kolom "${label}": kelas data tidak dikenal.`);
    return null;
  }
  const before = errors.length;
  const options = cleanOptions(input.type, input.options, errors, label);
  if (errors.length > before) return null;
  return { key: fieldKeyFor(label, taken), label, type: input.type, required: input.required === true, options, piiClass };
}

export interface TableInput {
  name?: unknown;
  description?: unknown;
  linkResident?: unknown;
  fields?: unknown;
}

export type TableValidation =
  | { ok: true; value: { name: string; slug: string; description: string | null; linkResident: boolean; fields: CleanNewField[] } }
  | { ok: false; errors: string[] };

export function validateTableInput(input: TableInput): TableValidation {
  const errors: Errs = [];
  const name = typeof input.name === "string" ? input.name.trim().replace(/\s+/g, " ") : "";
  if (!name) errors.push("Nama tabel wajib diisi.");
  if (name.length > LIMITS.name) errors.push(`Nama tabel maksimal ${LIMITS.name} karakter.`);
  const slug = slugify(name);
  if (name && !slug) errors.push("Nama tabel harus memuat huruf atau angka.");
  const description = typeof input.description === "string" && input.description.trim() ? input.description.trim() : null;
  if (description && description.length > LIMITS.description) errors.push(`Keterangan maksimal ${LIMITS.description} karakter.`);

  const raw = Array.isArray(input.fields) ? input.fields : [];
  if (raw.length === 0) errors.push("Tambahkan minimal satu kolom.");
  if (raw.length > LIMITS.activeFieldsPerTable) errors.push(`Maksimal ${LIMITS.activeFieldsPerTable} kolom per tabel.`);

  const taken = new Set<string>();
  const fields: CleanNewField[] = [];
  for (const f of raw.slice(0, LIMITS.activeFieldsPerTable)) {
    const c = cleanNewField((f ?? {}) as NewFieldInput, taken, errors);
    if (c) {
      taken.add(c.key);
      fields.push(c);
    }
  }
  const labels = fields.map((f) => f.label.toLowerCase());
  if (new Set(labels).size !== labels.length) errors.push("Ada dua kolom dengan nama yang sama.");

  return errors.length ? { ok: false, errors } : { ok: true, value: { name, slug, description, linkResident: input.linkResident === true, fields } };
}

// ---------- nilai baris ----------

export type RecordValidation = { ok: true; data: Record<string, unknown> } | { ok: false; errors: Record<string, string> };

const isEmpty = (v: unknown) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

function realDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

function cleanValue(f: FieldDef, v: unknown): { ok: true; value: unknown } | { ok: false; error: string } {
  switch (f.type) {
    case "text":
    case "longtext": {
      if (typeof v !== "string") return { ok: false, error: "Harus berupa teks." };
      const s = v.trim();
      const max = f.type === "text" ? LIMITS.text : LIMITS.longtext;
      return s.length > max ? { ok: false, error: `Maksimal ${max} karakter.` } : { ok: true, value: s };
    }
    case "number": {
      const n = typeof v === "number" ? v : typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : NaN;
      if (!Number.isFinite(n)) return { ok: false, error: "Harus berupa angka." };
      const o = (f.options && typeof f.options === "object" ? f.options : {}) as { min?: number; max?: number };
      if (typeof o.min === "number" && n < o.min) return { ok: false, error: `Minimal ${o.min}.` };
      if (typeof o.max === "number" && n > o.max) return { ok: false, error: `Maksimal ${o.max}.` };
      return { ok: true, value: n };
    }
    case "date":
      return typeof v === "string" && realDate(v) ? { ok: true, value: v } : { ok: false, error: "Tanggal tidak valid (format tahun-bulan-tanggal)." };
    case "boolean":
      return typeof v === "boolean" ? { ok: true, value: v } : { ok: false, error: "Harus Ya atau Tidak." };
    case "select": {
      const list = Array.isArray(f.options) ? (f.options as string[]) : [];
      return typeof v === "string" && list.includes(v) ? { ok: true, value: v } : { ok: false, error: "Pilih salah satu dari daftar." };
    }
  }
}

/**
 * Validasi baris terhadap skema. `create`: semua kolom aktif dinilai. `update`: nilai baru digabung dengan yang lama dan
 * kolom yang tak disebut tetap; mengirim null/kosong mengosongkan kolom opsional. Kolom tak dikenal atau diarsipkan ditolak.
 */
export function validateRecord(fields: readonly FieldDef[], input: unknown, existing: Record<string, unknown> = {}, mode: "create" | "update" = "create"): RecordValidation {
  // Tanpa prototipe: kunci seperti "__proto__" harus tercatat sebagai galat, bukan diabaikan diam-diam oleh JavaScript.
  const errors: Record<string, string> = Object.create(null);
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, errors: { _: "Isi data tidak valid." } };
  const given = input as Record<string, unknown>;
  const active = new Map(fields.filter((f) => !f.isArchived).map((f) => [f.key, f]));

  for (const k of Object.keys(given)) if (!active.has(k)) errors[k] = "Kolom ini tidak dikenal atau sudah diarsipkan.";

  const data: Record<string, unknown> = {};
  for (const f of active.values()) {
    const has = Object.prototype.hasOwnProperty.call(given, f.key);
    const raw = has ? given[f.key] : mode === "update" ? existing[f.key] : undefined;
    if (isEmpty(raw)) {
      if (f.required) errors[f.key] = "Wajib diisi.";
      continue;
    }
    if (mode === "update" && !has) {
      data[f.key] = raw; // nilai lama tidak divalidasi ulang (skema bisa berubah sejak ditulis)
      continue;
    }
    const c = cleanValue(f, raw);
    if (c.ok) data[f.key] = c.value;
    else errors[f.key] = c.error;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
}

// ---------- evolusi skema ----------

export interface SchemaChange {
  name?: unknown;
  description?: unknown;
  addFields?: unknown;
  renameFields?: unknown;
  archiveFields?: unknown;
  addOptions?: unknown;
  setPii?: unknown;
}

export interface SchemaDiff {
  name: string | null;
  description: string | null | undefined;
  added: CleanNewField[];
  renamed: Array<{ key: string; label: string }>;
  archived: string[];
  optionsAdded: Array<{ key: string; options: string[] }>;
  piiChanged: Array<{ key: string; from: PiiClass; to: PiiClass }>;
  /** Kolom yang tadinya tertutup dan kini bisa keluar lewat API (perlu peringatan). */
  exposesMore: string[];
}

export type ChangePlan = { ok: true; diff: SchemaDiff } | { ok: false; errors: string[] };

const asObj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const PII_RANK: Record<PiiClass, number> = { NONE: 0, PERSONAL: 1, SENSITIVE: 2 };

export function planSchemaChange(fields: readonly FieldDef[], change: SchemaChange, hasRecords: boolean): ChangePlan {
  const errors: Errs = [];
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const diff: SchemaDiff = { name: null, description: undefined, added: [], renamed: [], archived: [], optionsAdded: [], piiChanged: [], exposesMore: [] };

  if (change.name !== undefined) {
    const n = typeof change.name === "string" ? change.name.trim().replace(/\s+/g, " ") : "";
    if (!n || n.length > LIMITS.name) errors.push(`Nama tabel wajib diisi (maksimal ${LIMITS.name} karakter).`);
    else diff.name = n;
  }
  if (change.description !== undefined) {
    const d = typeof change.description === "string" && change.description.trim() ? change.description.trim() : null;
    if (d && d.length > LIMITS.description) errors.push(`Keterangan maksimal ${LIMITS.description} karakter.`);
    else diff.description = d;
  }

  for (const [key, label] of Object.entries(asObj(change.renameFields))) {
    const f = byKey.get(key);
    const l = typeof label === "string" ? label.trim().replace(/\s+/g, " ") : "";
    if (!f) errors.push(`Kolom "${key}" tidak ditemukan.`);
    else if (!l || l.length > LIMITS.name) errors.push(`Nama baru kolom "${f.label}" tidak valid.`);
    else if (l !== f.label) diff.renamed.push({ key, label: l });
  }

  const archive = Array.isArray(change.archiveFields) ? change.archiveFields : [];
  for (const key of archive) {
    const f = typeof key === "string" ? byKey.get(key) : undefined;
    if (!f) errors.push(`Kolom "${String(key)}" tidak ditemukan.`);
    else if (f.isArchived) errors.push(`Kolom "${f.label}" sudah diarsipkan.`);
    else diff.archived.push(f.key);
  }

  for (const [key, opts] of Object.entries(asObj(change.addOptions))) {
    const f = byKey.get(key);
    if (!f || f.type !== "select") {
      errors.push(`Kolom "${key}" bukan kolom pilihan.`);
      continue;
    }
    const existing = Array.isArray(f.options) ? (f.options as string[]) : [];
    const e2: Errs = [];
    const cleaned = (cleanOptions("select", [...existing, ...(Array.isArray(opts) ? opts : [])], e2, f.label) as string[]).filter((o) => !existing.includes(o));
    if (e2.length) errors.push(...e2);
    else if (cleaned.length) diff.optionsAdded.push({ key, options: cleaned });
  }

  for (const [key, cls] of Object.entries(asObj(change.setPii))) {
    const f = byKey.get(key);
    if (!f) errors.push(`Kolom "${key}" tidak ditemukan.`);
    else if (!isPiiClass(cls)) errors.push(`Kelas data kolom "${f.label}" tidak dikenal.`);
    else if (cls !== f.piiClass) {
      diff.piiChanged.push({ key, from: f.piiClass, to: cls });
      if (PII_RANK[cls] < PII_RANK[f.piiClass] && cls === "NONE") diff.exposesMore.push(key);
    }
  }

  const taken = new Set(fields.map((f) => f.key));
  const newRaw = Array.isArray(change.addFields) ? change.addFields : [];
  for (const raw of newRaw) {
    const c = cleanNewField(asObj(raw) as NewFieldInput, taken, errors);
    if (!c) continue;
    if (c.required && hasRecords) errors.push(`Kolom "${c.label}" tidak bisa wajib karena tabel sudah berisi data. Tambahkan sebagai kolom opsional.`);
    taken.add(c.key);
    diff.added.push(c);
  }
  const labelsNow = new Set(fields.filter((f) => !f.isArchived).map((f) => f.label.toLowerCase()));
  for (const c of diff.added) {
    if (labelsNow.has(c.label.toLowerCase())) errors.push(`Sudah ada kolom bernama "${c.label}".`);
    labelsNow.add(c.label.toLowerCase());
  }

  const activeAfter = fields.filter((f) => !f.isArchived && !diff.archived.includes(f.key)).length + diff.added.length;
  if (activeAfter < 1) errors.push("Tabel harus punya minimal satu kolom aktif.");
  if (activeAfter > LIMITS.activeFieldsPerTable) errors.push(`Maksimal ${LIMITS.activeFieldsPerTable} kolom aktif per tabel.`);
  if (fields.length + diff.added.length > LIMITS.totalFieldsPerTable) errors.push(`Terlalu banyak kolom (termasuk yang diarsipkan; maksimal ${LIMITS.totalFieldsPerTable}).`);

  return errors.length ? { ok: false, errors } : { ok: true, diff };
}

export const diffIsEmpty = (d: SchemaDiff): boolean =>
  d.name === null && d.description === undefined && !d.added.length && !d.renamed.length && !d.archived.length && !d.optionsAdded.length && !d.piiChanged.length;

// ---------- CSV ----------

/** Netralkan rumus spreadsheet: sel diawali = + - @ tab atau CR diberi tanda petik di depan. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : typeof v === "boolean" ? (v ? "Ya" : "Tidak") : String(v);
  if (typeof v !== "number" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(header: readonly string[], rows: ReadonlyArray<readonly unknown[]>): string {
  return `﻿${[header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n")}`;
}
