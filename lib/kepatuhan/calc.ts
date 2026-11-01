/** Perhitungan tenggat, status, dan tahap pengingat kalender kepatuhan. Murni (tanpa Prisma), aman untuk klien. */
import type { EventKey, ResolvedItem, Rule } from "./catalog";

export type Iso = string; // YYYY-MM-DD

const DAY_MS = 86_400_000;
const ms = (iso: Iso): number => Date.parse(`${iso}T00:00:00Z`);
const isIso = (s: unknown): s is Iso => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(ms(s)) && new Date(ms(s)).toISOString().slice(0, 10) === s;
const iso = (t: number): Iso => new Date(t).toISOString().slice(0, 10);
const pad = (n: number): string => String(n).padStart(2, "0");

/** Tanggal hari ini di zona WIB (UTC+7), terlepas dari zona waktu server. Dipakai untuk status dan pengingat di server. */
export const wibToday = (now: Date = new Date()): Iso => new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);

/** Selisih hari (b - a). */
export const daysBetween = (a: Iso, b: Iso): number => Math.round((ms(b) - ms(a)) / DAY_MS);

/** Tambah bulan; hari dipangkas ke akhir bulan tujuan. */
export function addMonths(isoDate: Iso, months: number): Iso {
  const [y, m, d] = isoDate.split("-").map(Number) as [number, number, number];
  const idx = y * 12 + (m - 1) + months;
  const ty = Math.floor(idx / 12);
  const tm = (idx % 12) + 1;
  const last = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
  return `${String(ty).padStart(4, "0")}-${pad(tm)}-${pad(Math.min(d, last))}`;
}

/** Tambah hari kerja (Senin-Jumat). Hari libur nasional TIDAK dikurangi; hasilnya batas paling awal yang aman dipakai. */
export function addWorkdays(isoDate: Iso, n: number): Iso {
  let t = ms(isoDate);
  let left = Math.max(0, Math.floor(n));
  while (left > 0) {
    t += DAY_MS;
    const dow = new Date(t).getUTCDay();
    if (dow !== 0 && dow !== 6) left--;
  }
  return iso(t);
}

export type Events = Partial<Record<EventKey, Iso | null>>;
export type DueResult = { due: Iso | null; reason: "OK" | "NO_RULE" | "NEEDS_EVENT" };

/** Tenggat suatu aturan untuk tahun anggaran tertentu. */
export function computeDue(rule: Rule, year: number, events: Events): DueResult {
  if (rule.kind === "NONE") return { due: null, reason: "NO_RULE" };
  if (rule.kind === "FIXED") {
    const y = year + rule.yearOffset;
    const last = new Date(Date.UTC(y, rule.month, 0)).getUTCDate();
    return { due: `${String(y).padStart(4, "0")}-${pad(rule.month)}-${pad(Math.min(rule.day, last))}`, reason: "OK" };
  }
  const base = events[rule.event];
  if (!base || !isIso(base)) return { due: null, reason: "NEEDS_EVENT" };
  return { due: rule.unit === "MONTH" ? addMonths(base, rule.amount) : addWorkdays(base, rule.amount), reason: "OK" };
}

export type ManualState = "BELUM" | "DRAF" | "TERKIRIM";
export interface Evidence {
  state: ManualState;
  sentOn: Iso | null;
  /** Dari mana keadaan itu diketahui */
  source: "SISTEM" | "CATATAN" | null;
}
export const NO_EVIDENCE: Evidence = { state: "BELUM", sentOn: null, source: null };

/** Menggabungkan bukti dari sistem dan catatan petugas: terkirim dari sistem menang, lalu terkirim dari catatan, lalu draf. */
export function mergeEvidence(auto: Evidence | null, manual: Evidence | null): Evidence {
  const a = auto ?? NO_EVIDENCE;
  const m = manual ?? NO_EVIDENCE;
  if (a.state === "TERKIRIM") return a;
  if (m.state === "TERKIRIM") return m;
  if (a.state === "DRAF") return a;
  if (m.state === "DRAF") return m;
  return NO_EVIDENCE;
}

export type FinalStatus = "BELUM" | "DRAF" | "TERKIRIM" | "TERLAMBAT";
export const SOON_DAYS = 14;

export interface StatusResult {
  status: FinalStatus;
  /** Sudah dikirim, tetapi sesudah tenggat */
  late: boolean;
  /** Hari menuju tenggat (negatif = lewat); null bila tenggat tak ada */
  daysLeft: number | null;
  soon: boolean;
}

/** Status akhir. `binding=false` (butir belum diverifikasi) tidak pernah menjadi TERLAMBAT. */
export function statusOf(args: { due: Iso | null; today: Iso; evidence: Evidence; binding: boolean }): StatusResult {
  const { due, today, evidence, binding } = args;
  const daysLeft = due ? daysBetween(today, due) : null;
  if (evidence.state === "TERKIRIM") {
    return { status: "TERKIRIM", late: Boolean(due && evidence.sentOn && evidence.sentOn > due), daysLeft, soon: false };
  }
  if (binding && due && daysLeft !== null && daysLeft < 0) return { status: "TERLAMBAT", late: false, daysLeft, soon: false };
  return { status: evidence.state === "DRAF" ? "DRAF" : "BELUM", late: false, daysLeft, soon: daysLeft !== null && daysLeft >= 0 && daysLeft <= SOON_DAYS };
}

export const STATUS_LABEL: Record<FinalStatus, string> = { BELUM: "Belum", DRAF: "Draf", TERKIRIM: "Terkirim", TERLAMBAT: "Terlambat" };

// ---------------------------------------------------------------------------------------------
// Pengingat

export const REMINDER_STAGES = ["d30", "d7", "d1", "late"] as const;
export type ReminderStage = (typeof REMINDER_STAGES)[number];
/** Pengingat "terlambat" hanya dikirim bila belum lewat lebih dari ini, agar desa yang baru bergabung tidak dibanjiri butir lama. */
export const LATE_WINDOW_DAYS = 14;

/**
 * Tahap pengingat yang berlaku hari ini untuk butir yang belum terkirim. Tahap dipilih dari ambang terkecil yang masih
 * mencakup sisa hari (30, 7, 1), jadi satu butir paling banyak mendapat empat pengingat sepanjang hidupnya.
 */
export function reminderStage(daysLeft: number | null): ReminderStage | null {
  if (daysLeft === null) return null;
  if (daysLeft < 0) return daysLeft >= -LATE_WINDOW_DAYS ? "late" : null;
  if (daysLeft <= 1) return "d1";
  if (daysLeft <= 7) return "d7";
  if (daysLeft <= 30) return "d30";
  return null;
}

export const stageLabel = (stage: ReminderStage, daysLeft: number): string => (stage === "late" ? `terlambat ${Math.abs(daysLeft)} hari` : daysLeft === 0 ? "jatuh tempo hari ini" : `${daysLeft} hari lagi`);

/** Kunci klaim pengingat (unik per desa lewat AdminNotification.sourceKey). Panjang aman < 120. */
export const reminderKey = (itemKey: string, year: number, stage: ReminderStage): string => `kal:${itemKey}:${year}:${stage}`;

// ---------------------------------------------------------------------------------------------
// Satu baris register

export interface RegistryRow {
  key: string;
  title: string;
  recipient: string;
  group: string;
  doneLabel: string;
  basis: string;
  verification: string;
  note: string | null;
  source: string;
  provisional: boolean;
  binding: boolean;
  custom: boolean;
  hint: string;
  bundle: string | null;
  rule: Rule;
  /** Tenggat; null bila tak ada tanggal tertulis atau peristiwa pemicunya belum tercatat */
  due: Iso | null;
  dueNote: string | null;
  status: FinalStatus;
  late: boolean;
  daysLeft: number | null;
  soon: boolean;
  sentOn: Iso | null;
  evidenceSource: "SISTEM" | "CATATAN" | null;
  record: { status: string; sentOn: Iso | null; referenceNo: string | null; note: string | null; archiveId: string | null } | null;
  /** Bagian dari butir ini dapat dicatat/ditimpa oleh operator (butir yang statusnya otomatis tetap boleh dicatat manual) */
  autoDerived: boolean;
  disabled: boolean;
  override: { source: "KABUPATEN" | "GLOBAL"; basis: string | null; fromYear: number } | null;
}

export interface Tally {
  total: number;
  terkirim: number;
  terlambat: number;
  segera: number;
  draf: number;
  belum: number;
  /** Terkirim tetapi lewat tenggat */
  terkirimTerlambat: number;
}

/** Menghitung kewajiban (binding) saja; butir tanpa tanggal ikut dihitung pada total/terkirim/belum tetapi tak pernah terlambat. */
export function tally(rows: Pick<RegistryRow, "status" | "binding" | "soon" | "late">[]): Tally {
  const t: Tally = { total: 0, terkirim: 0, terlambat: 0, segera: 0, draf: 0, belum: 0, terkirimTerlambat: 0 };
  for (const r of rows) {
    if (!r.binding) continue;
    t.total++;
    if (r.status === "TERKIRIM") {
      t.terkirim++;
      if (r.late) t.terkirimTerlambat++;
    } else if (r.status === "TERLAMBAT") t.terlambat++;
    else if (r.status === "DRAF") {
      t.draf++;
      if (r.soon) t.segera++;
    } else {
      t.belum++;
      if (r.soon) t.segera++;
    }
  }
  return t;
}

export function dueNoteFor(item: Pick<ResolvedItem, "rule">, reason: DueResult["reason"]): string | null {
  if (reason === "NO_RULE") return "Peraturan tidak menetapkan tanggal";
  if (reason === "NEEDS_EVENT") return item.rule.kind === "AFTER_EVENT" ? `Dihitung setelah ${item.rule.event === "RKPDES_ENACTED" ? "Perdes RKP Desa" : "Perdes APB Desa"} ditetapkan dan tercatat` : null;
  return null;
}
