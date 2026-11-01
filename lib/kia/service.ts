import { Prisma } from "@prisma/client";
import { cleanText, fail, future, invalid, isRecord, isoDay, parseIsoDate, type Result } from "@/lib/form-input";
import { sexOf } from "@/lib/gizi/zscore";
import {
  DANGER_SIGNS,
  ELDER_REMINDER_DAYS,
  ENDED_STATUSES,
  LIMITS,
  RANGE,
  addDays,
  ageFlag,
  ageOn,
  bmi,
  daysBetween,
  elderFlags,
  expectedDeliveryDate,
  gestationAt,
  isDangerSign,
  isProvider,
  planProgress,
  visitFlags,
  type PlanProgress,
  type PregnancyStatus,
} from "./catalog";

type Db = Prisma.TransactionClient;
type Range = readonly [number, number];
const MATERNAL_BOARD_CAP = 2000;
const ELDER_BOARD_CAP = 3000;

const dayStr = (d: Date): string => d.toISOString().slice(0, 10);
const num = (v: Prisma.Decimal | null | undefined): number | null => (v === null || v === undefined ? null : Number(v));

/** Angka isian opsional: kosong → null; di luar rentang atau lebih banyak desimal dari yang diizinkan → "bad". */
function opt(raw: unknown, range: Range, decimals = 0): number | null | "bad" {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "number" ? raw : typeof raw === "string" && /^\d{1,4}([.,]\d{1,2})?$/.test(raw.trim()) ? Number(raw.trim().replace(",", ".")) : NaN;
  if (!Number.isFinite(n) || n < range[0] || n > range[1]) return "bad";
  const f = 10 ** decimals;
  return Math.round(n * f) / f === n ? n : "bad";
}

class Errs {
  fe: Record<string, string> = {};
  add(field: string, msg: string) {
    this.fe[field] = msg;
  }
  get any() {
    return Object.keys(this.fe).length > 0;
  }
  result() {
    return invalid({ errors: Object.values(this.fe), fieldErrors: this.fe });
  }
}

function measure(e: Errs, body: Record<string, unknown>, field: string, range: Range, decimals: number, label: string): number | null {
  const v = opt(body[field], range, decimals);
  if (v === "bad") {
    e.add(field, `${label} harus angka ${range[0]} sampai ${range[1]}${decimals ? ` (maks. ${decimals} desimal)` : " (bilangan bulat)"}.`);
    return null;
  }
  return v;
}

function bloodPressure(e: Errs, body: Record<string, unknown>): { systolic: number | null; diastolic: number | null } {
  const systolic = measure(e, body, "systolic", RANGE.systolic, 0, "Tekanan darah atas");
  const diastolic = measure(e, body, "diastolic", RANGE.diastolic, 0, "Tekanan darah bawah");
  if ((systolic === null) !== (diastolic === null)) e.add(systolic === null ? "systolic" : "diastolic", "Isi kedua angka tekanan darah, atau kosongkan keduanya.");
  else if (systolic !== null && diastolic !== null && systolic <= diastolic) e.add("diastolic", "Angka bawah harus lebih kecil dari angka atas.");
  return { systolic, diastolic };
}

// ---- Kehamilan

export interface PregnancyBrief {
  id: number;
  residentId: number;
  name: string;
  rt: string | null;
  rw: string | null;
  ageYears: number;
  lmpDate: string;
  edd: string;
  status: PregnancyStatus;
  weeks: number;
  days: number;
  trimester: 1 | 2 | 3;
  visitCount: number;
  lastVisit: string | null;
  daysSinceLastVisit: number | null;
  plan: PlanProgress;
  flags: string[];
  /** Lewat HPL lebih dari 14 hari tetapi status masih hamil: minta petugas memperbarui. */
  overdue: boolean;
}

export async function registerPregnancy(db: Db, args: { villageId: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<{ id: number; edd: string }>> {
  const now = args.now ?? new Date();
  const body = isRecord(args.input) ? args.input : {};
  const e = new Errs();
  const residentId = Number(body.residentId);
  if (!Number.isInteger(residentId) || residentId < 1) e.add("residentId", "Pilih warga.");
  const lmp = parseIsoDate(body.lmpDate);
  if (!lmp) e.add("lmpDate", "Isi tanggal hari pertama haid terakhir (HPHT).");
  else if (future(lmp, now)) e.add("lmpDate", "HPHT tidak boleh di masa depan.");
  else if (daysBetween(lmp, now) > LIMITS.maxGestationDays) e.add("lmpDate", "HPHT lebih dari 43 minggu lalu. Periksa kembali tanggalnya.");
  if (e.any) return e.result();

  const r = await db.resident.findFirst({ where: { id: residentId, villageId: args.villageId }, select: { gender: true, isAlive: true, birthDate: true, moveDate: true } });
  if (!r) return fail(404, "Warga tidak ditemukan.");
  if (!r.isAlive) return fail(409, "Warga ini tercatat sudah meninggal.");
  if (r.moveDate) return fail(409, "Warga ini tercatat sudah pindah dari desa.");
  if (sexOf(r.gender) !== "F") return invalid({ errors: ["Hanya warga perempuan."], fieldErrors: { residentId: "Hanya warga perempuan." } });
  const age = ageOn(r.birthDate, lmp as Date);
  if (age < LIMITS.motherMinAge || age > LIMITS.motherMaxAge) return invalid({ errors: ["Umur warga pada HPHT tidak wajar. Periksa tanggal lahir atau HPHT."], fieldErrors: { lmpDate: "Umur tidak wajar untuk kehamilan." } });
  if ((await db.pregnancy.count({ where: { villageId: args.villageId } })) >= LIMITS.pregnanciesPerVillage) return fail(409, "Batas jumlah catatan kehamilan desa tercapai.");

  try {
    const p = await db.pregnancy.create({ data: { villageId: args.villageId, residentId, lmpDate: lmp as Date, edd: expectedDeliveryDate(lmp as Date), openKey: 1, createdById: args.userId } });
    return { ok: true, data: { id: p.id, edd: dayStr(p.edd) } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return fail(409, "Warga ini sudah punya catatan kehamilan yang masih berjalan. Akhiri dulu bila sudah bersalin.");
    throw err;
  }
}

export interface VisitInput {
  visitDate: Date;
  provider: string;
  weightKg: number | null;
  systolic: number | null;
  diastolic: number | null;
  upperArmCm: number | null;
  fundalHeightCm: number | null;
  fetalHeartRate: number | null;
  hemoglobin: number | null;
  tetanusGiven: boolean;
  ironTablets: number | null;
  ultrasound: boolean;
  dangerSigns: string[];
  note: string | null;
}

export function parseVisitInput(body: unknown, now: Date): { ok: true; value: VisitInput } | ReturnType<Errs["result"]> {
  const b = isRecord(body) ? body : {};
  const e = new Errs();
  const visitDate = parseIsoDate(b.visitDate);
  if (!visitDate) e.add("visitDate", "Isi tanggal kunjungan.");
  else if (future(visitDate, now)) e.add("visitDate", "Tanggal tidak boleh di masa depan.");
  if (!isProvider(b.provider)) e.add("provider", "Pilih pemeriksa.");
  const weightKg = measure(e, b, "weightKg", RANGE.weightKg, 1, "Berat badan");
  const { systolic, diastolic } = bloodPressure(e, b);
  const upperArmCm = measure(e, b, "upperArmCm", RANGE.upperArmCm, 1, "LiLA");
  const fundalHeightCm = measure(e, b, "fundalHeightCm", RANGE.fundalHeightCm, 1, "Tinggi fundus");
  const fetalHeartRate = measure(e, b, "fetalHeartRate", RANGE.fetalHeartRate, 0, "Denyut jantung janin");
  const hemoglobin = measure(e, b, "hemoglobin", RANGE.hemoglobin, 1, "Hb");
  const ironTablets = measure(e, b, "ironTablets", RANGE.ironTablets, 0, "Tablet tambah darah");
  const signs = Array.isArray(b.dangerSigns) ? [...new Set(b.dangerSigns.map(String))] : [];
  if (signs.some((s) => !isDangerSign(s))) e.add("dangerSigns", "Ada tanda bahaya yang tidak dikenal.");
  const note = cleanText(b.note, 300);
  if (note.bad || note.tooLong) e.add("note", "Catatan maksimal 300 karakter.");
  if (e.any) return e.result();
  return { ok: true, value: { visitDate: visitDate as Date, provider: b.provider as string, weightKg, systolic, diastolic, upperArmCm, fundalHeightCm, fetalHeartRate, hemoglobin, tetanusGiven: b.tetanusGiven === true, ironTablets, ultrasound: b.ultrasound === true, dangerSigns: signs, note: note.value } };
}

export async function addVisit(db: Db, args: { villageId: number; pregnancyId: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<{ id: number; weeks: number; trimester: number; flags: string[] }>> {
  const p = parseVisitInput(args.input, args.now ?? new Date());
  if (!p.ok) return invalid(p);
  const preg = await db.pregnancy.findFirst({ where: { id: args.pregnancyId, villageId: args.villageId }, include: { _count: { select: { visits: true } } } });
  if (!preg) return fail(404, "Catatan kehamilan tidak ditemukan.");
  if (preg.status !== "HAMIL") return fail(409, "Kehamilan ini sudah berakhir; kunjungan baru tidak dapat dicatat.");
  const v = p.value;
  const g = gestationAt(preg.lmpDate, v.visitDate);
  if (!g) return invalid({ errors: ["Tanggal kunjungan sebelum HPHT."], fieldErrors: { visitDate: "Sebelum HPHT." } });
  if (daysBetween(preg.lmpDate, v.visitDate) > LIMITS.maxGestationDays) return invalid({ errors: ["Tanggal kunjungan melewati 43 minggu dari HPHT."], fieldErrors: { visitDate: "Terlalu jauh dari HPHT." } });
  if (preg._count.visits >= LIMITS.visitsPerPregnancy) return fail(409, `Satu kehamilan maksimal ${LIMITS.visitsPerPregnancy} catatan kunjungan.`);
  const row = await db.pregnancyVisit.create({
    data: { pregnancyId: preg.id, villageId: args.villageId, visitDate: v.visitDate, gestationWeeks: g.weeks, trimester: g.trimester, provider: v.provider, weightKg: v.weightKg, systolic: v.systolic, diastolic: v.diastolic, upperArmCm: v.upperArmCm, fundalHeightCm: v.fundalHeightCm, fetalHeartRate: v.fetalHeartRate, hemoglobin: v.hemoglobin, tetanusGiven: v.tetanusGiven, ironTablets: v.ironTablets, ultrasound: v.ultrasound, dangerSigns: v.dangerSigns, note: v.note, createdById: args.userId },
  });
  return { ok: true, data: { id: row.id, weeks: g.weeks, trimester: g.trimester, flags: visitFlags(v) } };
}

export async function endPregnancy(db: Db, args: { villageId: number; pregnancyId: number; input: unknown; now?: Date }): Promise<Result<{ id: number }>> {
  const now = args.now ?? new Date();
  const b = isRecord(args.input) ? args.input : {};
  const e = new Errs();
  const status = b.status;
  if (!(ENDED_STATUSES as readonly unknown[]).includes(status)) e.add("status", "Pilih hasil akhir kehamilan.");
  const endedAt = parseIsoDate(b.endedAt);
  if (!endedAt) e.add("endedAt", "Isi tanggal kejadian.");
  else if (future(endedAt, now)) e.add("endedAt", "Tanggal tidak boleh di masa depan.");
  const note = cleanText(b.endNote, 300);
  if (note.bad || note.tooLong) e.add("endNote", "Keterangan maksimal 300 karakter.");
  if (e.any) return e.result();
  const preg = await db.pregnancy.findFirst({ where: { id: args.pregnancyId, villageId: args.villageId } });
  if (!preg) return fail(404, "Catatan kehamilan tidak ditemukan.");
  if (preg.status !== "HAMIL") return fail(409, "Kehamilan ini sudah dicatat berakhir.");
  if ((endedAt as Date).getTime() < preg.lmpDate.getTime()) return invalid({ errors: ["Tanggal sebelum HPHT."], fieldErrors: { endedAt: "Sebelum HPHT." } });
  if (daysBetween(preg.lmpDate, endedAt as Date) > LIMITS.maxGestationDays) return invalid({ errors: ["Tanggal melewati 43 minggu dari HPHT. Periksa HPHT atau tanggal kejadian."], fieldErrors: { endedAt: "Terlalu jauh dari HPHT." } });
  const res = await db.pregnancy.updateMany({ where: { id: preg.id, villageId: args.villageId, status: "HAMIL" }, data: { status: status as string, openKey: null, endedAt: endedAt as Date, endNote: note.value } });
  return res.count === 0 ? fail(409, "Kehamilan ini sudah dicatat berakhir.") : { ok: true, data: { id: preg.id } };
}

/** Hapus catatan yang salah input. Ditolak bila sudah ada kunjungan, supaya riwayat pemeriksaan tak hilang diam-diam. */
export async function deletePregnancy(db: Db, args: { villageId: number; pregnancyId: number }): Promise<Result<{ id: number }>> {
  const preg = await db.pregnancy.findFirst({ where: { id: args.pregnancyId, villageId: args.villageId }, include: { _count: { select: { visits: true } } } });
  if (!preg) return fail(404, "Catatan kehamilan tidak ditemukan.");
  if (preg._count.visits > 0) return fail(409, "Catatan ini sudah punya riwayat kunjungan dan tidak dapat dihapus. Akhiri kehamilan bila sudah selesai.");
  await db.pregnancy.delete({ where: { id: preg.id } });
  return { ok: true, data: { id: preg.id } };
}

type PregnancyRow = Prisma.PregnancyGetPayload<{ include: { resident: { select: { name: true; rt: true; rw: true; birthDate: true } }; visits: true } }>;

function briefOf(p: PregnancyRow, today: Date): PregnancyBrief {
  const g = gestationAt(p.lmpDate, p.status === "HAMIL" ? today : (p.endedAt ?? today)) ?? { weeks: 0, days: 0, trimester: 1 as const };
  const visits = [...p.visits].sort((a, b) => b.visitDate.getTime() - a.visitDate.getTime());
  const last = visits[0] ?? null;
  const flags: string[] = [];
  const af = ageFlag(ageOn(p.resident.birthDate, p.lmpDate));
  if (af) flags.push(af);
  if (last) flags.push(...visitFlags({ systolic: last.systolic, diastolic: last.diastolic, upperArmCm: num(last.upperArmCm), hemoglobin: num(last.hemoglobin), fetalHeartRate: last.fetalHeartRate, dangerSigns: Array.isArray(last.dangerSigns) ? (last.dangerSigns as string[]) : [] }));
  return {
    id: p.id,
    residentId: p.residentId,
    name: p.resident.name,
    rt: p.resident.rt,
    rw: p.resident.rw,
    ageYears: ageOn(p.resident.birthDate, p.lmpDate),
    lmpDate: dayStr(p.lmpDate),
    edd: dayStr(p.edd),
    status: p.status as PregnancyStatus,
    weeks: g.weeks,
    days: g.days,
    trimester: g.trimester,
    visitCount: visits.length,
    lastVisit: last ? dayStr(last.visitDate) : null,
    daysSinceLastVisit: last ? daysBetween(last.visitDate, today) : null,
    plan: planProgress(visits, g.trimester),
    flags,
    overdue: p.status === "HAMIL" && daysBetween(p.edd, today) > 14,
  };
}

export interface MaternalBoard {
  summary: { active: number; withVisit: number; completedPlan: number; flagged: number; overdue: number; noVisitYet: number; residentGone: number };
  pregnancies: PregnancyBrief[];
  /** Jumlah baris melewati batas tampilan, sehingga ringkasan hanya mencakup sebagian */
  truncated: boolean;
}

/** Papan ibu hamil yang masih berjalan, yang perlu diperhatikan lebih dulu. */
export async function maternalBoard(db: Db, villageId: number, today: Date = new Date()): Promise<MaternalBoard> {
  const rows = await db.pregnancy.findMany({
    where: { villageId, status: "HAMIL" },
    include: { resident: { select: { name: true, rt: true, rw: true, birthDate: true, isAlive: true, moveDate: true } }, visits: true },
    orderBy: { edd: "asc" },
    take: MATERNAL_BOARD_CAP,
  });
  // Ibu yang meninggal atau pindah tidak lagi dipantau desa; dihitung terpisah supaya petugas menyelesaikan catatannya.
  const present = rows.filter((r) => r.resident.isAlive && !r.resident.moveDate);
  const list = present.map((r) => briefOf(r, today));
  const attention = (b: PregnancyBrief) => b.flags.length * 3 + b.plan.missing.length * 2 + (b.overdue ? 5 : 0) + (b.visitCount === 0 ? 2 : 0);
  list.sort((a, b) => attention(b) - attention(a) || a.edd.localeCompare(b.edd));
  return {
    summary: {
      active: list.length,
      withVisit: list.filter((b) => b.visitCount > 0).length,
      completedPlan: list.filter((b) => b.plan.total >= 6).length,
      flagged: list.filter((b) => b.flags.length > 0).length,
      overdue: list.filter((b) => b.overdue).length,
      noVisitYet: list.filter((b) => b.visitCount === 0).length,
      residentGone: rows.length - present.length,
    },
    pregnancies: list,
    truncated: rows.length === MATERNAL_BOARD_CAP,
  };
}

export interface VisitView {
  id: number;
  visitDate: string;
  weeks: number;
  trimester: number;
  provider: string;
  weightKg: number | null;
  bloodPressure: string | null;
  upperArmCm: number | null;
  fundalHeightCm: number | null;
  fetalHeartRate: number | null;
  hemoglobin: number | null;
  tetanusGiven: boolean;
  ironTablets: number | null;
  ultrasound: boolean;
  dangerSigns: string[];
  flags: string[];
  note: string | null;
}

export async function pregnancyDetail(db: Db, villageId: number, id: number, today: Date = new Date()): Promise<Result<{ pregnancy: PregnancyBrief; endNote: string | null; endedAt: string | null; visits: VisitView[] }>> {
  const p = await db.pregnancy.findFirst({ where: { id, villageId }, include: { resident: { select: { name: true, rt: true, rw: true, birthDate: true } }, visits: true } });
  if (!p) return fail(404, "Catatan kehamilan tidak ditemukan.");
  const visits = [...p.visits].sort((a, b) => b.visitDate.getTime() - a.visitDate.getTime() || b.id - a.id).map((v): VisitView => {
    const signs = Array.isArray(v.dangerSigns) ? (v.dangerSigns as string[]) : [];
    return {
      id: v.id,
      visitDate: dayStr(v.visitDate),
      weeks: v.gestationWeeks,
      trimester: v.trimester,
      provider: v.provider,
      weightKg: num(v.weightKg),
      bloodPressure: v.systolic !== null && v.diastolic !== null ? `${v.systolic}/${v.diastolic}` : null,
      upperArmCm: num(v.upperArmCm),
      fundalHeightCm: num(v.fundalHeightCm),
      fetalHeartRate: v.fetalHeartRate,
      hemoglobin: num(v.hemoglobin),
      tetanusGiven: v.tetanusGiven,
      ironTablets: v.ironTablets,
      ultrasound: v.ultrasound,
      dangerSigns: signs.filter(isDangerSign).map((s) => DANGER_SIGNS[s]),
      flags: visitFlags({ systolic: v.systolic, diastolic: v.diastolic, upperArmCm: num(v.upperArmCm), hemoglobin: num(v.hemoglobin), fetalHeartRate: v.fetalHeartRate, dangerSigns: signs }),
      note: v.note,
    };
  });
  return { ok: true, data: { pregnancy: briefOf(p, today), endNote: p.endNote, endedAt: isoDay(p.endedAt), visits } };
}

// ---- Lansia

export interface ElderInputParsed {
  checkedAt: Date;
  weightKg: number | null;
  heightCm: number | null;
  systolic: number | null;
  diastolic: number | null;
  glucoseMgDl: number | null;
  glucoseType: string | null;
  adlScore: number | null;
  note: string | null;
}

export function parseElderInput(body: unknown, now: Date): { ok: true; value: ElderInputParsed } | ReturnType<Errs["result"]> {
  const b = isRecord(body) ? body : {};
  const e = new Errs();
  const checkedAt = parseIsoDate(b.checkedAt);
  if (!checkedAt) e.add("checkedAt", "Isi tanggal pemeriksaan.");
  else if (future(checkedAt, now)) e.add("checkedAt", "Tanggal tidak boleh di masa depan.");
  const weightKg = measure(e, b, "weightKg", RANGE.weightKg, 1, "Berat badan");
  const heightCm = measure(e, b, "heightCm", RANGE.heightCm, 1, "Tinggi badan");
  const { systolic, diastolic } = bloodPressure(e, b);
  const glucoseMgDl = measure(e, b, "glucoseMgDl", RANGE.glucoseMgDl, 0, "Gula darah");
  let glucoseType: string | null = null;
  if (glucoseMgDl !== null) {
    if (b.glucoseType === "PUASA" || b.glucoseType === "SEWAKTU") glucoseType = b.glucoseType;
    else e.add("glucoseType", "Pilih gula darah puasa atau sewaktu.");
  }
  const adlScore = measure(e, b, "adlScore", RANGE.adlScore, 0, "Skor kemandirian");
  const note = cleanText(b.note, 300);
  if (note.bad || note.tooLong) e.add("note", "Catatan maksimal 300 karakter.");
  if ([weightKg, heightCm, systolic, glucoseMgDl, adlScore].every((x) => x === null) && !e.any) e.add("weightKg", "Isi minimal satu hasil pengukuran.");
  if (e.any) return e.result();
  return { ok: true, value: { checkedAt: checkedAt as Date, weightKg, heightCm, systolic, diastolic, glucoseMgDl, glucoseType, adlScore, note: note.value } };
}

export async function addElderCheck(db: Db, args: { villageId: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<{ id: number; flags: string[] }>> {
  const now = args.now ?? new Date();
  const p = parseElderInput(args.input, now);
  if (!p.ok) return invalid(p);
  const residentId = Number(isRecord(args.input) ? args.input.residentId : NaN);
  if (!Number.isInteger(residentId) || residentId < 1) return invalid({ errors: ["Pilih warga."], fieldErrors: { residentId: "Pilih warga." } });
  const r = await db.resident.findFirst({ where: { id: residentId, villageId: args.villageId }, select: { birthDate: true, isAlive: true, moveDate: true } });
  if (!r) return fail(404, "Warga tidak ditemukan.");
  if (!r.isAlive) return fail(409, "Warga ini tercatat sudah meninggal.");
  if (r.moveDate) return fail(409, "Warga ini tercatat sudah pindah dari desa.");
  if (ageOn(r.birthDate, p.value.checkedAt) < LIMITS.elderMinAge) return invalid({ errors: ["Posyandu lansia untuk usia 60 tahun ke atas."], fieldErrors: { residentId: "Usia belum 60 tahun." } });
  if (p.value.checkedAt.getTime() < r.birthDate.getTime()) return invalid({ errors: ["Tanggal sebelum tanggal lahir."], fieldErrors: { checkedAt: "Sebelum tanggal lahir." } });
  if ((await db.elderlyCheck.count({ where: { residentId } })) >= LIMITS.elderChecksPerResident) return fail(409, "Batas catatan pemeriksaan untuk warga ini tercapai.");
  const row = await db.elderlyCheck.create({ data: { villageId: args.villageId, residentId, ...p.value, createdById: args.userId } });
  return { ok: true, data: { id: row.id, flags: elderFlags(p.value) } };
}

export async function deleteElderCheck(db: Db, args: { villageId: number; checkId: number }): Promise<Result<{ id: number }>> {
  const res = await db.elderlyCheck.deleteMany({ where: { id: args.checkId, villageId: args.villageId } });
  return res.count === 0 ? fail(404, "Catatan pemeriksaan tidak ditemukan.") : { ok: true, data: { id: args.checkId } };
}

export interface ElderCheckView {
  id: number;
  checkedAt: string;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
  bloodPressure: string | null;
  glucoseMgDl: number | null;
  glucoseType: string | null;
  adlScore: number | null;
  flags: string[];
  note: string | null;
}

const checkView = (c: Prisma.ElderlyCheckGetPayload<object>): ElderCheckView => ({
  id: c.id,
  checkedAt: dayStr(c.checkedAt),
  weightKg: num(c.weightKg),
  heightCm: num(c.heightCm),
  bmi: bmi(num(c.weightKg), num(c.heightCm)),
  bloodPressure: c.systolic !== null && c.diastolic !== null ? `${c.systolic}/${c.diastolic}` : null,
  glucoseMgDl: c.glucoseMgDl,
  glucoseType: c.glucoseType,
  adlScore: c.adlScore,
  flags: elderFlags(c),
  note: c.note,
});

export async function elderHistory(db: Db, villageId: number, residentId: number): Promise<Result<{ name: string; checks: ElderCheckView[] }>> {
  const r = await db.resident.findFirst({ where: { id: residentId, villageId }, select: { name: true } });
  if (!r) return fail(404, "Warga tidak ditemukan.");
  const rows = await db.elderlyCheck.findMany({ where: { villageId, residentId }, orderBy: [{ checkedAt: "desc" }, { id: "desc" }], take: 60 });
  return { ok: true, data: { name: r.name, checks: rows.map(checkView) } };
}

export interface ElderBrief {
  residentId: number;
  name: string;
  rt: string | null;
  rw: string | null;
  ageYears: number;
  lastCheck: ElderCheckView | null;
  daysSinceCheck: number | null;
  /** NEVER = belum pernah, OVERDUE = lewat pengingat, OK */
  status: "NEVER" | "OVERDUE" | "OK";
  flags: string[];
}

export interface ElderBoard {
  summary: { elders: number; checkedRecently: number; neverChecked: number; overdue: number; flagged: number; reminderDays: number };
  elders: ElderBrief[];
  truncated: boolean;
}

export async function elderBoard(db: Db, villageId: number, today: Date = new Date()): Promise<ElderBoard> {
  const cutoff = new Date(Date.UTC(today.getUTCFullYear() - LIMITS.elderMinAge, today.getUTCMonth(), today.getUTCDate()));
  const rows = await db.resident.findMany({
    where: { villageId, isAlive: true, moveDate: null, birthDate: { lte: cutoff } },
    select: { id: true, name: true, rt: true, rw: true, birthDate: true, elderlyChecks: { orderBy: [{ checkedAt: "desc" }, { id: "desc" }], take: 1 } },
    orderBy: { name: "asc" },
    take: ELDER_BOARD_CAP,
  });
  const elders: ElderBrief[] = rows.map((r) => {
    const last = r.elderlyChecks[0] ?? null;
    const since = last ? daysBetween(last.checkedAt, today) : null;
    return {
      residentId: r.id,
      name: r.name,
      rt: r.rt,
      rw: r.rw,
      ageYears: ageOn(r.birthDate, today),
      lastCheck: last ? checkView(last) : null,
      daysSinceCheck: since,
      status: since === null ? "NEVER" : since > ELDER_REMINDER_DAYS ? "OVERDUE" : "OK",
      flags: last ? elderFlags(last) : [],
    };
  });
  const rank = (e: ElderBrief) => e.flags.length * 3 + (e.status === "NEVER" ? 2 : e.status === "OVERDUE" ? 1 : 0);
  elders.sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name));
  return {
    summary: {
      elders: elders.length,
      checkedRecently: elders.filter((e) => e.status === "OK").length,
      neverChecked: elders.filter((e) => e.status === "NEVER").length,
      overdue: elders.filter((e) => e.status === "OVERDUE").length,
      flagged: elders.filter((e) => e.flags.length > 0).length,
      reminderDays: ELDER_REMINDER_DAYS,
    },
    elders,
    truncated: rows.length === ELDER_BOARD_CAP,
  };
}

export { addDays };
