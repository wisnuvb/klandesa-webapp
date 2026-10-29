/**
 * Validasi & perakitan input pembuatan surat v2 — murni (tanpa DB) supaya bisa diuji.
 * Klien hanya mengirim pilihan (id warga) dan isian; nilai orang dibaca ulang dari database
 * oleh server, jadi klien tidak bisa memalsukan data kependudukan yang tidak ia timpa sendiri.
 */
import { formatTanggalId } from "../format";
import {
  PERSON_FIELDS,
  isPersonField,
  residentToPerson,
  type PersonFieldKey,
  type ResidentLike,
} from "../registry";
import type { CustomField, Group, LetterDocument } from "../document/schema";
import type { FormSpec } from "../document/form-spec";
import {
  buildSuratValues,
  emptyLetterValues,
  personRowFromPerson,
  type LetterValues,
  type OfficialValues,
  type PersonValues,
} from "../values";
import type { OfficialId } from "../registry";

export const INPUT_LIMITS = {
  requestBytes: 300_000,
  text: 255,
  longtext: 2_000,
  personValue: 500,
  personLongValue: 1_000,
  numberDigits: 15,
} as const;

export type Strictness = "draft" | "completed";
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;
const LONG_PERSON_KEYS = new Set<string>(["alamat", "alamat_lengkap"]);
const DATE_PERSON_KEYS = new Set<string>(["tanggal_lahir", "tanggal_meninggal"]);

const clean = (s: string) => s.replace(CONTROL, "").trim();
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export function isRealIsoDate(s: string): boolean {
  if (!DATE_ISO.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Normalisasi satu nilai isian sesuai jenisnya. Kosong selalu sah di sini; "wajib" dicek terpisah. */
export function normalizeFieldValue(field: Pick<CustomField, "label" | "type" | "options">, raw: unknown): Result<string> {
  if (raw == null || raw === "") return { ok: true, value: "" };
  if (typeof raw !== "string" && typeof raw !== "number") return { ok: false, error: `Isian "${field.label}" tidak valid` };
  const text = clean(String(raw));
  if (text === "") return { ok: true, value: "" };
  const bad = (msg: string): Result<string> => ({ ok: false, error: `${field.label}: ${msg}` });
  switch (field.type) {
    case "text":
      return text.length > INPUT_LIMITS.text ? bad(`maksimal ${INPUT_LIMITS.text} karakter`) : { ok: true, value: text };
    case "longtext":
      return text.length > INPUT_LIMITS.longtext ? bad(`maksimal ${INPUT_LIMITS.longtext} karakter`) : { ok: true, value: text };
    case "number": {
      const t = text.replace(/\s/g, "");
      return /^\d{1,15}([.,]\d{1,4})?$/.test(t) ? { ok: true, value: t } : bad("harus berupa angka");
    }
    case "money": {
      const digits = text.replace(/^rp\.?/i, "").replace(/[.\s]/g, "").replace(/,\d{1,2}$/, "").replace(/,-$/, "");
      return /^\d{1,15}$/.test(digits) ? { ok: true, value: digits } : bad("harus berupa nominal rupiah");
    }
    case "date":
      return isRealIsoDate(text) ? { ok: true, value: text } : bad("tanggal tidak valid (gunakan tahun-bulan-hari)");
    case "choice":
      return field.options?.includes(text) ? { ok: true, value: text } : bad("pilihan tidak tersedia");
  }
}

export type PersonInput = { residentId?: number; manual: boolean; overrides: PersonValues };
export type GroupRowInput = { residentId?: number; values: Record<string, string> };
export type LetterInput = {
  letterDate: Date | null;
  number: string | null;
  people: Record<string, PersonInput>;
  fields: Record<string, string>;
  groups: Record<string, GroupRowInput[]>;
};

function parsePersonValues(raw: unknown, where: string): Result<PersonValues> {
  if (raw == null) return { ok: true, value: {} };
  if (!isObj(raw)) return { ok: false, error: `${where}: format tidak valid` };
  const out: PersonValues = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!isPersonField(k)) return { ok: false, error: `${where}: isian "${k.slice(0, 30)}" tidak dikenal` };
    if (typeof v !== "string" && typeof v !== "number") return { ok: false, error: `${where}: isian ${k} harus teks` };
    const val = clean(String(v));
    const max = LONG_PERSON_KEYS.has(k) ? INPUT_LIMITS.personLongValue : INPUT_LIMITS.personValue;
    if (val.length > max) return { ok: false, error: `${where}: isian ${k} terlalu panjang` };
    if (DATE_PERSON_KEYS.has(k) && val !== "" && !isRealIsoDate(val)) return { ok: false, error: `${where}: tanggal ${k} tidak valid` };
    out[k] = val;
  }
  return { ok: true, value: out };
}

const positiveInt = (v: unknown): number | null => (Number.isInteger(v) && (v as number) > 0 ? (v as number) : null);

/** Validasi body mentah terhadap spesifikasi form dokumen. `draft` longgar, `completed` ketat. */
export function parseLetterInput(
  body: Record<string, unknown>,
  doc: LetterDocument,
  spec: FormSpec,
  strictness: Strictness,
): Result<LetterInput> {
  const strict = strictness === "completed";

  // ---- orang
  const people: Record<string, PersonInput> = {};
  const peopleRaw = body.people == null ? {} : body.people;
  if (!isObj(peopleRaw)) return { ok: false, error: "people harus berupa objek" };
  for (const role of Object.keys(peopleRaw)) {
    if (!spec.people.some((p) => p.id === role)) return { ok: false, error: `Orang "${role.slice(0, 30)}" tidak ada pada surat ini` };
  }
  for (const role of spec.people) {
    const entry = peopleRaw[role.id];
    if (entry == null) {
      if (strict && role.required) return { ok: false, error: `${role.label} wajib diisi` };
      continue;
    }
    if (!isObj(entry)) return { ok: false, error: `${role.label}: format tidak valid` };
    const residentId = entry.residentId == null ? null : positiveInt(entry.residentId);
    if (entry.residentId != null && residentId == null) return { ok: false, error: `${role.label}: id warga tidak valid` };
    const hasManual = entry.manual != null;
    if (hasManual && !role.allowManual) return { ok: false, error: `${role.label} harus dipilih dari data warga` };
    if (residentId != null && hasManual) return { ok: false, error: `${role.label}: pilih warga ATAU isi manual, bukan keduanya` };
    const src = parsePersonValues(hasManual ? entry.manual : entry.overrides, role.label);
    if (!src.ok) return src;
    if (residentId == null) {
      if (!hasManual) {
        if (strict && role.required) return { ok: false, error: `${role.label} wajib diisi` };
        continue;
      }
      if (strict && !src.value.nama) return { ok: false, error: `${role.label}: nama wajib diisi` };
    }
    people[role.id] = { residentId: residentId ?? undefined, manual: residentId == null, overrides: src.value };
  }

  // ---- isian tambahan
  const fields: Record<string, string> = {};
  const fieldsRaw = body.fields == null ? {} : body.fields;
  if (!isObj(fieldsRaw)) return { ok: false, error: "fields harus berupa objek" };
  const fieldDefs = new Map(spec.fields.map((f) => [f.id, f]));
  for (const key of Object.keys(fieldsRaw)) {
    if (!fieldDefs.has(key)) return { ok: false, error: `Isian "${key.slice(0, 30)}" tidak ada pada surat ini` };
  }
  for (const def of spec.fields) {
    const n = normalizeFieldValue(def, fieldsRaw[def.id]);
    if (!n.ok) return n;
    if (strict && def.required && n.value === "") return { ok: false, error: `${def.label} wajib diisi` };
    fields[def.id] = n.value;
  }

  // ---- grup berulang
  const groups: Record<string, GroupRowInput[]> = {};
  const groupsRaw = body.groups == null ? {} : body.groups;
  if (!isObj(groupsRaw)) return { ok: false, error: "groups harus berupa objek" };
  const groupDefs = new Map<string, Group>(spec.groups.map((g) => [g.id, g]));
  for (const key of Object.keys(groupsRaw)) {
    if (!groupDefs.has(key)) return { ok: false, error: `Daftar "${key.slice(0, 30)}" tidak ada pada surat ini` };
  }
  for (const g of spec.groups) {
    const rowsRaw = groupsRaw[g.id] == null ? [] : groupsRaw[g.id];
    if (!Array.isArray(rowsRaw)) return { ok: false, error: `${g.label} harus berupa daftar` };
    if (rowsRaw.length > g.max) return { ok: false, error: `${g.label} maksimal ${g.max} baris` };
    if (strict && rowsRaw.length < g.min) return { ok: false, error: `${g.label} minimal ${g.min} baris` };
    const rows: GroupRowInput[] = [];
    for (const [i, rowRaw] of rowsRaw.entries()) {
      const label = `${g.label} baris ${i + 1}`;
      if (!isObj(rowRaw)) return { ok: false, error: `${label}: format tidak valid` };
      const rid = rowRaw.residentId == null ? null : positiveInt(rowRaw.residentId);
      if (rowRaw.residentId != null && rid == null) return { ok: false, error: `${label}: id warga tidak valid` };
      if (rid != null && !g.personRows) return { ok: false, error: `${label}: daftar ini tidak mengambil data warga` };
      const valuesRaw = rowRaw.values == null ? {} : rowRaw.values;
      if (!isObj(valuesRaw)) return { ok: false, error: `${label}: format tidak valid` };
      const ids = new Set(g.fields.map((f) => f.id));
      for (const k of Object.keys(valuesRaw)) if (!ids.has(k)) return { ok: false, error: `${label}: isian "${k.slice(0, 30)}" tidak dikenal` };
      // Hanya isian yang dikirim yang dicatat: tidak dikirim = pakai data warga; "" = sengaja dikosongkan.
      const values: Record<string, string> = {};
      for (const f of g.fields) {
        if (!Object.prototype.hasOwnProperty.call(valuesRaw, f.id)) continue;
        const n = normalizeFieldValue(f, valuesRaw[f.id]);
        if (!n.ok) return { ok: false, error: `${label} — ${n.error}` };
        values[f.id] = n.value;
      }
      rows.push({ residentId: rid ?? undefined, values });
    }
    groups[g.id] = rows;
  }

  // ---- tanggal & nomor
  let letterDate: Date | null = null;
  if (body.letterDate != null && body.letterDate !== "") {
    if (typeof body.letterDate !== "string" || !isRealIsoDate(body.letterDate.slice(0, 10))) {
      return { ok: false, error: "Tanggal surat tidak valid" };
    }
    const [y, m, d] = body.letterDate.slice(0, 10).split("-").map(Number);
    letterDate = new Date(y, m - 1, d, 12, 0, 0);
  }
  let number: string | null = null;
  if (body.number != null && body.number !== "") {
    if (typeof body.number !== "string") return { ok: false, error: "Nomor surat tidak valid" };
    number = clean(body.number);
    if (number.length === 0 || number.length > 255) return { ok: false, error: "Nomor surat tidak valid" };
  }
  return { ok: true, value: { letterDate, number, people, fields, groups } };
}

/** Lengkapi isian turunan untuk orang yang diisi manual (ttl, umur, alamat lengkap). */
export function completeManualPerson(p: PersonValues, today: Date): PersonValues {
  const out: PersonValues = { ...p };
  const tgl = out.tanggal_lahir ?? "";
  if (!out.ttl && (out.tempat_lahir || tgl)) {
    out.ttl = [out.tempat_lahir, tgl ? (formatTanggalId(tgl) ?? tgl) : ""].filter(Boolean).join(", ");
  }
  if (!out.umur && tgl && isRealIsoDate(tgl)) {
    const [y, m, d] = tgl.split("-").map(Number);
    let age = today.getFullYear() - y;
    if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1;
    out.umur = String(Math.max(age, 0));
  }
  if (!out.alamat_lengkap && out.alamat) out.alamat_lengkap = out.alamat;
  return out;
}

export type LetterContext = {
  desa: Record<string, string>;
  pejabat: Record<OfficialId, OfficialValues>;
  logoUrl?: string;
};

/** Gabungkan input tervalidasi + data warga dari DB + konteks desa menjadi nilai surat lengkap. */
export function assembleValues(args: {
  input: LetterInput;
  residents: ReadonlyMap<number, ResidentLike>;
  doc: LetterDocument;
  context: LetterContext;
  date: Date;
  nomor: string;
  today?: Date;
}): Result<LetterValues> {
  const { input, residents, doc, context, date, nomor } = args;
  const today = args.today ?? new Date();
  const v = emptyLetterValues();

  for (const [role, p] of Object.entries(input.people)) {
    if (p.manual) {
      v.people[role] = completeManualPerson(p.overrides, today);
      continue;
    }
    const row = residents.get(p.residentId!);
    if (!row) return { ok: false, error: `Data warga untuk "${role}" tidak ditemukan` };
    v.people[role] = { ...residentToPerson(row, today), ...p.overrides };
  }
  v.fields = { ...input.fields };
  for (const g of doc.groups) {
    const ids = g.fields.map((f) => f.id);
    v.groups[g.id] = (input.groups[g.id] ?? []).map((r) => {
      let base: Record<string, string> = {};
      if (r.residentId != null) {
        const row = residents.get(r.residentId);
        if (!row) return null;
        base = personRowFromPerson(ids, residentToPerson(row, today));
      }
      const merged: Record<string, string> = { ...base };
      for (const id of ids) if (Object.prototype.hasOwnProperty.call(r.values, id)) merged[id] = r.values[id];
      for (const id of ids) merged[id] ??= "";
      return merged;
    }).filter((r): r is Record<string, string> => r !== null);
    if ((input.groups[g.id] ?? []).length !== v.groups[g.id].length) {
      return { ok: false, error: `Data warga pada daftar "${g.label}" tidak ditemukan` };
    }
  }
  v.desa = { ...context.desa };
  v.pejabat = context.pejabat;
  v.logoUrl = context.logoUrl;
  v.surat = buildSuratValues({ date, nomor, tempat: context.desa.nama ?? "" });
  return { ok: true, value: v };
}

export const PERSON_FIELD_KEYS: readonly PersonFieldKey[] = PERSON_FIELDS.map((f) => f.key);
