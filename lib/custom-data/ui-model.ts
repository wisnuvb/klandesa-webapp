/** Model isian layar Data Kustom (murni, aman di klien): templat, konversi ke payload API, dan kalimat ringkasan perubahan. */
import { FIELD_TYPE_LABEL, PII_LABEL, type FieldDef, type FieldType, type PiiClass, type SchemaDiff } from "./schema";

export interface FieldForm {
  /** id lokal untuk key React; bukan kunci kolom */
  uid: string;
  label: string;
  type: FieldType;
  required: boolean;
  piiClass: PiiClass;
  /** select: satu pilihan per baris */
  optionsText: string;
  min: string;
  max: string;
  unit: string;
}

let counter = 0;
export const newFieldForm = (o: Partial<FieldForm> = {}): FieldForm => ({
  uid: `f${++counter}`,
  label: "",
  type: "text",
  required: false,
  piiClass: "NONE",
  optionsText: "",
  min: "",
  max: "",
  unit: "",
  ...o,
});

export const parseOptionsText = (t: string): string[] => t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

/** Isian satu kolom → bentuk yang diterima API (`fields[]`/`addFields[]`). */
export function fieldPayload(f: FieldForm): Record<string, unknown> {
  const out: Record<string, unknown> = { label: f.label.trim(), type: f.type, required: f.required, piiClass: f.piiClass };
  if (f.type === "select") out.options = parseOptionsText(f.optionsText);
  if (f.type === "number") {
    const o: Record<string, unknown> = {};
    if (f.min.trim() !== "") o.min = Number(f.min);
    if (f.max.trim() !== "") o.max = Number(f.max);
    if (f.unit.trim()) o.unit = f.unit.trim();
    if (Object.keys(o).length) out.options = o;
  }
  return out;
}

export interface TemplateDef {
  id: string;
  name: string;
  description: string;
  linkResident: boolean;
  fields: Array<Partial<FieldForm> & Pick<FieldForm, "label" | "type">>;
}

/** Contoh awal supaya operator tidak mulai dari halaman kosong. Semua kolom pribadi sudah ditandai. */
export const TEMPLATES: readonly TemplateDef[] = [
  {
    id: "bantuan",
    name: "Penerima bantuan",
    description: "Catat siapa menerima bantuan apa dan kapan.",
    linkResident: true,
    fields: [
      { label: "Jenis bantuan", type: "select", required: true, optionsText: "Beras\nUang tunai\nSembako\nLainnya" },
      { label: "Tanggal diterima", type: "date", required: true },
      { label: "Jumlah", type: "number", min: "0" },
      { label: "Catatan", type: "longtext", piiClass: "PERSONAL" },
    ],
  },
  {
    id: "lansia",
    name: "Data lansia",
    description: "Pendataan lansia untuk kunjungan dan layanan.",
    linkResident: true,
    fields: [
      { label: "Kondisi kesehatan", type: "longtext", piiClass: "SENSITIVE" },
      { label: "Tinggal sendiri", type: "boolean" },
      { label: "Kunjungan terakhir", type: "date" },
    ],
  },
  {
    id: "inventaris",
    name: "Inventaris posyandu",
    description: "Daftar barang dan jumlahnya.",
    linkResident: false,
    fields: [
      { label: "Nama barang", type: "text", required: true },
      { label: "Jumlah", type: "number", required: true, min: "0" },
      { label: "Kondisi", type: "select", optionsText: "Baik\nPerlu perbaikan\nRusak" },
    ],
  },
];

export const templateFields = (t: TemplateDef): FieldForm[] => t.fields.map((f) => newFieldForm(f));

const q = (s: string) => `"${s}"`;
const typeName = (t: string) => (FIELD_TYPE_LABEL as Record<string, string>)[t] ?? t;

/** Ringkasan perubahan skema dalam kalimat awam, untuk pratinjau sebelum diterapkan. */
export function describeDiff(diff: SchemaDiff, fields: readonly FieldDef[]): string[] {
  const label = (key: string) => fields.find((f) => f.key === key)?.label ?? key;
  const lines: string[] = [];
  if (diff.name !== null) lines.push(`Nama tabel menjadi ${q(diff.name)}.`);
  if (diff.description !== undefined) lines.push(diff.description ? "Keterangan tabel diubah." : "Keterangan tabel dikosongkan.");
  for (const f of diff.added) lines.push(`Kolom baru ${q(f.label)} (${typeName(f.type).toLowerCase()}${f.required ? ", wajib" : ""}, ${PII_LABEL[f.piiClass].label.toLowerCase()}).`);
  for (const r of diff.renamed) lines.push(`Kolom ${q(label(r.key))} diganti namanya menjadi ${q(r.label)}.`);
  for (const o of diff.optionsAdded) lines.push(`Pilihan ditambah pada ${q(label(o.key))}: ${o.options.join(", ")}.`);
  for (const p of diff.piiChanged) lines.push(`Kolom ${q(label(p.key))}: ${PII_LABEL[p.from].label.toLowerCase()} → ${PII_LABEL[p.to].label.toLowerCase()}.`);
  for (const key of diff.archived) lines.push(`Kolom ${q(label(key))} diarsipkan: disembunyikan, tetapi isinya tidak dihapus.`);
  return lines;
}

/** Peringatan yang harus dibaca sebelum menerapkan. */
export function diffWarnings(diff: SchemaDiff, fields: readonly FieldDef[]): string[] {
  const label = (key: string) => fields.find((f) => f.key === key)?.label ?? key;
  const w: string[] = [];
  for (const key of diff.exposesMore) w.push(`Kolom ${q(label(key))} akan bisa dibaca aplikasi lain lewat API. Pastikan isinya bukan data pribadi.`);
  return w;
}

/** Ringkasan struktur tabel baru untuk langkah pratinjau. */
export function summarizeNewTable(fields: readonly Pick<FieldForm, "label" | "piiClass">[]) {
  const closed = fields.filter((f) => f.piiClass !== "NONE");
  const open = fields.filter((f) => f.piiClass === "NONE");
  return { total: fields.length, closed: closed.map((f) => f.label.trim()), open: open.map((f) => f.label.trim()) };
}

const DAY = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Nilai sel untuk tampilan tabel: Ya/Tidak, tanggal Indonesia, angka dengan satuan; kosong → "". */
export function formatCell(value: unknown, field: Pick<FieldDef, "type" | "options">): string {
  if (value === undefined || value === null || value === "") return "";
  switch (field.type) {
    case "boolean":
      return value === true ? "Ya" : value === false ? "Tidak" : "";
    case "date": {
      const d = new Date(`${String(value)}T00:00:00.000Z`);
      return Number.isNaN(d.getTime()) ? String(value) : DAY.format(d);
    }
    case "number": {
      const unit = field.options && typeof field.options === "object" && !Array.isArray(field.options) ? (field.options as { unit?: string }).unit : undefined;
      return `${Number(value).toLocaleString("id-ID")}${unit ? ` ${unit}` : ""}`;
    }
    default:
      return String(value);
  }
}
