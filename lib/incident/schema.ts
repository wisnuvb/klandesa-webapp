/** Validasi masukan primitif kejadian (murni). Ketat: koersi angka tanpa "1e3"/"0x10", panjang dibatasi, enum tertutup. */
import { cleanText as text, isRecord, parseIsoDate, type Parsed } from "@/lib/form-input";
import { toCents } from "@/lib/coop/loan-math";
import { DOMAIN_DEFS, LIMITS, own, isFundingSource, isKind, isResponseKind, isSeverity, isStatus, type Domain, type EventStatus, type FundingSource, type Severity } from "./catalog";
import { normalizeItemKey } from "./calc";

export const has = (b: Record<string, unknown>, k: string) => Object.prototype.hasOwnProperty.call(b, k);
export const blank = (v: unknown) => v === undefined || v === null || v === "";
export const MAX_CENTS = 99_999_999_999_999n;
export function money(v: unknown): { value: bigint | null; bad: boolean } {
  if (blank(v)) return { value: null, bad: false };
  const c = typeof v === "string" || typeof v === "number" ? toCents(v) : null;
  return c === null || c > MAX_CENTS ? { value: null, bad: true } : { value: c, bad: false };
}
/** Bilangan bulat dari angka atau string digit saja. */
export const digits = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && /^\d{1,10}$/.test(v.trim()) ? Number(v) : NaN;
  return Number.isInteger(n) ? n : null;
};
export const posInt = (v: unknown): number | null => {
  const n = digits(v);
  return n !== null && n >= 1 && n <= 2_000_000_000 ? n : null;
};
/** Hitungan dampak: 0 sampai batas wajar; null bila kosong. `bad` bila bukan angka. */
export function count(v: unknown): { value: number | null; bad: boolean } {
  if (blank(v)) return { value: null, bad: false };
  const n = digits(v);
  return n === null || n < 0 || n > LIMITS.maxCount ? { value: null, bad: true } : { value: n, bad: false };
}
/** Tanggal kolom DATE yang wajar (2000-2100). */
export const sane = (d: Date | null): Date | null => (d && d.getUTCFullYear() >= 2000 && d.getUTCFullYear() <= 2100 ? d : null);
export const bad = (fe: Record<string, string>) => ({ ok: false as const, errors: Object.values(fe), fieldErrors: fe });
export const notRecord = () => ({ ok: false as const, errors: ["Data tidak valid."], fieldErrors: {} });
export function optText(body: Record<string, unknown>, k: string, max: number, label: string, fe: Record<string, string>): string | null {
  const t = text(body[k], max);
  if (t.bad || t.tooLong) fe[k] = `${label} maksimal ${max} karakter.`;
  return t.value;
}
export function reqText(body: Record<string, unknown>, k: string, min: number, max: number, label: string, fe: Record<string, string>): string | null {
  const t = text(body[k], max);
  if (t.bad || t.tooLong || !t.value || t.value.length < min) {
    fe[k] = `${label} wajib diisi (${min}-${max} karakter).`;
    return null;
  }
  return t.value;
}

/** Waktu lengkap ISO 8601 dengan zona ("2026-11-01T08:30:00+07:00" atau "...Z"); tahun 2000-2100. */
export function parseInstant(raw: unknown): Date | null {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(raw)) return null;
  // Tanggal harus ada di kalender ("2026-02-31" digulung JavaScript menjadi 3 Maret, jadi diperiksa terpisah); jam 00-23, menit 00-59.
  if (!parseIsoDate(raw.slice(0, 10))) return null;
  const hh = Number(raw.slice(11, 13));
  const mm = Number(raw.slice(14, 16));
  if (hh > 23 || mm > 59 || (raw.length > 18 && /^\d{2}$/.test(raw.slice(17, 19)) && Number(raw.slice(17, 19)) > 59)) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime()) || d.getUTCFullYear() < 2000 || d.getUTCFullYear() > 2100) return null;
  return d;
}

const AREA = /^[0-9A-Za-z./-]{1,10}$/;
export function area(body: Record<string, unknown>, k: string, label: string, fe: Record<string, string>): string | null {
  const t = text(body[k], 10);
  if (t.bad || t.tooLong || (t.value !== null && !AREA.test(t.value))) {
    fe[k] = `${label} berisi huruf/angka (maks. 10 karakter).`;
    return null;
  }
  return t.value;
}

/** Koordinat: keduanya terisi atau keduanya kosong. Angka atau string desimal; tanpa notasi ilmiah. */
export function coords(body: Record<string, unknown>, fe: Record<string, string>): { lat: number | null; lng: number | null } {
  const num = (v: unknown): number | null => {
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "string" && /^-?\d{1,3}(\.\d{1,8})?$/.test(v.trim())) return Number(v);
    return null;
  };
  if (blank(body.lat) && blank(body.lng)) return { lat: null, lng: null };
  const lat = num(body.lat);
  const lng = num(body.lng);
  if (lat === null || lat < -90 || lat > 90) fe.lat = "Lintang harus angka antara -90 dan 90.";
  if (lng === null || lng < -180 || lng > 180) fe.lng = "Bujur harus angka antara -180 dan 180.";
  if (blank(body.lat) !== blank(body.lng) && !fe.lat && !fe.lng) fe[blank(body.lat) ? "lat" : "lng"] = "Isi lintang dan bujur bersama-sama.";
  return fe.lat || fe.lng ? { lat: null, lng: null } : { lat, lng };
}

export interface ImpactInput {
  deathCount: number | null;
  missingCount: number | null;
  injuredCount: number | null;
  displacedCount: number | null;
  affectedHouseholds: number | null;
  damagedHouses: number | null;
  lossCents: bigint | null;
  impactNote: string | null;
}
const IMPACT: [keyof ImpactInput, string][] = [
  ["deathCount", "Jumlah meninggal"],
  ["missingCount", "Jumlah hilang"],
  ["injuredCount", "Jumlah luka"],
  ["displacedCount", "Jumlah mengungsi"],
  ["affectedHouseholds", "Jumlah KK terdampak"],
  ["damagedHouses", "Jumlah rumah rusak"],
];

export interface EventCreate extends ImpactInput {
  domain: Domain;
  kind: string;
  title: string;
  description: string | null;
  occurredAt: Date;
  severity: Severity;
  locationText: string | null;
  rt: string | null;
  rw: string | null;
  hamlet: string | null;
  lat: number | null;
  lng: number | null;
  supraReportedAt: Date | null;
  supraReportedTo: string | null;
  supraReference: string | null;
}

function parseImpact(body: Record<string, unknown>, fe: Record<string, string>, only?: (k: string) => boolean): Partial<ImpactInput> {
  const out: Partial<ImpactInput> = {};
  for (const [k, label] of IMPACT) {
    if (only && !only(k)) continue;
    const c = count(body[k]);
    if (c.bad) fe[k] = `${label} harus bilangan bulat 0 sampai ${LIMITS.maxCount.toLocaleString("id-ID")}.`;
    else (out as Record<string, unknown>)[k] = c.value;
  }
  if (!only || only("lossCents")) {
    const m = money(body.loss);
    if (m.bad || (m.value !== null && m.value < 0n)) fe.loss = "Perkiraan kerugian harus angka rupiah (tidak negatif).";
    else out.lossCents = m.value;
  }
  if (!only || only("impactNote")) out.impactNote = optText(body, "impactNote", 1000, "Catatan dampak", fe);
  return out;
}

function parseSupra(body: Record<string, unknown>, fe: Record<string, string>, now: Date): Pick<EventCreate, "supraReportedAt" | "supraReportedTo" | "supraReference"> {
  const at = blank(body.supraReportedAt) ? null : parseInstant(body.supraReportedAt);
  if (!blank(body.supraReportedAt) && !at) fe.supraReportedAt = "Isi waktu pelaporan yang valid.";
  if (at && at.getTime() > now.getTime() + 5 * 60_000) fe.supraReportedAt = "Waktu pelaporan tidak boleh di masa depan.";
  const to = optText(body, "supraReportedTo", 150, "Instansi tujuan laporan", fe);
  const ref = optText(body, "supraReference", 150, "Nomor/bukti laporan", fe);
  if (!at && (to || ref) && !fe.supraReportedAt) fe.supraReportedAt = "Isi waktu pelaporan bila instansi atau nomor laporan diisi.";
  return { supraReportedAt: at, supraReportedTo: to, supraReference: ref };
}

export function parseEventCreate(domain: Domain, body: unknown, now: Date = new Date()): Parsed<EventCreate> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  if (!isKind(domain, body.kind)) fe.kind = "Pilih jenis kejadian.";
  const title = reqText(body, "title", 3, 200, "Judul", fe);
  const description = optText(body, "description", 2000, "Uraian", fe);
  const occurredAt = parseInstant(body.occurredAt);
  if (!occurredAt) fe.occurredAt = "Isi waktu kejadian yang valid.";
  else if (occurredAt.getTime() > now.getTime() + 5 * 60_000) fe.occurredAt = "Waktu kejadian tidak boleh di masa depan.";
  const severity = blank(body.severity) ? "MEDIUM" : body.severity;
  if (!isSeverity(severity)) fe.severity = "Pilih tingkat keparahan.";
  const locationText = optText(body, "locationText", 255, "Lokasi", fe);
  const rt = area(body, "rt", "RT", fe);
  const rw = area(body, "rw", "RW", fe);
  const hamlet = optText(body, "hamlet", 100, "Dusun", fe);
  const c = coords(body, fe);
  const impact = parseImpact(body, fe);
  const supra = parseSupra(body, fe, now);
  if (Object.keys(fe).length) return bad(fe);
  return {
    ok: true,
    value: {
      domain,
      kind: body.kind as string,
      title: title!,
      description,
      occurredAt: occurredAt!,
      severity: severity as Severity,
      locationText,
      rt,
      rw,
      hamlet,
      lat: c.lat,
      lng: c.lng,
      deathCount: impact.deathCount ?? null,
      missingCount: impact.missingCount ?? null,
      injuredCount: impact.injuredCount ?? null,
      displacedCount: impact.displacedCount ?? null,
      affectedHouseholds: impact.affectedHouseholds ?? null,
      damagedHouses: impact.damagedHouses ?? null,
      lossCents: impact.lossCents ?? null,
      impactNote: impact.impactNote ?? null,
      ...supra,
    },
  };
}

export type EventPatch = Partial<Omit<EventCreate, "domain">>;
const PATCH_KEYS = ["kind", "title", "description", "occurredAt", "severity", "locationText", "rt", "rw", "hamlet", "coords", "supra", ...IMPACT.map(([k]) => k), "loss", "impactNote"];
export const EVENT_PATCH_KEYS = PATCH_KEYS;

/** Ubah sebagian isian. Kunci yang tidak dikenal diabaikan (bukan galat) agar klien lama tetap jalan. */
export function parseEventPatch(domain: Domain, body: unknown, now: Date = new Date()): Parsed<EventPatch> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const out: EventPatch = {};
  if (has(body, "kind")) {
    if (isKind(domain, body.kind)) out.kind = body.kind as string;
    else fe.kind = "Pilih jenis kejadian.";
  }
  if (has(body, "title")) {
    const t = reqText(body, "title", 3, 200, "Judul", fe);
    if (t) out.title = t;
  }
  if (has(body, "description")) out.description = optText(body, "description", 2000, "Uraian", fe);
  if (has(body, "occurredAt")) {
    const d = parseInstant(body.occurredAt);
    if (!d) fe.occurredAt = "Isi waktu kejadian yang valid.";
    else if (d.getTime() > now.getTime() + 5 * 60_000) fe.occurredAt = "Waktu kejadian tidak boleh di masa depan.";
    else out.occurredAt = d;
  }
  if (has(body, "severity")) {
    if (isSeverity(body.severity)) out.severity = body.severity;
    else fe.severity = "Pilih tingkat keparahan.";
  }
  if (has(body, "locationText")) out.locationText = optText(body, "locationText", 255, "Lokasi", fe);
  if (has(body, "rt")) out.rt = area(body, "rt", "RT", fe);
  if (has(body, "rw")) out.rw = area(body, "rw", "RW", fe);
  if (has(body, "hamlet")) out.hamlet = optText(body, "hamlet", 100, "Dusun", fe);
  if (has(body, "lat") || has(body, "lng")) {
    const c = coords(body, fe);
    if (!fe.lat && !fe.lng) {
      out.lat = c.lat;
      out.lng = c.lng;
    }
  }
  Object.assign(out, parseImpact(body, fe, (k) => (k === "lossCents" ? has(body, "loss") : has(body, k))));
  if (has(body, "supraReportedAt") || has(body, "supraReportedTo") || has(body, "supraReference")) Object.assign(out, parseSupra(body, fe, now));
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: out };
}

export interface TransitionInput {
  to: EventStatus;
  note: string | null;
}
export function parseTransition(body: unknown): Parsed<TransitionInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  if (!isStatus(body.to)) fe.to = "Pilih status tujuan.";
  const note = optText(body, "note", 500, "Catatan", fe);
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { to: body.to as EventStatus, note } };
}

export interface ResponseInput {
  loggedAt: Date;
  kind: string;
  description: string;
  actor: string | null;
}
export function parseResponse(domain: Domain, body: unknown, now: Date = new Date()): Parsed<ResponseInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const loggedAt = parseInstant(body.loggedAt);
  if (!loggedAt) fe.loggedAt = "Isi waktu tindakan yang valid.";
  else if (loggedAt.getTime() > now.getTime() + 5 * 60_000) fe.loggedAt = "Waktu tindakan tidak boleh di masa depan.";
  if (!isResponseKind(domain, body.kind)) fe.kind = "Pilih jenis tindakan.";
  const description = reqText(body, "description", 3, 1000, "Uraian tindakan", fe);
  const actor = optText(body, "actor", 150, "Pelaksana", fe);
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { loggedAt: loggedAt!, kind: body.kind as string, description: description!, actor } };
}

export interface LogisticInput {
  householdId: number | null;
  recipientName: string | null;
  item: string;
  itemKey: string;
  quantity: number;
  unit: string;
  valueCents: bigint | null;
  fundingSource: FundingSource;
  distributedOn: Date;
  reference: string | null;
  note: string | null;
}
export function parseLogistic(body: unknown): Parsed<LogisticInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const householdId = blank(body.householdId) ? null : posInt(body.householdId);
  if (!blank(body.householdId) && !householdId) fe.householdId = "Pilihan KK tidak valid.";
  const recipientName = optText(body, "recipientName", 150, "Nama penerima", fe);
  if (!householdId && !recipientName && !fe.householdId) fe.recipientName = "Pilih KK penerima, atau isi nama penerima non-KK (mis. posko).";
  const item = reqText(body, "item", 2, 100, "Jenis bantuan", fe);
  const quantity = posInt(body.quantity);
  if (!quantity || quantity > LIMITS.maxCount) fe.quantity = `Jumlah harus bilangan bulat 1 sampai ${LIMITS.maxCount.toLocaleString("id-ID")}.`;
  const unit = reqText(body, "unit", 1, 30, "Satuan", fe);
  const value = money(body.value);
  if (value.bad || (value.value !== null && value.value < 0n)) fe.value = "Nilai harus angka rupiah (tidak negatif).";
  if (!isFundingSource(body.fundingSource)) fe.fundingSource = "Pilih sumber dana/bantuan.";
  const distributedOn = sane(parseIsoDate(body.distributedOn));
  if (!distributedOn) fe.distributedOn = "Isi tanggal penyerahan yang valid.";
  const reference = optText(body, "reference", 150, "Nomor bukti", fe);
  const note = optText(body, "note", 300, "Catatan", fe);
  if (Object.keys(fe).length) return bad(fe);
  return {
    ok: true,
    value: { householdId, recipientName, item: item!, itemKey: normalizeItemKey(item!), quantity: quantity!, unit: unit!, valueCents: value.value, fundingSource: body.fundingSource as FundingSource, distributedOn: distributedOn!, reference, note },
  };
}

/** Parameter daftar kejadian dari query string. */
export interface EventListQuery {
  status: EventStatus | "ACTIVE" | null;
  kind: string | null;
  page: number;
  pageSize: number;
}
export function parseEventListQuery(domain: Domain, sp: URLSearchParams): EventListQuery {
  const s = sp.get("status");
  const kind = sp.get("kind");
  return {
    status: s === "ACTIVE" ? "ACTIVE" : isStatus(s) ? s : null,
    kind: kind && own(DOMAIN_DEFS[domain].kinds, kind) ? kind : null,
    page: Math.max(1, Math.min(100000, Number(sp.get("page")) || 1)),
    pageSize: Math.max(1, Math.min(LIMITS.listPageSize, Number(sp.get("pageSize")) || 20)),
  };
}
