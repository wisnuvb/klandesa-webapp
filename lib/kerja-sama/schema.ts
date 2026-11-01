/** Validasi masukan kerja sama desa (murni, ketat). */
import { isRecord, type Parsed } from "@/lib/form-input";
import { isEndReason, isField, isInitiative, isKind, isPartyKind, type EndReason, type Field, type Initiative, type Kind, type PartyKind } from "./catalog";
import { bad, blank, has, longText, notRecord, optDate, optMoney, optText, posInt, reqDate, reqText, yearOf } from "@/lib/pengadaan/input";

export interface AgreementCreate {
  year: number;
  kind: Kind;
  initiative: Initiative | null;
  title: string;
  field: Field;
}
export function parseAgreementCreate(body: unknown): Parsed<AgreementCreate> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const year = yearOf(body, fe);
  if (!isKind(body.kind)) fe.kind = "Pilih antar-Desa atau dengan pihak ketiga.";
  let initiative: Initiative | null = null;
  if (body.kind === "PIHAK_KETIGA") {
    if (isInitiative(body.initiative)) initiative = body.initiative;
    else fe.initiative = "Pilih prakarsa: Desa atau pihak ketiga.";
  } else if (!blank(body.initiative)) fe.initiative = "Prakarsa hanya untuk kerja sama dengan pihak ketiga.";
  const title = reqText(body, "title", 200, "Judul kerja sama", fe);
  if (!isField(body.field)) fe.field = "Pilih bidang kerja sama.";
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { year, kind: body.kind as Kind, initiative, title, field: body.field as Field } };
}

export interface AgreementPatch {
  title?: string;
  field?: Field;
  scope?: string | null;
  procedures?: string | null;
  rights?: string | null;
  funding?: string | null;
  amendment?: string | null;
  dispute?: string | null;
  termStartOn?: Date | null;
  termEndOn?: Date | null;
  prepMusdesId?: number | null;
  inPlanConfirmed?: boolean;
  offerSentOn?: Date | null;
  offerMusdesId?: number | null;
  offerDecision?: "SEPAKAT" | "TIDAK" | null;
  offerReplyOn?: Date | null;
  consultRequired?: boolean;
  consultedOn?: Date | null;
  agreedOn?: Date | null;
  witnessName?: string | null;
  reportedOn?: Date | null;
  reportedToCamatOn?: Date | null;
}
/** Kolom isi perjanjian dan proses: terkunci setelah ditandatangani. */
export const DRAFT_KEYS: (keyof AgreementPatch)[] = ["field", "scope", "procedures", "rights", "funding", "amendment", "dispute", "termStartOn", "termEndOn", "prepMusdesId", "inPlanConfirmed", "offerSentOn", "offerMusdesId", "offerDecision", "offerReplyOn", "consultRequired", "consultedOn", "agreedOn"];
/** Kolom yang masih boleh diisi sesudah ditandatangani. */
export const AFTER_KEYS: (keyof AgreementPatch)[] = ["title", "witnessName", "reportedOn", "reportedToCamatOn"];

const LONG: [keyof AgreementPatch, number, string][] = [
  ["scope", 2000, "Ruang lingkup"],
  ["procedures", 2000, "Tata cara dan ketentuan pelaksanaan"],
  ["rights", 2000, "Hak dan kewajiban"],
  ["funding", 1000, "Pendanaan"],
  ["amendment", 1000, "Tata cara perubahan, penundaan, dan pembatalan"],
  ["dispute", 1000, "Penyelesaian perselisihan"],
];
const DATES: [keyof AgreementPatch, string][] = [
  ["termStartOn", "Tanggal mulai"],
  ["termEndOn", "Tanggal berakhir"],
  ["offerSentOn", "Tanggal penawaran"],
  ["offerReplyOn", "Tanggal jawaban"],
  ["consultedOn", "Tanggal konsultasi"],
  ["agreedOn", "Tanggal kesepakatan"],
  ["reportedOn", "Tanggal laporan"],
  ["reportedToCamatOn", "Tanggal laporan ke camat"],
];

export function parseAgreementPatch(body: unknown): Parsed<AgreementPatch> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const out: Record<string, unknown> = {};
  if (has(body, "title")) {
    const t = reqText(body, "title", 200, "Judul kerja sama", fe);
    if (!fe.title) out.title = t;
  }
  if (has(body, "field")) {
    if (isField(body.field)) out.field = body.field;
    else fe.field = "Pilih bidang kerja sama.";
  }
  for (const [k, max, label] of LONG) if (has(body, k)) {
    const v = longText(body, k, max, label, fe);
    if (!fe[k]) out[k] = v;
  }
  for (const [k, label] of DATES) if (has(body, k)) {
    const v = optDate(body, k, label, fe);
    if (!fe[k]) out[k] = v;
  }
  for (const k of ["prepMusdesId", "offerMusdesId"] as const) if (has(body, k)) {
    if (blank(body[k])) out[k] = null;
    else {
      const n = posInt(body[k]);
      if (n === null) fe[k] = "Musyawarah tidak valid.";
      else out[k] = n;
    }
  }
  for (const k of ["inPlanConfirmed", "consultRequired"] as const) if (has(body, k)) {
    if (typeof body[k] === "boolean") out[k] = body[k];
    else fe[k] = "Nilai harus ya atau tidak.";
  }
  if (has(body, "offerDecision")) {
    if (blank(body.offerDecision)) out.offerDecision = null;
    else if (body.offerDecision === "SEPAKAT" || body.offerDecision === "TIDAK") out.offerDecision = body.offerDecision;
    else fe.offerDecision = "Pilih sepakat atau tidak sepakat.";
  }
  if (has(body, "witnessName")) {
    const v = optText(body, "witnessName", 150, "Nama saksi", fe);
    if (!fe.witnessName) out.witnessName = v;
  }
  const s = out.termStartOn as Date | null | undefined;
  const e = out.termEndOn as Date | null | undefined;
  if (s && e && e < s) fe.termEndOn = "Tanggal berakhir tidak boleh sebelum tanggal mulai.";
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: out as AgreementPatch };
}

export interface SignInput {
  signedOn: Date;
  signedNumber: string;
  witnessName: string | null;
}
export function parseSign(body: unknown): Parsed<SignInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const signedOn = reqDate(body, "signedOn", "Tanggal penandatanganan", fe);
  const signedNumber = reqText(body, "signedNumber", 100, "Nomor Peraturan Bersama/Perjanjian Bersama", fe);
  const witnessName = optText(body, "witnessName", 150, "Nama saksi (camat)", fe);
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { signedOn, signedNumber, witnessName } };
}

export interface EndInput {
  reason: EndReason;
  note: string | null;
  endedOn: Date;
}
export function parseEnd(body: unknown): Parsed<EndInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  if (!isEndReason(body.endReason)) fe.endReason = "Pilih sebab berakhirnya kerja sama.";
  const note = optText(body, "endNote", 300, "Catatan", fe);
  const endedOn = reqDate(body, "endedOn", "Tanggal berakhir", fe);
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { reason: body.endReason as EndReason, note, endedOn } };
}

export interface PartyInput {
  kind: PartyKind;
  name: string;
  representativeName: string | null;
  representativeTitle: string | null;
}
export function parseParty(body: unknown): Parsed<PartyInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  if (!isPartyKind(body.kind) || body.kind === "SELF") fe.kind = "Pilih desa lain atau pihak ketiga.";
  const name = reqText(body, "name", 200, "Nama pihak", fe);
  const representativeName = optText(body, "representativeName", 150, "Nama penandatangan", fe);
  const representativeTitle = optText(body, "representativeTitle", 100, "Jabatan penandatangan", fe);
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { kind: body.kind as PartyKind, name, representativeName, representativeTitle } };
}
/** Perubahan nama penandatangan pihak (termasuk "Desa ini"): jenis dan nama tidak diubah. */
export function parsePartyPatch(body: unknown): Parsed<{ name?: string; representativeName: string | null; representativeTitle: string | null }> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const out: { name?: string; representativeName: string | null; representativeTitle: string | null } = { representativeName: optText(body, "representativeName", 150, "Nama penandatangan", fe), representativeTitle: optText(body, "representativeTitle", 100, "Jabatan penandatangan", fe) };
  if (has(body, "name")) {
    const n = reqText(body, "name", 200, "Nama pihak", fe);
    if (!fe.name) out.name = n;
  }
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: out };
}

export interface BudgetInput {
  description: string;
  amountCents: bigint;
  bearerId: number | null;
}
export function parseBudget(body: unknown): Parsed<BudgetInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const description = reqText(body, "description", 300, "Uraian", fe);
  const amount = optMoney(body, "amount", "Jumlah", fe);
  if (amount === null && !fe.amount) fe.amount = "Jumlah wajib diisi (angka rupiah lebih dari nol).";
  let bearerId: number | null = null;
  if (!blank(body.bearerId)) {
    bearerId = posInt(body.bearerId);
    if (bearerId === null) fe.bearerId = "Pihak penanggung tidak valid.";
  }
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { description, amountCents: amount!, bearerId } };
}
