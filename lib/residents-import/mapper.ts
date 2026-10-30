/**
 * Pemeta kolom: menebak field tujuan tiap kolom sumber dari header (sinonim + fuzzy) dan isi kolom.
 * Murni dan deterministik — tidak ada panggilan jaringan, tidak ada data warga yang keluar.
 */
import {
  EDUCATION_IGNORE,
  FIELDS,
  FIELD_BY_ID,
  IGNORED_HEADERS,
  type FieldId,
} from "./fields";
import { parseLongNumber, parseDateLoose, parseNikInfo } from "./nik-date";
import { dice, normalizeHeader } from "./text";
import {
  resolveBlood,
  resolveEducation,
  resolveFamilyRole,
  resolveGender,
  resolveJob,
  resolveMarital,
  resolveNationality,
  resolveReligion,
} from "./vocab";

export type Cell = string | number | boolean | null;

export interface ColumnInfo {
  index: number;
  header: string;
  /** Contoh isi tidak kosong (hingga ±300 nilai) untuk profil isi kolom. */
  samples: Cell[];
}

export type MappingReason = "header" | "content" | "saved" | "manual" | "ignored" | "none";

export interface ColumnGuess {
  index: number;
  header: string;
  field: FieldId | null;
  confidence: number;
  reason: MappingReason;
  /** Kandidat lain (urut skor) untuk dropdown/saran. */
  alternatives: Array<{ field: FieldId; confidence: number }>;
}

const ABBR: Record<string, string> = {
  tgl: "tanggal",
  tmp: "tempat",
  tmpt: "tempat",
  hub: "hubungan",
  gol: "golongan",
  dlm: "dalam",
  dgn: "dengan",
  sdg: "sedang",
  no: "nomor",
  nmr: "nomor",
  telp: "telepon",
  tlp: "telepon",
  jns: "jenis",
  almt: "alamat",
  tdk: "tidak",
  dsn: "dusun",
  pend: "pendidikan",
  pekerjan: "pekerjaan",
  pkrjn: "pekerjaan",
  kwn: "kewarganegaraan",
  ortu: "orang tua",
  nm: "nama",
};

/** Normalisasi header + perluas singkatan umum ("Hub. Kel" → "hubungan kel"). */
export function canonicalHeader(input: unknown): string {
  return normalizeHeader(input)
    .split(" ")
    .map((t) => ABBR[t] ?? t)
    .join(" ")
    .trim();
}

interface CompiledField {
  id: FieldId;
  syns: string[];
}

const COMPILED: CompiledField[] = FIELDS.map((f) => ({
  id: f.id,
  syns: [...new Set(f.synonyms.map((s) => canonicalHeader(s)).concat(canonicalHeader(f.label)))],
}));

const IGNORED = new Set(IGNORED_HEADERS.map((s) => canonicalHeader(s)));

function synonymScore(h: string, s: string): number {
  if (h === s) return 1;
  const hs = h.split(" ");
  const ss = s.split(" ");
  if (h.replace(/ /g, "") === s.replace(/ /g, "")) return 0.97;
  const hSet = new Set(hs);
  if (ss.every((t) => hSet.has(t))) {
    const coverage = ss.length / hs.length;
    return 0.72 + 0.2 * coverage;
  }
  if (s.length >= 5 && h.length >= 5) {
    const d = dice(h, s);
    if (d >= 0.82) return d * 0.9;
  }
  return 0;
}

/** Skor header (0..1) untuk satu field. */
export function headerScore(header: unknown, fieldId: FieldId): number {
  const h = canonicalHeader(header);
  if (!h) return 0;
  const cf = COMPILED.find((c) => c.id === fieldId);
  if (!cf) return 0;
  let best = 0;
  for (const s of cf.syns) best = Math.max(best, synonymScore(h, s));
  return best;
}

/** Skor header terbaik di antara semua field — dipakai mendeteksi baris header. */
export function bestHeaderScore(header: unknown): number {
  const h = canonicalHeader(header);
  if (!h || h.length > 60) return 0;
  let best = 0;
  for (const cf of COMPILED) for (const s of cf.syns) best = Math.max(best, synonymScore(h, s));
  return best;
}

export function isIgnoredHeader(header: unknown): boolean {
  const h = canonicalHeader(header);
  if (!h) return false;
  if (IGNORED.has(h)) return true;
  // "Pendidikan (sedang ditempuh)" bukan pendidikan terakhir
  return EDUCATION_IGNORE.test(h) && /pendidikan|pend/.test(h);
}

// ───────────────────────────── profil isi kolom ─────────────────────────────

function ratio<T>(items: T[], pred: (v: T) => boolean): number {
  if (!items.length) return 0;
  let n = 0;
  for (const it of items) if (pred(it)) n++;
  return n / items.length;
}

function vocabRatio(samples: Cell[], resolve: (v: unknown) => { how: string } | null): number {
  return ratio(samples, (v) => {
    const r = resolve(v);
    return !!r && (r.how === "exact" || r.how === "alias");
  });
}

export function contentScores(samples: Cell[]): Partial<Record<FieldId, number>> {
  const out: Partial<Record<FieldId, number>> = {};
  const vals = samples.filter((v) => v !== null && String(v).trim() !== "");
  if (vals.length === 0) return out;

  const longNums = vals.map((v) => parseLongNumber(v).nik);
  const r16 = ratio(longNums, (d) => d.length === 16);
  if (r16 >= 0.7) {
    const only16 = longNums.filter((d) => d.length === 16);
    const unique = new Set(only16).size / only16.length;
    const dateOk = ratio(only16, (d) => parseNikInfo(d).birthDate !== null);
    out.id_number = r16 * (unique > 0.9 ? 0.92 : 0.4) * (dateOk >= 0.7 ? 1 : 0.6);
    out.family_card_number = r16 * (unique <= 0.9 ? 0.92 : 0.4);
  }

  const gender = vocabRatio(vals, resolveGender);
  if (gender >= 0.9) out.gender = 0.92;

  const dates = ratio(vals, (v) => {
    const iso = parseDateLoose(v);
    if (!iso) return false;
    const y = Number(iso.slice(0, 4));
    return y >= 1900 && y <= new Date().getFullYear();
  });
  if (dates >= 0.8) out.date_of_birth = 0.8;

  const religion = vocabRatio(vals, resolveReligion);
  if (religion >= 0.85) out.religion_id = 0.88;
  const marital = vocabRatio(vals, resolveMarital);
  if (marital >= 0.85) out.marital_status = 0.82;
  const role = vocabRatio(vals, resolveFamilyRole);
  if (role >= 0.85) out.status_family_id = 0.82;
  const edu = vocabRatio(vals, resolveEducation);
  if (edu >= 0.85) out.education_id = 0.75;
  const job = vocabRatio(vals, resolveJob);
  if (job >= 0.85) out.job_id = 0.72;
  const blood = vocabRatio(vals, resolveBlood);
  if (blood >= 0.9 && vals.every((v) => String(v).trim().length <= 3)) out.blood_type_id = 0.7;
  const nat = ratio(vals, (v) => resolveNationality(v) !== null);
  if (nat >= 0.9) out.nationality = 0.9;

  const phone = ratio(vals, (v) => /^(\+?62|0)?8\d{7,12}$/.test(String(v).replace(/[\s-]/g, "")));
  if (phone >= 0.8) out.phone_number = 0.75;
  const email = ratio(vals, (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()));
  if (email >= 0.8) out.email = 0.9;

  return out;
}

/** Field yang punya profil isi (agar header yang bertabrakan dengan isi bisa diturunkan skornya). */
const PROFILED = new Set<FieldId>([
  "id_number",
  "family_card_number",
  "gender",
  "date_of_birth",
  "religion_id",
  "email",
]);

// ───────────────────────────── penugasan kolom → field ─────────────────────────────

export interface SuggestOptions {
  /** Field yang boleh dipetakan ke lebih dari satu kolom (mis. L dan P terpisah). */
  multi?: FieldId[];
  /** Pemetaan tersimpan: signature header → field per kolom. */
  saved?: Array<FieldId | null> | null;
}

export function suggestMapping(columns: ColumnInfo[], opts: SuggestOptions = {}): ColumnGuess[] {
  const multi = new Set<FieldId>(opts.multi ?? ["gender"]);

  const guesses: ColumnGuess[] = columns.map((c) => ({
    index: c.index,
    header: c.header,
    field: null,
    confidence: 0,
    reason: "none",
    alternatives: [],
  }));

  // Pemetaan tersimpan menang penuh bila ukuran kolom sama.
  if (opts.saved && opts.saved.length === columns.length) {
    return guesses.map((g, i) => ({
      ...g,
      field: opts.saved![i] ?? null,
      confidence: opts.saved![i] ? 1 : 0,
      reason: opts.saved![i] ? "saved" : "none",
    }));
  }

  type Triple = { col: number; field: FieldId; conf: number; reason: MappingReason };
  const triples: Triple[] = [];
  const perColumn = new Map<number, Array<{ field: FieldId; confidence: number }>>();

  columns.forEach((col, ci) => {
    if (isIgnoredHeader(col.header)) {
      guesses[ci].reason = "ignored";
      return;
    }
    const content = contentScores(col.samples);
    const candidates: Array<{ field: FieldId; confidence: number; reason: MappingReason }> = [];
    for (const f of FIELDS) {
      const h = headerScore(col.header, f.id);
      const c = content[f.id] ?? 0;
      let conf = 0;
      let reason: MappingReason = "header";
      if (h >= 0.9) {
        conf = PROFILED.has(f.id) && col.samples.length > 0 && c < 0.2 ? h * 0.8 : h;
      } else if (h >= 0.5) {
        conf = Math.max(h * 0.85, 0.6 * h + 0.4 * c);
      } else if (c > 0) {
        conf = c * 0.8;
        reason = "content";
      }
      if (conf >= 0.35) candidates.push({ field: f.id, confidence: Math.min(conf, 1), reason });
    }
    candidates.sort((a, b) => b.confidence - a.confidence);
    perColumn.set(ci, candidates.slice(0, 4).map(({ field, confidence }) => ({ field, confidence })));
    for (const cand of candidates) {
      triples.push({ col: ci, field: cand.field, conf: cand.confidence, reason: cand.reason });
    }
  });

  triples.sort((a, b) => b.conf - a.conf || a.col - b.col);
  const fieldTaken = new Set<FieldId>();
  for (const t of triples) {
    if (t.conf < 0.5) continue;
    const g = guesses[t.col];
    if (g.field) continue;
    if (fieldTaken.has(t.field) && !multi.has(t.field)) continue;
    // Pemetaan tambahan untuk field multi hanya bila skornya meyakinkan
    if (fieldTaken.has(t.field) && t.conf < 0.6) continue;
    g.field = t.field;
    g.confidence = t.conf;
    g.reason = t.reason;
    fieldTaken.add(t.field);
  }

  for (const g of guesses) {
    const alts = (perColumn.get(g.index) ?? []).filter((a) => a.field !== g.field);
    g.alternatives = alts;
    if (!g.field && g.reason === "none" && alts.length === 0) g.reason = "none";
  }
  return guesses;
}

export function fieldLabel(id: FieldId | null | undefined): string {
  return id ? FIELD_BY_ID[id].label : "— Abaikan —";
}

/** Tanda tangan header (dipakai menyimpan pemetaan agar upload berikutnya satu klik). */
export function headerSignature(headers: string[]): string {
  const norm = headers.map((h) => canonicalHeader(h)).join("|");
  let hash = 5381;
  for (let i = 0; i < norm.length; i++) hash = ((hash << 5) + hash + norm.charCodeAt(i)) | 0;
  return `${headers.length}:${(hash >>> 0).toString(36)}`;
}
