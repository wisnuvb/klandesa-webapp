/** Validasi masukan kesiapsiagaan, peringatan dini, dan kesiapan Destana (murni). Dipakai bersama untuk membuat dan mengubah sebagian. */
import { cleanText as text, isRecord, parseIsoDate, type Parsed } from "@/lib/form-input";
import { area, bad, blank, coords, digits, has, notRecord, optText, posInt, sane } from "@/lib/incident/schema";
import {
  LIMITS,
  isAlertLevel,
  isAssessmentKind,
  isCondition,
  isHazardType,
  isLevel,
  isPlanKind,
  isPlanStatus,
  isReadinessStatus,
  isResourceKind,
  isRiskLevel,
  isVolunteerStatus,
  ACTIVITY_CODES,
  type AlertLevel,
  type AssessmentKind,
  type HazardType,
  type ReadinessStatus,
  type ResilienceLevel,
} from "./catalog";
import { alertContentProblem, dedupeTargets, type AreaTarget } from "./calc";

type FE = Record<string, string>;
interface Spec {
  keys: string[];
  /** wajib terisi saat membuat; saat mengubah, bila kuncinya dikirim tidak boleh kosong */
  required?: boolean;
  parse: (body: Record<string, unknown>, fe: FE) => Record<string, unknown>;
}

const txt = (key: string, label: string, max: number, o: { required?: boolean; min?: number } = {}): Spec => ({
  keys: [key],
  required: o.required,
  parse: (b, fe) => {
    const t = text(b[key], max);
    if (t.bad || t.tooLong || (o.required && (!t.value || t.value.length < (o.min ?? 1)))) {
      fe[key] = o.required ? `${label} wajib diisi (${o.min ?? 1}-${max} karakter).` : `${label} maksimal ${max} karakter.`;
      return {};
    }
    return { [key]: t.value };
  },
});

const pick = <T extends string>(key: string, label: string, guard: (v: unknown) => v is T, o: { required?: boolean; def?: T } = {}): Spec => ({
  keys: [key],
  required: o.required && o.def === undefined,
  parse: (b, fe) => {
    const v = blank(b[key]) && o.def !== undefined ? o.def : b[key];
    if (!guard(v)) {
      fe[key] = `Pilih ${label.toLowerCase()}.`;
      return {};
    }
    return { [key]: v };
  },
});

const intField = (key: string, label: string, max: number, min = 0): Spec => ({
  keys: [key],
  parse: (b, fe) => {
    if (blank(b[key])) return { [key]: null };
    const n = digits(b[key]);
    if (n === null || n < min || n > max) {
      const f = (v: number) => (v >= 1900 && v <= 2200 ? String(v) : v.toLocaleString("id-ID"));
      fe[key] = `${label} harus bilangan bulat ${f(min)} sampai ${f(max)}.`;
      return {};
    }
    return { [key]: n };
  },
});

const dateField = (key: string, label: string, o: { future?: boolean } = {}): Spec => ({
  keys: [key],
  parse: (b, fe) => {
    if (blank(b[key])) return { [key]: null };
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

const areaField = (key: string, label: string): Spec => ({
  keys: [key],
  parse: (b, fe) => {
    const v = area(b, key, label, fe);
    return fe[key] ? {} : { [key]: v };
  },
});

const coordsSpec: Spec = {
  keys: ["lat", "lng"],
  parse: (b, fe) => {
    const c = coords(b, fe);
    return fe.lat || fe.lng ? {} : { lat: c.lat, lng: c.lng };
  },
};

function run<T>(specs: Spec[], body: unknown, mode: "create" | "patch"): Parsed<T> {
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

export interface HazardInput {
  hazardType: HazardType;
  name: string;
  riskLevel: string;
  rt: string | null;
  rw: string | null;
  hamlet: string | null;
  lat: number | null;
  lng: number | null;
  exposedHouseholds: number | null;
  description: string | null;
  lastReviewedOn: Date | null;
}
const HAZARD_SPECS: Spec[] = [
  pick("hazardType", "Jenis ancaman", isHazardType, { required: true }),
  txt("name", "Nama/lokasi ancaman", 200, { required: true, min: 3 }),
  pick("riskLevel", "Tingkat risiko", isRiskLevel, { def: "MEDIUM" }),
  areaField("rt", "RT"),
  areaField("rw", "RW"),
  txt("hamlet", "Dusun", 100),
  coordsSpec,
  intField("exposedHouseholds", "Jumlah KK terpapar", 1_000_000),
  txt("description", "Uraian", 1000),
  dateField("lastReviewedOn", "Tanggal kaji ulang"),
];
export const parseHazard = (body: unknown, mode: "create" | "patch" = "create") => run<HazardInput>(HAZARD_SPECS, body, mode);

export interface ResourceInput {
  kind: string;
  name: string;
  locationText: string | null;
  rt: string | null;
  rw: string | null;
  lat: number | null;
  lng: number | null;
  capacity: number | null;
  quantity: number | null;
  unit: string | null;
  condition: string;
  lastCheckedOn: Date | null;
  custodian: string | null;
  note: string | null;
}
const RESOURCE_SPECS: Spec[] = [
  pick("kind", "Jenis sumber daya", isResourceKind, { required: true }),
  txt("name", "Nama", 200, { required: true, min: 2 }),
  txt("locationText", "Lokasi", 255),
  areaField("rt", "RT"),
  areaField("rw", "RW"),
  coordsSpec,
  intField("capacity", "Kapasitas", 10_000_000),
  intField("quantity", "Jumlah", 10_000_000),
  txt("unit", "Satuan", 30),
  pick("condition", "Kondisi", isCondition, { def: "BELUM_DIPERIKSA" }),
  dateField("lastCheckedOn", "Tanggal pemeriksaan"),
  txt("custodian", "Penanggung jawab", 150),
  txt("note", "Catatan", 500),
];
export const parseResource = (body: unknown, mode: "create" | "patch" = "create") => run<ResourceInput>(RESOURCE_SPECS, body, mode);

export interface VolunteerInput {
  residentId: number;
  team: string | null;
  role: string | null;
  skill: string | null;
  status: string;
  joinedOn: Date | null;
  skRef: string | null;
  note: string | null;
}
const VOLUNTEER_COMMON: Spec[] = [
  txt("team", "Tim", 100),
  txt("role", "Peran", 60),
  txt("skill", "Keahlian", 100),
  pick("status", "Status", isVolunteerStatus, { def: "ACTIVE" }),
  dateField("joinedOn", "Tanggal bergabung"),
  txt("skRef", "Nomor SK/penugasan", 150),
  txt("note", "Catatan", 300),
];
const residentSpec: Spec = {
  keys: ["residentId"],
  required: true,
  parse: (b, fe) => {
    const id = posInt(b.residentId);
    if (!id) {
      fe.residentId = "Pilih warga.";
      return {};
    }
    return { residentId: id };
  },
};
export const parseVolunteer = (body: unknown, mode: "create" | "patch" = "create") => run<VolunteerInput>(mode === "create" ? [residentSpec, ...VOLUNTEER_COMMON] : VOLUNTEER_COMMON, body, mode);

export interface PlanInput {
  kind: string;
  title: string;
  year: number | null;
  status: string;
  note: string | null;
  legalDocumentId: number | null;
  archiveId: bigint | null;
}
const PLAN_SPECS: Spec[] = [
  pick("kind", "Jenis dokumen", isPlanKind, { required: true }),
  txt("title", "Judul", 200, { required: true, min: 3 }),
  intField("year", "Tahun", 2100, 1990),
  pick("status", "Status", isPlanStatus, { def: "DRAF" }),
  txt("note", "Catatan", 500),
  {
    keys: ["legalDocumentId"],
    parse: (b, fe) => {
      if (blank(b.legalDocumentId)) return { legalDocumentId: null };
      const id = posInt(b.legalDocumentId);
      if (!id) {
        fe.legalDocumentId = "Pilihan produk hukum tidak valid.";
        return {};
      }
      return { legalDocumentId: id };
    },
  },
  {
    keys: ["archiveId"],
    parse: (b, fe) => {
      if (blank(b.archiveId)) return { archiveId: null };
      const raw = typeof b.archiveId === "number" ? String(b.archiveId) : b.archiveId;
      if (typeof raw !== "string" || !/^\d{1,18}$/.test(raw) || raw === "0") {
        fe.archiveId = "Pilihan arsip tidak valid.";
        return {};
      }
      return { archiveId: BigInt(raw) };
    },
  },
];
export const parsePlan = (body: unknown, mode: "create" | "patch" = "create") => run<PlanInput>(PLAN_SPECS, body, mode);

export interface AssessmentInput {
  kind: AssessmentKind;
  doneOn: Date;
  level: ResilienceLevel | null;
  referenceNo: string | null;
  note: string | null;
}
export function parseAssessment(body: unknown): Parsed<AssessmentInput> {
  if (!isRecord(body)) return notRecord();
  const fe: FE = {};
  if (!isAssessmentKind(body.kind)) fe.kind = "Pilih jenis catatan.";
  const doneOn = sane(parseIsoDate(body.doneOn));
  if (!doneOn) fe.doneOn = "Isi tanggal yang valid.";
  else if (doneOn.getTime() > Date.now() + 2 * 86_400_000) fe.doneOn = "Tanggal tidak boleh di masa depan.";
  let level: ResilienceLevel | null = null;
  if (body.kind === "PENILAIAN") {
    if (!isLevel(body.level)) fe.level = "Pilih tingkat hasil penilaian (atau 'Belum ditetapkan').";
    else level = body.level;
  } else if (!blank(body.level)) fe.level = "Tingkat hanya untuk catatan penilaian.";
  const referenceNo = optText(body, "referenceNo", 150, "Nomor/bukti", fe);
  const note = optText(body, "note", 500, "Catatan", fe);
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { kind: body.kind as AssessmentKind, doneOn: doneOn!, level, referenceNo, note } };
}

export interface ReadinessSet {
  code: string;
  status: ReadinessStatus;
  note: string | null;
}
export function parseReadinessSet(body: unknown): Parsed<ReadinessSet> {
  if (!isRecord(body)) return notRecord();
  const fe: FE = {};
  if (typeof body.code !== "string" || !ACTIVITY_CODES.has(body.code)) fe.code = "Butir tidak dikenal.";
  if (!isReadinessStatus(body.status)) fe.status = "Pilih status.";
  const note = optText(body, "note", 500, "Catatan/bukti", fe);
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { code: body.code as string, status: body.status as ReadinessStatus, note } };
}

export interface CustomItemInput {
  label: string;
  status: ReadinessStatus;
  note: string | null;
}
const CUSTOM_SPECS: Spec[] = [txt("label", "Butir", 200, { required: true, min: 3 }), pick("status", "Status", isReadinessStatus, { def: "BELUM" }), txt("note", "Catatan", 500)];
export const parseCustomItem = (body: unknown, mode: "create" | "patch" = "create") => run<CustomItemInput>(CUSTOM_SPECS, body, mode);

export interface AlertInput {
  level: AlertLevel;
  hazardType: HazardType | null;
  title: string;
  message: string;
  targetKind: "ALL" | "AREA";
  targets: AreaTarget[];
  eventId: number | null;
  preview: boolean;
  /** Jumlah akun dari pratinjau; wajib untuk pengiriman nyata (server menolak bila jumlah sekarang berbeda). */
  expectAccounts: number | null;
}
export function parseAlert(body: unknown): Parsed<AlertInput> {
  if (!isRecord(body)) return notRecord();
  const fe: FE = {};
  if (!isAlertLevel(body.level)) fe.level = "Pilih tingkat peringatan.";
  let hazardType: HazardType | null = null;
  if (!blank(body.hazardType)) {
    if (isHazardType(body.hazardType)) hazardType = body.hazardType;
    else fe.hazardType = "Pilih jenis ancaman.";
  }
  const title = text(body.title, 120);
  if (title.bad || title.tooLong || !title.value || title.value.length < 3) fe.title = "Judul wajib diisi (3-120 karakter).";
  else if (/^\s*[\[(]/.test(title.value)) fe.title = "Judul tidak boleh diawali tanda kurung; label tingkat ditambahkan otomatis oleh sistem.";
  else if (alertContentProblem(title.value)) fe.title = alertContentProblem(title.value)!;
  // Pesan boleh berbaris baru; rapikan spasi per baris, bukan seluruhnya.
  const rawMsg = typeof body.message === "string" ? body.message.replace(/\r\n/g, "\n").split("\n").map((l) => l.replace(/[ \t]+/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim() : "";
  if (typeof body.message !== "string" || rawMsg.length < 10 || rawMsg.length > 500) fe.message = "Isi pesan 10-500 karakter.";
  else if (alertContentProblem(rawMsg)) fe.message = alertContentProblem(rawMsg)!;
  const targetKind = body.targetKind;
  if (targetKind !== "ALL" && targetKind !== "AREA") fe.targetKind = "Pilih sasaran: seluruh desa atau wilayah tertentu.";
  let targets: AreaTarget[] = [];
  if (targetKind === "AREA") {
    const list = Array.isArray(body.targets) ? body.targets : null;
    if (!list || list.length < 1 || list.length > LIMITS.alertTargets) fe.targets = `Pilih 1 sampai ${LIMITS.alertTargets} wilayah sasaran.`;
    else {
      const parsed: AreaTarget[] = [];
      for (const t of list) {
        const rec = isRecord(t) ? t : null;
        const sub: FE = {};
        const rw = rec ? area({ rw: rec.rw }, "rw", "RW", sub) : null;
        const rt = rec && !blank(rec.rt) ? area({ rt: rec.rt }, "rt", "RT", sub) : null;
        if (!rec || !rw || sub.rw || sub.rt) {
          fe.targets = "Wilayah sasaran tidak valid (isi RW, RT boleh kosong).";
          break;
        }
        parsed.push({ rw, rt });
      }
      targets = dedupeTargets(parsed);
    }
  } else if (Array.isArray(body.targets) && body.targets.length) fe.targets = "Sasaran seluruh desa tidak memakai daftar wilayah.";
  let eventId: number | null = null;
  if (!blank(body.eventId)) {
    eventId = posInt(body.eventId);
    if (!eventId) fe.eventId = "Pilihan kejadian tidak valid.";
  }
  if (body.preview !== undefined && typeof body.preview !== "boolean") fe.preview = "Nilai tidak valid.";
  let expectAccounts: number | null = null;
  if (!blank(body.expectAccounts)) {
    expectAccounts = digits(body.expectAccounts);
    if (expectAccounts === null || expectAccounts < 0 || expectAccounts > 1_000_000) fe.expectAccounts = "Jumlah penerima dari pratinjau tidak valid.";
  } else if (body.preview !== true) fe.expectAccounts = "Hitung penerima (pratinjau) dulu, lalu kirim dengan jumlah penerima yang ditampilkan.";
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { level: body.level as AlertLevel, hazardType, title: title.value!, message: rawMsg, targetKind: targetKind as "ALL" | "AREA", targets, eventId, preview: body.preview === true, expectAccounts } };
}
