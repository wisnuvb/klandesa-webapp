/** Validasi masukan pengadaan. Murni; kesalahan per kolom berbahasa Indonesia. */
import { isRecord, type Parsed } from "@/lib/form-input";
import { isKegiatanCode, isLeafAccountCode, accountKind } from "@/lib/apbdes/catalog";
import { isElement, isMethod, isMode, isRole, type Element, type Method, type Mode, type Role } from "./catalog";
import { bad, blank, digits, has, longText, money, MAX_CENTS, notRecord, optDate, optMoney, optText, posInt, reqDate, reqText, yearOf } from "./input";

function activity(body: Record<string, unknown>, fe: Record<string, string>): string {
  const c = typeof body.activityCode === "string" ? body.activityCode.trim() : "";
  if (!isKegiatanCode(c)) fe.activityCode = "Pilih kegiatan APB Desa yang kodenya valid.";
  return c;
}
function account(body: Record<string, unknown>, fe: Record<string, string>): string | null {
  if (blank(body.accountCode)) return null;
  const c = typeof body.accountCode === "string" ? body.accountCode.trim() : "";
  if (!isLeafAccountCode(c) || accountKind(c) !== "BELANJA") {
    fe.accountCode = "Pilih rekening belanja yang kodenya valid.";
    return null;
  }
  return c;
}
function modeMethod(body: Record<string, unknown>, fe: Record<string, string>): { mode: Mode; method: Method | null } {
  const mode = isMode(body.mode) ? body.mode : null;
  if (!mode) fe.mode = "Pilih swakelola atau melalui penyedia.";
  let method: Method | null = null;
  if (mode === "PENYEDIA") {
    if (isMethod(body.method)) method = body.method;
    else fe.method = "Pilih metode: pembelian langsung, permintaan penawaran, atau lelang.";
  } else if (!blank(body.method)) fe.method = "Swakelola tidak memakai metode penyedia.";
  return { mode: mode ?? "SWAKELOLA", method };
}

export interface PackageCreate {
  year: number;
  activityCode: string;
  accountCode: string | null;
  title: string;
  scope: string | null;
  location: string | null;
  mode: Mode;
  method: Method | null;
  hpsCents: bigint;
  executorName: string | null;
  executorTitle: string | null;
  plannedStartOn: Date | null;
  plannedEndOn: Date | null;
}
export function parsePackageCreate(body: unknown): Parsed<PackageCreate> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const year = yearOf(body, fe);
  const activityCode = activity(body, fe);
  const accountCode = account(body, fe);
  const title = reqText(body, "title", 200, "Nama paket", fe);
  const scope = longText(body, "scope", 1000, "Lingkup pekerjaan", fe);
  const location = optText(body, "location", 200, "Lokasi", fe);
  const { mode, method } = modeMethod(body, fe);
  const hps = money(body.hps);
  if (hps.bad || hps.value === null || hps.value <= 0n) fe.hps = mode === "SWAKELOLA" ? "RAB pengadaan harus angka rupiah lebih dari nol." : "HPS harus angka rupiah lebih dari nol.";
  const executorName = optText(body, "executorName", 150, "Nama Kasi/Kaur", fe);
  const executorTitle = optText(body, "executorTitle", 100, "Jabatan Kasi/Kaur", fe);
  const plannedStartOn = optDate(body, "plannedStartOn", "Tanggal mulai", fe);
  const plannedEndOn = optDate(body, "plannedEndOn", "Tanggal selesai", fe);
  if (plannedStartOn && plannedEndOn && plannedEndOn < plannedStartOn) fe.plannedEndOn = "Tanggal selesai tidak boleh sebelum tanggal mulai.";
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { year, activityCode, accountCode, title, scope, location, mode, method, hpsCents: hps.value!, executorName, executorTitle, plannedStartOn, plannedEndOn } };
}

/** Kolom yang boleh diubah dan tahap statusnya (di service). */
export interface PackagePatch {
  // struktur (hanya tahap Persiapan)
  activityCode?: string;
  accountCode?: string | null;
  mode?: Mode;
  method?: Method | null;
  hpsCents?: bigint;
  // umum
  title?: string;
  scope?: string | null;
  location?: string | null;
  executorName?: string | null;
  executorTitle?: string | null;
  plannedStartOn?: Date | null;
  plannedEndOn?: Date | null;
  tpkDecreeNumber?: string | null;
  tpkDecreeDate?: Date | null;
  planAnnouncedOn?: Date | null;
  resultAnnouncedOn?: Date | null;
  handoverToHeadOn?: Date | null;
  singleProviderReason?: string | null;
  negotiationNumber?: string | null;
  negotiationDate?: Date | null;
  negotiationNote?: string | null;
  contractNumber?: string | null;
  contractDate?: Date | null;
  contractCents?: bigint | null;
  contractStartOn?: Date | null;
  contractEndOn?: Date | null;
  bastNumber?: string | null;
  bastDate?: Date | null;
  bastHandedBy?: string | null;
  bastReceivedBy?: string | null;
  bastNote?: string | null;
  progressPct?: number;
}
export const STRUCTURAL: (keyof PackagePatch)[] = ["activityCode", "accountCode", "mode", "method", "hpsCents"];
export const NEGOTIATION_KEYS: (keyof PackagePatch)[] = ["negotiationNumber", "negotiationDate", "negotiationNote", "singleProviderReason", "contractNumber", "contractDate", "contractCents", "contractStartOn", "contractEndOn"];
/** Kolom SPK yang masih boleh diisi setelah pelaksanaan dimulai (nilai, nomor, tanggal terkunci agar pagar anggaran tidak dilewati). */
export const CONTRACT_LATE_OK: (keyof PackagePatch)[] = ["contractStartOn", "contractEndOn"];
export const BAST_KEYS: (keyof PackagePatch)[] = ["bastNumber", "bastDate", "bastHandedBy", "bastReceivedBy", "bastNote", "progressPct"];
export const ALWAYS_KEYS: (keyof PackagePatch)[] = ["planAnnouncedOn", "resultAnnouncedOn", "handoverToHeadOn"];

const TEXT: [keyof PackagePatch, string, number, string][] = [
  ["location", "location", 200, "Lokasi"],
  ["executorName", "executorName", 150, "Nama Kasi/Kaur"],
  ["executorTitle", "executorTitle", 100, "Jabatan Kasi/Kaur"],
  ["tpkDecreeNumber", "tpkDecreeNumber", 100, "Nomor keputusan TPK"],
  ["singleProviderReason", "singleProviderReason", 300, "Alasan"],
  ["negotiationNumber", "negotiationNumber", 100, "Nomor berita acara negosiasi"],
  ["negotiationNote", "negotiationNote", 500, "Catatan negosiasi"],
  ["contractNumber", "contractNumber", 100, "Nomor SPK/bukti transaksi"],
  ["bastNumber", "bastNumber", 100, "Nomor BAST"],
  ["bastHandedBy", "bastHandedBy", 150, "Nama penyerah"],
  ["bastReceivedBy", "bastReceivedBy", 150, "Nama penerima"],
  ["bastNote", "bastNote", 500, "Catatan BAST"],
];
const DATES: [keyof PackagePatch, string][] = [
  ["plannedStartOn", "Tanggal mulai"],
  ["plannedEndOn", "Tanggal selesai"],
  ["tpkDecreeDate", "Tanggal keputusan TPK"],
  ["planAnnouncedOn", "Tanggal pengumuman perencanaan"],
  ["resultAnnouncedOn", "Tanggal pengumuman hasil"],
  ["handoverToHeadOn", "Tanggal penyerahan kepada Kepala Desa"],
  ["negotiationDate", "Tanggal berita acara negosiasi"],
  ["contractDate", "Tanggal SPK"],
  ["contractStartOn", "Tanggal mulai kontrak"],
  ["contractEndOn", "Tanggal selesai kontrak"],
  ["bastDate", "Tanggal BAST"],
];

export function parsePackagePatch(body: unknown): Parsed<PackagePatch> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const out: Record<string, unknown> = {};
  if (has(body, "activityCode")) {
    const c = activity(body, fe);
    if (!fe.activityCode) out.activityCode = c;
  }
  if (has(body, "accountCode")) {
    const c = account(body, fe);
    if (!fe.accountCode) out.accountCode = c;
  }
  if (has(body, "mode") || has(body, "method")) {
    if (!has(body, "mode")) fe.mode = "Kirim mode bersama metode.";
    else {
      const mm = modeMethod(body, fe);
      if (!fe.mode && !fe.method) {
        out.mode = mm.mode;
        out.method = mm.method;
      }
    }
  }
  if (has(body, "hps")) {
    const m = money(body.hps);
    if (m.bad || m.value === null || m.value <= 0n) fe.hps = "HPS/RAB harus angka rupiah lebih dari nol.";
    else out.hpsCents = m.value;
  }
  if (has(body, "title")) {
    const t = reqText(body, "title", 200, "Nama paket", fe);
    if (!fe.title) out.title = t;
  }
  if (has(body, "scope")) {
    const t = longText(body, "scope", 1000, "Lingkup pekerjaan", fe);
    if (!fe.scope) out.scope = t;
  }
  for (const [key, field, max, label] of TEXT) if (has(body, field)) {
    const v = optText(body, field, max, label, fe);
    if (!fe[field]) out[key] = v;
  }
  for (const [key, label] of DATES) if (has(body, key)) {
    const v = optDate(body, key, label, fe);
    if (!fe[key]) out[key] = v;
  }
  if (has(body, "contract")) {
    const v = optMoney(body, "contract", "Nilai kontrak", fe);
    if (!fe.contract) out.contractCents = v;
  }
  if (has(body, "progressPct")) {
    const n = digits(body.progressPct);
    if (n === null || n < 0 || n > 100) fe.progressPct = "Progres harus bilangan bulat 0 sampai 100.";
    else out.progressPct = n;
  }
  const s = out.plannedStartOn as Date | null | undefined;
  const e = out.plannedEndOn as Date | null | undefined;
  if (s && e && e < s) fe.plannedEndOn = "Tanggal selesai tidak boleh sebelum tanggal mulai.";
  const cs = out.contractStartOn as Date | null | undefined;
  const ce = out.contractEndOn as Date | null | undefined;
  if (cs && ce && ce < cs) fe.contractEndOn = "Tanggal selesai kontrak tidak boleh sebelum tanggal mulai.";
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: out as PackagePatch };
}

export interface MemberInput {
  name: string;
  role: Role;
  element: Element;
  position: string | null;
}
export function parseMember(body: unknown): Parsed<MemberInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const name = reqText(body, "name", 150, "Nama", fe);
  if (!isRole(body.role)) fe.role = "Pilih peran: ketua, sekretaris, atau anggota.";
  if (!isElement(body.element)) fe.element = "Pilih unsur: perangkat Desa, lembaga kemasyarakatan, atau masyarakat.";
  const position = optText(body, "position", 100, "Jabatan/keterangan", fe);
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { name, role: body.role as Role, element: body.element as Element, position } };
}

export interface OfferInput {
  providerName: string;
  providerAddress: string | null;
  offeredOn: Date;
  priceCents: bigint;
  passed: boolean;
  evaluationNote: string | null;
  negotiatedCents: bigint | null;
}
export function parseOffer(body: unknown): Parsed<OfferInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const providerName = reqText(body, "providerName", 150, "Nama penyedia", fe);
  const providerAddress = optText(body, "providerAddress", 200, "Alamat penyedia", fe);
  const offeredOn = reqDate(body, "offeredOn", "Tanggal penawaran", fe);
  const price = money(body.price);
  if (price.bad || price.value === null || price.value <= 0n) fe.price = "Harga penawaran harus angka rupiah lebih dari nol.";
  if (has(body, "passed") && typeof body.passed !== "boolean") fe.passed = "Nilai lulus evaluasi tidak valid.";
  const evaluationNote = optText(body, "evaluationNote", 300, "Catatan evaluasi", fe);
  const neg = money(body.negotiated);
  if (neg.bad || (neg.value !== null && neg.value <= 0n)) fe.negotiated = "Harga hasil negosiasi harus angka rupiah lebih dari nol.";
  else if (neg.value !== null && price.value !== null && neg.value > price.value) fe.negotiated = "Harga hasil negosiasi tidak boleh lebih tinggi dari harga penawaran.";
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { providerName, providerAddress, offeredOn, priceCents: price.value!, passed: body.passed === true, evaluationNote, negotiatedCents: neg.value } };
}

export interface SettingInput {
  directLimitCents: bigint | null;
  offerLimitCents: bigint | null;
  basisNote: string | null;
}
export function parseSetting(body: unknown): Parsed<SettingInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const direct = optMoney(body, "directLimit", "Ambang pembelian langsung", fe);
  const offer = optMoney(body, "offerLimit", "Ambang permintaan penawaran", fe);
  if (direct !== null && offer !== null && direct > offer) fe.directLimit = "Ambang pembelian langsung tidak boleh melebihi ambang permintaan penawaran.";
  const basisNote = optText(body, "basisNote", 300, "Dasar ambang", fe);
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { directLimitCents: direct, offerLimitCents: offer, basisNote } };
}

export { MAX_CENTS, posInt };
