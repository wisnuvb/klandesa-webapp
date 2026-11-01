/**
 * Validasi masukan modul Keamanan (murni). Ketat: bilangan bulat tanpa notasi ilmiah/heksa, panjang dibatasi, enum tertutup,
 * tanggal harus ada di kalender. SEMUA teks bebas diperiksa penjaga kekerasan perempuan/anak (calc.sensitiveViolenceTerm).
 */
import { cleanText as text, isRecord, parseIsoDate, type Parsed } from "@/lib/form-input";
import { area, bad, blank, digits, has, notRecord, parseInstant, posInt, sane } from "@/lib/incident/schema";
import {
  LIMITS,
  isAttendance,
  isCondition,
  isContactKind,
  isEndReason,
  isEquipmentCategory,
  isMediationOutcome,
  isMemberRole,
  isPartySide,
  isRiskKind,
  isRiskLevel,
  isRondaLogKind,
  isSquadKind,
  type Attendance,
  type MediationOutcome,
  type RondaLogKind,
} from "./catalog";
import { SENSITIVE_MESSAGE, dateRange, daysBetween, sensitiveViolenceTerm } from "./calc";

type FE = Record<string, string>;
type Mode = "create" | "patch";
interface Spec {
  keys: string[];
  required?: boolean;
  parse: (b: Record<string, unknown>, fe: FE) => Record<string, unknown>;
}

/** Teks bebas: panjang dibatasi + penjaga kekerasan perempuan/anak. `guard=false` hanya untuk isian yang bukan narasi (nomor SK, nama tempat). */
const txt = (key: string, label: string, max: number, o: { required?: boolean; min?: number; guard?: boolean } = {}): Spec => ({
  keys: [key],
  required: o.required,
  parse: (b, fe) => {
    const t = text(b[key], max);
    if (t.bad || t.tooLong || (o.required && (!t.value || t.value.length < (o.min ?? 1)))) {
      fe[key] = o.required ? `${label} wajib diisi (${o.min ?? 1}-${max} karakter).` : `${label} maksimal ${max} karakter.`;
      return {};
    }
    if (o.guard !== false && sensitiveViolenceTerm(t.value)) {
      fe[key] = SENSITIVE_MESSAGE;
      return {};
    }
    return { [key]: t.value };
  },
});

const pick = <T extends string>(key: string, label: string, guard: (v: unknown) => v is T, o: { required?: boolean; def?: T; nullable?: boolean } = {}): Spec => ({
  keys: [key],
  required: o.required && o.def === undefined,
  parse: (b, fe) => {
    if (o.nullable && blank(b[key])) return { [key]: null };
    const v = blank(b[key]) && o.def !== undefined ? o.def : b[key];
    if (!guard(v)) {
      fe[key] = `Pilih ${label.toLowerCase()}.`;
      return {};
    }
    return { [key]: v };
  },
});

const intField = (key: string, label: string, min: number, max: number, o: { required?: boolean; def?: number } = {}): Spec => ({
  keys: [key],
  required: o.required,
  parse: (b, fe) => {
    if (blank(b[key])) {
      if (o.def !== undefined) return { [key]: o.def };
      if (o.required) fe[key] = `${label} wajib diisi.`;
      return o.required ? {} : { [key]: null };
    }
    const n = digits(b[key]);
    if (n === null || n < min || n > max) {
      fe[key] = `${label} harus bilangan bulat ${min} sampai ${max.toLocaleString("id-ID")}.`;
      return {};
    }
    return { [key]: n };
  },
});

const bool = (key: string, label: string, def: boolean | null): Spec => ({
  keys: [key],
  parse: (b, fe) => {
    if (blank(b[key])) return def === null ? { [key]: null } : { [key]: def };
    if (typeof b[key] !== "boolean") {
      fe[key] = `${label} harus ya atau tidak.`;
      return {};
    }
    return { [key]: b[key] };
  },
});

const dateField = (key: string, label: string, o: { required?: boolean; future?: boolean } = {}): Spec => ({
  keys: [key],
  required: o.required,
  parse: (b, fe) => {
    if (blank(b[key])) {
      if (o.required) fe[key] = `${label} wajib diisi.`;
      return o.required ? {} : { [key]: null };
    }
    const d = sane(parseIsoDate(b[key]));
    if (!d) {
      fe[key] = `${label} tidak valid.`;
      return {};
    }
    if (!o.future && d.getTime() > Date.now() + 2 * 86_400_000) {
      fe[key] = `${label} tidak boleh di masa depan.`;
      return {};
    }
    return { [key]: d };
  },
});

const instantField = (key: string, label: string, o: { required?: boolean; future?: boolean } = {}): Spec => ({
  keys: [key],
  required: o.required,
  parse: (b, fe) => {
    if (blank(b[key])) {
      if (o.required) fe[key] = `${label} wajib diisi.`;
      return o.required ? {} : { [key]: null };
    }
    const d = parseInstant(b[key]);
    if (!d) {
      fe[key] = `${label} tidak valid (isi tanggal dan jam lengkap).`;
      return {};
    }
    if (!o.future && d.getTime() > Date.now() + 5 * 60_000) {
      fe[key] = `${label} tidak boleh di masa depan.`;
      return {};
    }
    return { [key]: d };
  },
});

const areaField = (key: string, label: string): Spec => ({
  keys: [key],
  parse: (b, fe) => {
    const v = area(b, key, label, fe);
    return fe[key] ? {} : { [key]: v };
  },
});

const timeField = (key: string, label: string, def: string): Spec => ({
  keys: [key],
  parse: (b, fe) => {
    const v = blank(b[key]) ? def : b[key];
    if (typeof v !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) {
      fe[key] = `${label} harus berformat JJ:MM (00:00 sampai 23:59).`;
      return {};
    }
    return { [key]: v };
  },
});

const coordsSpec: Spec = {
  keys: ["lat", "lng"],
  parse: (b, fe) => {
    const num = (v: unknown): number | null => (typeof v === "number" ? (Number.isFinite(v) ? v : null) : typeof v === "string" && /^-?\d{1,3}(\.\d{1,8})?$/.test(v.trim()) ? Number(v) : null);
    if (blank(b.lat) && blank(b.lng)) return { lat: null, lng: null };
    const lat = num(b.lat);
    const lng = num(b.lng);
    if (lat === null || lat < -90 || lat > 90) fe.lat = "Lintang harus angka antara -90 dan 90.";
    if (lng === null || lng < -180 || lng > 180) fe.lng = "Bujur harus angka antara -180 dan 180.";
    return fe.lat || fe.lng ? {} : { lat, lng };
  },
};

function run<T>(specs: Spec[], body: unknown, mode: Mode): Parsed<T> {
  if (!isRecord(body)) return notRecord();
  const fe: FE = {};
  const out: Record<string, unknown> = {};
  for (const s of specs) {
    const present = s.keys.some((k) => has(body, k));
    if (mode === "patch" && !present) continue;
    Object.assign(out, s.parse(body, fe));
  }
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: out as T };
}

/** Kunci yang dilarang diubah pada ubah-sebagian ditolak diam-diam oleh `run` (hanya spesifikasi yang dikenal diproses). */

// ---------------------------------------------------------------------------------------------------------------------
// Anggota Satlinmas
// ---------------------------------------------------------------------------------------------------------------------
export interface MemberInput {
  residentId?: number;
  role?: string;
  squadKind?: string | null;
  squadName?: string | null;
  decreeNumber?: string | null;
  decreeDate?: Date | null;
  inauguratedOn?: Date | null;
  cardNumber?: string | null;
  joinedOn?: Date | null;
  extensionDecree?: string | null;
  note?: string | null;
}
const MEMBER_SPECS: Spec[] = [
  intField("residentId", "Warga", 1, 2_000_000_000, { required: true }),
  pick("role", "Jabatan", isMemberRole, { def: "ANGGOTA" }),
  pick("squadKind", "Jenis regu", isSquadKind, { nullable: true }),
  txt("squadName", "Nama regu", 100),
  txt("decreeNumber", "Nomor SK pengangkatan", 100, { guard: false }),
  dateField("decreeDate", "Tanggal SK", { future: true }),
  dateField("inauguratedOn", "Tanggal pengukuhan", { future: true }),
  txt("cardNumber", "Nomor kartu anggota", 60, { guard: false }),
  dateField("joinedOn", "Tanggal bergabung"),
  txt("extensionDecree", "Nomor keputusan perpanjangan", 100, { guard: false }),
  txt("note", "Catatan", 300),
];
export const parseMember = (body: unknown, mode: Mode): Parsed<MemberInput> => {
  const p = run<MemberInput>(MEMBER_SPECS, body, mode);
  if (mode === "patch" && p.ok) delete p.value.residentId; // warga tidak dapat diganti
  return p;
};

export interface MemberEnd {
  endedOn: Date;
  endReason: string;
  endDecree: string | null;
}
export function parseMemberEnd(body: unknown): Parsed<MemberEnd> {
  return run<MemberEnd>(
    [dateField("endedOn", "Tanggal berakhir", { required: true }), pick("endReason", "Sebab berakhir", isEndReason, { required: true }), txt("endDecree", "Nomor keputusan pemberhentian", 100, { guard: false })],
    body,
    "create",
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Perlengkapan
// ---------------------------------------------------------------------------------------------------------------------
export interface EquipmentInput {
  category: string;
  name: string;
  quantity: number;
  condition: string;
  location: string | null;
  custodian: string | null;
  inventoryItemId: number | null;
  lastCheckedOn: Date | null;
  note: string | null;
}
const EQUIPMENT_SPECS: Spec[] = [
  pick("category", "Jenis perlengkapan", isEquipmentCategory, { required: true }),
  txt("name", "Nama perlengkapan", 200, { required: true, min: 2, guard: false }),
  intField("quantity", "Jumlah", 0, 100_000, { def: 1 }),
  pick("condition", "Kondisi", isCondition, { def: "BELUM_DIPERIKSA" }),
  txt("location", "Lokasi simpan", 200),
  txt("custodian", "Penanggung jawab", 150, { guard: false }),
  intField("inventoryItemId", "Barang inventaris", 1, 2_000_000_000),
  dateField("lastCheckedOn", "Terakhir diperiksa"),
  txt("note", "Catatan", 300),
];
export const parseEquipment = (body: unknown, mode: Mode): Parsed<Partial<EquipmentInput>> => run(EQUIPMENT_SPECS, body, mode);

// ---------------------------------------------------------------------------------------------------------------------
// Regu ronda
// ---------------------------------------------------------------------------------------------------------------------
export interface GroupInput {
  name: string;
  rt: string | null;
  rw: string | null;
  hamlet: string | null;
  postName: string | null;
  startTime: string;
  endTime: string;
  perShift: number;
  active: boolean;
  note: string | null;
}
const GROUP_SPECS: Spec[] = [
  txt("name", "Nama regu", 120, { required: true, min: 3, guard: false }),
  areaField("rt", "RT"),
  areaField("rw", "RW"),
  txt("hamlet", "Dusun", 100, { guard: false }),
  txt("postName", "Nama pos", 120),
  timeField("startTime", "Jam mulai", "22:00"),
  timeField("endTime", "Jam selesai", "04:00"),
  intField("perShift", "Petugas per malam", 1, LIMITS.maxPerShift, { def: 2 }),
  bool("active", "Status aktif", true),
  txt("note", "Catatan", 300),
];
export const parseGroup = (body: unknown, mode: Mode): Parsed<Partial<GroupInput>> => run(GROUP_SPECS, body, mode);

export interface GroupPersonInput {
  residentId?: number;
  active?: boolean;
  joinedOn?: Date | null;
}
export const parseGroupPerson = (body: unknown, mode: Mode): Parsed<GroupPersonInput> => {
  const p = run<GroupPersonInput>([intField("residentId", "Warga", 1, 2_000_000_000, { required: true }), bool("active", "Status aktif", true), dateField("joinedOn", "Tanggal bergabung")], body, mode);
  if (mode === "patch" && p.ok) delete p.value.residentId;
  return p;
};

// ---------------------------------------------------------------------------------------------------------------------
// Jadwal, kehadiran, tukar giliran
// ---------------------------------------------------------------------------------------------------------------------
export interface GenerateInput {
  from: string;
  to: string;
  /** Peserta yang tidak ikut dijadwalkan pada periode ini */
  excludeResidentIds: number[];
  /** Ketidaktersediaan per malam */
  unavailable: { residentId: number; date: string }[];
}
export function parseGenerate(body: unknown): Parsed<GenerateInput> {
  if (!isRecord(body)) return notRecord();
  const fe: FE = {};
  const from = sane(parseIsoDate(body.from));
  const to = sane(parseIsoDate(body.to));
  if (!from) fe.from = "Isi tanggal mulai yang valid.";
  if (!to) fe.to = "Isi tanggal akhir yang valid.";
  let fromS = "";
  let toS = "";
  if (from && to) {
    fromS = from.toISOString().slice(0, 10);
    toS = to.toISOString().slice(0, 10);
    const n = daysBetween(fromS, toS) + 1;
    if (n < 1) fe.to = "Tanggal akhir tidak boleh sebelum tanggal mulai.";
    else if (n > LIMITS.scheduleDays) fe.to = `Periode paling lama ${LIMITS.scheduleDays} malam.`;
  }
  const ids: number[] = [];
  if (!blank(body.excludeResidentIds)) {
    if (!Array.isArray(body.excludeResidentIds) || body.excludeResidentIds.length > LIMITS.peoplePerGroup) fe.excludeResidentIds = "Daftar peserta yang dikecualikan tidak valid.";
    else
      for (const v of body.excludeResidentIds) {
        const n = posInt(v);
        if (!n) fe.excludeResidentIds = "Daftar peserta yang dikecualikan tidak valid.";
        else ids.push(n);
      }
  }
  const unavailable: GenerateInput["unavailable"] = [];
  if (!blank(body.unavailable)) {
    if (!Array.isArray(body.unavailable) || body.unavailable.length > 2000) fe.unavailable = "Daftar ketidaktersediaan tidak valid.";
    else
      for (const u of body.unavailable) {
        const rid = isRecord(u) ? posInt(u.residentId) : null;
        const d = isRecord(u) ? sane(parseIsoDate(u.date)) : null;
        if (!rid || !d) {
          fe.unavailable = "Daftar ketidaktersediaan tidak valid.";
          break;
        }
        unavailable.push({ residentId: rid, date: d.toISOString().slice(0, 10) });
      }
  }
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { from: fromS, to: toS, excludeResidentIds: [...new Set(ids)], unavailable } };
}
export const rangeOf = (g: Pick<GenerateInput, "from" | "to">): string[] => dateRange(g.from, g.to);

export interface ShiftInput {
  shiftDate: Date;
  residentId: number;
}
export const parseShift = (body: unknown): Parsed<ShiftInput> => run([dateField("shiftDate", "Tanggal giliran", { required: true, future: true }), intField("residentId", "Petugas", 1, 2_000_000_000, { required: true })], body, "create");

export interface MarkInput {
  attendance: Attendance;
  attendanceNote: string | null;
}
export const parseMark = (body: unknown): Parsed<MarkInput> => run([pick("attendance", "Kehadiran", isAttendance, { required: true }), txt("attendanceNote", "Catatan", 200)], body, "create");

export interface SwapCreateInput {
  shiftId: number;
  counterpartResidentId: number;
  counterpartShiftId: number | null;
  counterpartAgreed: boolean;
  reason: string | null;
}
export function parseSwapCreate(body: unknown): Parsed<SwapCreateInput> {
  const p = run<SwapCreateInput & { swap: boolean }>(
    [
      intField("shiftId", "Giliran pemohon", 1, 2_000_000_000, { required: true }),
      intField("counterpartResidentId", "Pihak kedua", 1, 2_000_000_000, { required: true }),
      intField("counterpartShiftId", "Giliran pihak kedua", 1, 2_000_000_000),
      bool("counterpartAgreed", "Persetujuan pihak kedua", false),
      bool("swap", "Bentuk tukar", false),
      txt("reason", "Alasan", 300),
    ],
    body,
    "create",
  );
  if (!p.ok) return p;
  // Bentuk "bertukar" tanpa giliran pihak kedua diam-diam menjadi penggantian biasa; tolak.
  if (p.value.swap && p.value.counterpartShiftId === null) return bad({ counterpartShiftId: "Pilih giliran pihak kedua yang ditukar." });
  const { shiftId, counterpartResidentId, counterpartShiftId, counterpartAgreed, reason } = p.value;
  return { ok: true, value: { shiftId, counterpartResidentId, counterpartShiftId, counterpartAgreed, reason } };
}

export interface SwapDecision {
  decision: "APPROVE" | "REJECT" | "CANCEL";
  note: string | null;
}
export function parseSwapDecision(body: unknown): Parsed<SwapDecision> {
  const p = run<{ decision: string; note: string | null }>([txt("note", "Catatan", 300)], body, "create");
  if (!p.ok) return p;
  const d = isRecord(body) ? body.decision : null;
  if (d !== "APPROVE" && d !== "REJECT" && d !== "CANCEL") return bad({ decision: "Pilih keputusan." });
  if ((d === "REJECT" || d === "CANCEL") && (p.value.note ?? "").length < 5) return bad({ note: "Tulis alasan (minimal 5 karakter)." });
  return { ok: true, value: { decision: d, note: p.value.note } };
}

export interface RondaLogInput {
  shiftDate: Date;
  loggedAt: Date;
  kind: RondaLogKind;
  description: string;
  reporter: string | null;
}
export const parseRondaLog = (body: unknown): Parsed<RondaLogInput> =>
  run(
    [
      dateField("shiftDate", "Malam ronda", { required: true }),
      instantField("loggedAt", "Waktu catatan", { required: true }),
      pick("kind", "Jenis catatan", isRondaLogKind, { required: true }),
      txt("description", "Uraian", 1000, { required: true, min: 3 }),
      txt("reporter", "Pencatat", 150, { guard: false }),
    ],
    body,
    "create",
  );

// ---------------------------------------------------------------------------------------------------------------------
// Mediasi
// ---------------------------------------------------------------------------------------------------------------------
export interface MediationInput {
  scheduledAt: Date;
  place: string;
  mediator: string;
  documentRef: string | null;
  note: string | null;
}
export const parseMediation = (body: unknown, mode: Mode): Parsed<Partial<MediationInput>> =>
  run(
    [
      instantField("scheduledAt", "Waktu mediasi", { required: true, future: true }),
      txt("place", "Tempat", 200, { required: true, min: 2 }),
      txt("mediator", "Mediator", 150, { required: true, min: 2, guard: false }),
      txt("documentRef", "Nomor berita acara", 150, { guard: false }),
      txt("note", "Catatan", 500),
    ],
    body,
    mode,
  );

export interface MediationComplete {
  outcome: MediationOutcome;
  agreement: string | null;
  referredTo: string | null;
  heldAt: Date | null;
}
export function parseMediationComplete(body: unknown): Parsed<MediationComplete> {
  const p = run<MediationComplete>([pick("outcome", "Hasil mediasi", isMediationOutcome, { required: true }), txt("agreement", "Isi kesepakatan", 2000), txt("referredTo", "Dirujuk ke", 200), instantField("heldAt", "Waktu pelaksanaan")], body, "create");
  if (!p.ok) return p;
  const v = p.value;
  const fe: FE = {};
  if ((v.outcome === "SEPAKAT" || v.outcome === "SEPAKAT_SEBAGIAN") && (v.agreement ?? "").length < 10) fe.agreement = "Tulis isi kesepakatan (minimal 10 karakter).";
  if (v.outcome === "DIRUJUK" && !v.referredTo) fe.referredTo = "Isi pihak tujuan rujukan.";
  if (v.outcome !== "DIRUJUK" && v.referredTo) v.referredTo = null;
  return Object.keys(fe).length ? bad(fe) : p;
}

export interface PartyInput {
  side: string;
  name: string | null;
  residentId: number | null;
  /** Hanya dipakai bila pihak diketik manual (tanpa warga); untuk warga dihitung dari tanggal lahir */
  isMinor: boolean;
  attended: boolean;
  agrees: boolean | null;
  note: string | null;
}
export function parseParty(body: unknown): Parsed<PartyInput> {
  const p = run<PartyInput>(
    [
      pick("side", "Peran", isPartySide, { required: true }),
      txt("name", "Nama", 150, { guard: false }),
      intField("residentId", "Warga", 1, 2_000_000_000),
      bool("isMinor", "Berusia di bawah 18 tahun", false),
      bool("attended", "Kehadiran", false),
      bool("agrees", "Persetujuan", null),
      txt("note", "Catatan", 300),
    ],
    body,
    "create",
  );
  if (!p.ok) return p;
  if (!p.value.residentId && !p.value.name) return bad({ name: "Pilih warga atau tulis nama pihak." });
  return p;
}

export const parsePartyPatch = (body: unknown): Parsed<Partial<Pick<PartyInput, "side" | "attended" | "agrees" | "note">>> =>
  run([pick("side", "Peran", isPartySide), bool("attended", "Kehadiran", false), bool("agrees", "Persetujuan", null), txt("note", "Catatan", 300)], body, "patch");

export interface FollowupInput {
  description: string;
  dueOn: Date | null;
  assignee: string | null;
  mediationId: number | null;
}
export const parseFollowup = (body: unknown): Parsed<FollowupInput> =>
  run([txt("description", "Tindak lanjut", 500, { required: true, min: 3 }), dateField("dueOn", "Batas waktu", { future: true }), txt("assignee", "Penanggung jawab", 150, { guard: false }), intField("mediationId", "Mediasi", 1, 2_000_000_000)], body, "create");

export const parseFollowupDone = (body: unknown): Parsed<{ doneNote: string | null }> => run([txt("doneNote", "Catatan penyelesaian", 300)], body, "create");

export function parseReportLink(body: unknown): Parsed<{ citizenReportId: bigint }> {
  if (!isRecord(body)) return notRecord();
  const raw = body.citizenReportId;
  const s = typeof raw === "number" && Number.isSafeInteger(raw) ? String(raw) : typeof raw === "string" ? raw.trim() : "";
  if (!/^[1-9]\d{0,17}$/.test(s)) return bad({ citizenReportId: "Pilih pengaduan yang valid." });
  return { ok: true, value: { citizenReportId: BigInt(s) } };
}

// ---------------------------------------------------------------------------------------------------------------------
// Kerawanan dan kontak
// ---------------------------------------------------------------------------------------------------------------------
export interface RiskInput {
  name: string;
  kind: string;
  level: string;
  rt: string | null;
  rw: string | null;
  hamlet: string | null;
  lat: number | null;
  lng: number | null;
  note: string | null;
  lastReviewedOn: Date | null;
  active: boolean;
}
export const parseRisk = (body: unknown, mode: Mode): Parsed<Partial<RiskInput>> =>
  run(
    [
      txt("name", "Nama/lokasi", 200, { required: true, min: 3 }),
      pick("kind", "Jenis kerawanan", isRiskKind, { required: true }),
      pick("level", "Tingkat", isRiskLevel, { def: "MEDIUM" }),
      areaField("rt", "RT"),
      areaField("rw", "RW"),
      txt("hamlet", "Dusun", 100, { guard: false }),
      coordsSpec,
      txt("note", "Catatan", 500),
      dateField("lastReviewedOn", "Terakhir dikaji ulang"),
      bool("active", "Status aktif", true),
    ],
    body,
    mode,
  );

export interface ContactInput {
  kind: string;
  name: string;
  phone: string;
  address: string | null;
  hours: string | null;
  note: string | null;
  checkedOn: Date | null;
}
export function parseContact(body: unknown, mode: Mode): Parsed<Partial<ContactInput>> {
  const p = run<Partial<ContactInput>>(
    [
      pick("kind", "Jenis layanan", isContactKind, { required: true }),
      txt("name", "Nama layanan", 150, { required: true, min: 2, guard: false }),
      txt("phone", "Nomor telepon", 40, { required: true, min: 3, guard: false }),
      txt("address", "Alamat", 255, { guard: false }),
      txt("hours", "Jam layanan", 100, { guard: false }),
      txt("note", "Catatan", 300),
      dateField("checkedOn", "Terakhir dicek"),
    ],
    body,
    mode,
  );
  if (p.ok && p.value.phone !== undefined && !/^[0-9+\-() ./]{3,40}$/.test(p.value.phone ?? "")) return bad({ phone: "Nomor telepon hanya berisi angka dan tanda + - ( ) . /" });
  return p;
}
