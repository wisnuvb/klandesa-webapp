/**
 * Manifes "Aplikasi Desa" (murni, tanpa DB): paket tabel kustom + widget dasbor, sebagai DATA saja.
 * Tidak ada kode, URL, HTML, atau skrip; hanya tipe yang sudah dikenal Data Kustom. Itulah yang membuatnya aman dibagikan
 * antar desa: yang bisa dilakukan sebuah manifes hanyalah membuat tabel dan menampilkan angka dari tabel itu sendiri.
 * Setiap kolom WAJIB menyebut kelas datanya secara eksplisit (tidak ada bawaan "bukan pribadi").
 */
import { createHash } from "node:crypto";
import { FIELD_TYPES, PII_CLASSES, validateTableInput, type FieldType, type PiiClass } from "@/lib/custom-data/schema";

export const MANIFEST_VERSION = 1 as const;
export const MANIFEST_LIMITS = { tables: 5, widgets: 8, columnsPerRecent: 4, recentRows: 10, title: 60, bytes: 64 * 1024, refLength: 30 } as const;

export interface ManifestField {
  label: string;
  type: FieldType;
  required: boolean;
  options: unknown;
  piiClass: PiiClass;
}
export interface ManifestTable {
  ref: string;
  name: string;
  description: string | null;
  linkResident: boolean;
  fields: ManifestField[];
}
export type Widget =
  | { type: "count"; title: string; table: string }
  | { type: "recent"; title: string; table: string; columns: string[]; limit: number }
  | { type: "breakdown"; title: string; table: string; field: string }
  | { type: "sum"; title: string; table: string; field: string };
export interface AppManifest {
  schemaVersion: typeof MANIFEST_VERSION;
  tables: ManifestTable[];
  dashboard: Widget[];
}

export type ManifestResult = { ok: true; manifest: AppManifest } | { ok: false; errors: string[] };

const REF = /^[a-z][a-z0-9_]{0,29}$/;
const isRec = (v: unknown): v is Record<string, unknown> => v != null && typeof v === "object" && !Array.isArray(v);

/** Kunci di luar daftar ditolak (termasuk "__proto__"); mencegah data terselip yang tak diperiksa. */
function unknownKeys(obj: Record<string, unknown>, allowed: readonly string[], where: string, errors: string[]): void {
  for (const k of Object.keys(obj)) if (!allowed.includes(k)) errors.push(`${where}: isian "${k.slice(0, 40)}" tidak dikenal.`);
}

const titleOf = (v: unknown, where: string, errors: string[]): string => {
  const t = typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
  if (!t || t.length > MANIFEST_LIMITS.title) errors.push(`${where}: judul wajib diisi (maksimal ${MANIFEST_LIMITS.title} huruf).`);
  return t;
};

export function validateManifest(input: unknown): ManifestResult {
  const errors: string[] = [];
  if (!isRec(input)) return { ok: false, errors: ["Manifes harus berupa objek."] };
  let size = 0;
  try {
    size = Buffer.byteLength(JSON.stringify(input));
  } catch {
    return { ok: false, errors: ["Manifes tidak valid."] };
  }
  if (size > MANIFEST_LIMITS.bytes) return { ok: false, errors: ["Manifes terlalu besar."] };
  unknownKeys(input, ["schemaVersion", "tables", "dashboard"], "Manifes", errors);
  if (input.schemaVersion !== MANIFEST_VERSION) errors.push(`schemaVersion harus ${MANIFEST_VERSION}.`);

  const rawTables = Array.isArray(input.tables) ? input.tables : [];
  if (rawTables.length < 1 || rawTables.length > MANIFEST_LIMITS.tables) errors.push(`Manifes harus punya 1–${MANIFEST_LIMITS.tables} tabel.`);

  const tables: ManifestTable[] = [];
  const refs = new Set<string>();
  for (const [i, raw] of rawTables.slice(0, MANIFEST_LIMITS.tables).entries()) {
    const where = `Tabel ${i + 1}`;
    if (!isRec(raw)) {
      errors.push(`${where}: bentuk tidak valid.`);
      continue;
    }
    unknownKeys(raw, ["ref", "name", "description", "linkResident", "fields"], where, errors);
    const ref = typeof raw.ref === "string" ? raw.ref : "";
    if (!REF.test(ref)) errors.push(`${where}: ref harus huruf kecil/angka/garis bawah, diawali huruf (maks ${MANIFEST_LIMITS.refLength}).`);
    else if (refs.has(ref)) errors.push(`${where}: ref "${ref}" dipakai dua kali.`);
    refs.add(ref);

    const fieldsRaw = Array.isArray(raw.fields) ? raw.fields : [];
    for (const f of fieldsRaw) {
      if (!isRec(f)) continue; // dilaporkan oleh validateTableInput
      unknownKeys(f, ["label", "type", "required", "options", "piiClass"], `${where}, kolom "${String(f.label ?? "").slice(0, 30)}"`, errors);
      if (typeof f.piiClass !== "string" || !(PII_CLASSES as readonly string[]).includes(f.piiClass)) errors.push(`${where}, kolom "${String(f.label ?? "").slice(0, 30)}": kelas data (piiClass) wajib dinyatakan.`);
    }
    const v = validateTableInput({ name: raw.name, description: raw.description, linkResident: raw.linkResident, fields: fieldsRaw });
    if (!v.ok) {
      errors.push(...v.errors.map((e) => `${where}: ${e}`));
      continue;
    }
    tables.push({
      ref,
      name: v.value.name,
      description: v.value.description,
      linkResident: v.value.linkResident,
      fields: v.value.fields.map((f) => ({ label: f.label, type: f.type, required: f.required, options: f.options ?? null, piiClass: f.piiClass })),
    });
  }

  const rawWidgets = input.dashboard === undefined ? [] : Array.isArray(input.dashboard) ? input.dashboard : null;
  if (rawWidgets === null) errors.push("dashboard harus berupa daftar.");
  const dashboard: Widget[] = [];
  if (rawWidgets && rawWidgets.length > MANIFEST_LIMITS.widgets) errors.push(`Dasbor maksimal ${MANIFEST_LIMITS.widgets} widget.`);
  const byRef = new Map(tables.map((t) => [t.ref, t]));
  for (const [i, raw] of (rawWidgets ?? []).slice(0, MANIFEST_LIMITS.widgets).entries()) {
    const where = `Widget ${i + 1}`;
    if (!isRec(raw)) {
      errors.push(`${where}: bentuk tidak valid.`);
      continue;
    }
    const type = raw.type;
    const table = typeof raw.table === "string" ? byRef.get(raw.table) : undefined;
    if (!table) {
      errors.push(`${where}: tabel "${String(raw.table).slice(0, 30)}" tidak ada di manifes.`);
      continue;
    }
    const fieldByLabel = (label: unknown) => (typeof label === "string" ? table.fields.find((f) => f.label === label) : undefined);
    const title = titleOf(raw.title, where, errors);
    if (type === "count") {
      unknownKeys(raw, ["type", "title", "table"], where, errors);
      dashboard.push({ type, title, table: table.ref });
    } else if (type === "recent") {
      unknownKeys(raw, ["type", "title", "table", "columns", "limit"], where, errors);
      const cols = Array.isArray(raw.columns) ? raw.columns : [];
      const labels = cols.filter((c): c is string => typeof c === "string" && fieldByLabel(c) != null);
      if (cols.length < 1 || cols.length > MANIFEST_LIMITS.columnsPerRecent || labels.length !== cols.length || new Set(labels).size !== labels.length) {
        errors.push(`${where}: pilih 1–${MANIFEST_LIMITS.columnsPerRecent} kolom berbeda yang ada di tabel.`);
        continue;
      }
      const limit = raw.limit === undefined ? 5 : Number(raw.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > MANIFEST_LIMITS.recentRows) {
        errors.push(`${where}: limit harus 1–${MANIFEST_LIMITS.recentRows}.`);
        continue;
      }
      dashboard.push({ type, title, table: table.ref, columns: labels, limit });
    } else if (type === "breakdown" || type === "sum") {
      unknownKeys(raw, ["type", "title", "table", "field"], where, errors);
      const f = fieldByLabel(raw.field);
      const okType = type === "breakdown" ? f?.type === "select" || f?.type === "boolean" : f?.type === "number";
      if (!f || !okType) {
        errors.push(`${where}: kolom "${String(raw.field).slice(0, 30)}" harus ada dan berjenis ${type === "breakdown" ? "pilihan atau Ya/Tidak" : "angka"}.`);
        continue;
      }
      dashboard.push({ type, title, table: table.ref, field: f.label });
    } else {
      errors.push(`${where}: jenis widget tidak dikenal.`);
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true, manifest: { schemaVersion: MANIFEST_VERSION, tables, dashboard } };
}

export const manifestHash = (m: AppManifest): string => createHash("sha256").update(JSON.stringify(m)).digest("hex");

const PII_WORDS = /\b(nik|ktp|kk|telepon|telp|tlp|hp|handphone|ponsel|whatsapp|wa|alamat|domisili|email|rekening|penghasilan|gaji|kesehatan|penyakit|disabilitas|agama|foto|lahir|nama|password)\b/;
const PII_PHRASES = /(e mail|induk kependudukan|tempat tinggal|ibu kandung|kata sandi|no induk)/;

/** Normalkan label untuk dicocokkan: tanpa aksen/huruf besar/tanda baca, dan "N I K" → "nik". */
function normalizeLabel(label: string): string {
  const folded = label.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return folded.replace(/\b(?:[a-z0-9] )+[a-z0-9]\b/g, (m) => m.replace(/ /g, ""));
}
const looksPersonal = (label: string) => {
  const n = normalizeLabel(label);
  return PII_WORDS.test(n) || PII_PHRASES.test(n);
};

/** Peringatan otomatis untuk peninjau manusia dan pemasang. Tidak menolak; hanya menandai yang janggal. */
export function reviewManifest(m: AppManifest): string[] {
  const out: string[] = [];
  for (const t of m.tables) {
    for (const f of t.fields) {
      if (f.piiClass === "NONE" && looksPersonal(f.label)) out.push(`Tabel "${t.name}": kolom "${f.label}" tampak berisi data pribadi tetapi ditandai bukan pribadi.`);
      else if (f.piiClass === "NONE" && f.type === "longtext") out.push(`Tabel "${t.name}": kolom teks panjang "${f.label}" ditandai bukan pribadi; teks bebas sering memuat data pribadi.`);
      else if (f.piiClass === "NONE" && t.linkResident && f.type === "text") out.push(`Tabel "${t.name}" terhubung ke data warga: kolom teks "${f.label}" ditandai bukan pribadi, pastikan tidak berisi identitas.`);
    }
    if (t.linkResident) out.push(`Tabel "${t.name}" terhubung ke data warga.`);
  }
  return out;
}

export interface ManifestSummary {
  tables: { name: string; fields: number; personal: number; sensitive: number; linkResident: boolean }[];
  widgets: number;
}
export function summarizeManifest(m: AppManifest): ManifestSummary {
  return {
    tables: m.tables.map((t) => ({
      name: t.name,
      fields: t.fields.length,
      personal: t.fields.filter((f) => f.piiClass === "PERSONAL").length,
      sensitive: t.fields.filter((f) => f.piiClass === "SENSITIVE").length,
      linkResident: t.linkResident,
    })),
    widgets: m.dashboard.length,
  };
}

export { FIELD_TYPES };
