import { Prisma } from "@prisma/client";
import { cleanText, fail, future, invalid, isRecord, parseIsoDate, type Result } from "@/lib/form-input";
import { ageInMonths } from "./zscore";
import { SCHEDULE, TRACK_UNTIL_MONTHS, VACCINE_CODES, type DoseState } from "./immunization-catalog";

type Db = Prisma.TransactionClient;

export interface DoseStatus {
  code: string;
  label: string;
  dueMonths: number;
  state: DoseState;
  givenAt: string | null;
}

/** Status tiap dosis jadwal untuk satu anak pada `today`: sudah diberikan, sudah waktunya (belum diberikan), atau belum waktunya. */
export function doseStatuses(birthDate: Date, given: ReadonlyMap<string, Date>, today: Date): DoseStatus[] {
  const age = ageInMonths(birthDate, today) ?? 0;
  return SCHEDULE.map((v) => {
    const at = given.get(v.code) ?? null;
    return { code: v.code, label: v.label, dueMonths: v.dueMonths, state: at ? "DIBERIKAN" : age >= v.dueMonths ? "WAKTUNYA" : "BELUM_WAKTUNYA", givenAt: at ? at.toISOString().slice(0, 10) : null };
  });
}

export async function childStatus(db: Db, villageId: number, residentId: number, today: Date = new Date()): Promise<Result<{ name: string; ageMonths: number; doses: DoseStatus[] }>> {
  const r = await db.resident.findFirst({ where: { id: residentId, villageId }, select: { name: true, birthDate: true } });
  if (!r) return fail(404, "Anak tidak ditemukan.");
  const recs = await db.immunizationRecord.findMany({ where: { residentId, villageId }, select: { vaccineCode: true, givenAt: true } });
  const ageMonths = Math.round((ageInMonths(r.birthDate, today) ?? 0) * 10) / 10;
  return { ok: true, data: { name: r.name, ageMonths, doses: doseStatuses(r.birthDate, new Map(recs.map((x) => [x.vaccineCode, x.givenAt])), today) } };
}

/** Catat beberapa dosis yang diberikan pada hari yang sama: { residentId, givenAt, codes[], note? }. Dosis yang sudah tercatat dilewati dan dilaporkan. */
export async function recordDoses(db: Db, args: { villageId: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<{ recorded: string[]; alreadyRecorded: string[] }>> {
  const now = args.now ?? new Date();
  const body = isRecord(args.input) ? args.input : {};
  const fe: Record<string, string> = {};
  const residentId = Number(body.residentId);
  if (!Number.isInteger(residentId) || residentId < 1) fe.residentId = "Pilih anak.";
  const codes = Array.isArray(body.codes) ? [...new Set(body.codes.map(String))] : [];
  if (!codes.length) fe.codes = "Pilih minimal satu imunisasi.";
  else if (codes.some((c) => !VACCINE_CODES.has(c))) fe.codes = "Ada jenis imunisasi yang tidak dikenal.";
  const givenAt = parseIsoDate(body.givenAt);
  if (!givenAt) fe.givenAt = "Isi tanggal pemberian.";
  else if (future(givenAt, now)) fe.givenAt = "Tanggal tidak boleh di masa depan.";
  const note = cleanText(body.note, 200);
  if (note.bad || note.tooLong) fe.note = "Catatan maksimal 200 karakter.";
  if (Object.keys(fe).length) return invalid({ errors: Object.values(fe), fieldErrors: fe });

  const child = await db.resident.findFirst({ where: { id: residentId, villageId: args.villageId }, select: { birthDate: true } });
  if (!child) return { ok: false, status: 404, errors: ["Anak tidak ditemukan."], fieldErrors: { residentId: "Anak tidak ditemukan." } };
  if ((givenAt as Date).getTime() < child.birthDate.getTime()) return { ok: false, status: 400, errors: ["Tanggal pemberian sebelum tanggal lahir."], fieldErrors: { givenAt: "Sebelum tanggal lahir anak." } };

  const recorded: string[] = [];
  const already: string[] = [];
  for (const code of codes) {
    try {
      await db.immunizationRecord.create({ data: { villageId: args.villageId, residentId, vaccineCode: code, givenAt: givenAt as Date, note: note.value, createdById: args.userId } });
      recorded.push(code);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") already.push(code);
      else throw e;
    }
  }
  return { ok: true, data: { recorded, alreadyRecorded: already } };
}

/** Hapus satu catatan dosis (untuk membetulkan salah catat). */
export async function removeDose(db: Db, args: { villageId: number; residentId: number; code: string }): Promise<Result<{ code: string }>> {
  const done = await db.immunizationRecord.deleteMany({ where: { villageId: args.villageId, residentId: args.residentId, vaccineCode: args.code } });
  return done.count ? { ok: true, data: { code: args.code } } : fail(404, "Catatan imunisasi tidak ditemukan.");
}

export interface CoverageReport {
  children: number;
  upToDate: number;
  perVaccine: { code: string; label: string; eligible: number; given: number; percent: number }[];
  behind: { residentId: number; name: string; rt: string | null; rw: string | null; ageMonths: number; missing: string[] }[];
}

/** Anak hidup berusia 0 sampai 24 bulan: yang tertinggal dosis dan cakupan per jenis (diberikan / sudah waktunya). Tanpa NIK. */
export async function coverage(db: Db, villageId: number, today: Date = new Date()): Promise<CoverageReport> {
  const cutoff = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - TRACK_UNTIL_MONTHS, today.getUTCDate()));
  const kids = await db.resident.findMany({
    where: { villageId, isAlive: true, birthDate: { gte: cutoff, lte: today } },
    select: { id: true, name: true, rt: true, rw: true, birthDate: true, immunizations: { select: { vaccineCode: true, givenAt: true } } },
    orderBy: { birthDate: "asc" },
    take: 5000,
  });
  const eligible = new Map<string, number>();
  const given = new Map<string, number>();
  const behind: CoverageReport["behind"] = [];
  for (const k of kids) {
    const doses = doseStatuses(k.birthDate, new Map(k.immunizations.map((x) => [x.vaccineCode, x.givenAt])), today);
    const missing: string[] = [];
    for (const d of doses) {
      if (d.state === "BELUM_WAKTUNYA") continue;
      eligible.set(d.code, (eligible.get(d.code) ?? 0) + 1);
      if (d.state === "DIBERIKAN") given.set(d.code, (given.get(d.code) ?? 0) + 1);
      else missing.push(d.label);
    }
    if (missing.length) behind.push({ residentId: k.id, name: k.name, rt: k.rt, rw: k.rw, ageMonths: Math.round((ageInMonths(k.birthDate, today) ?? 0) * 10) / 10, missing });
  }
  behind.sort((a, b) => b.missing.length - a.missing.length || b.ageMonths - a.ageMonths);
  return {
    children: kids.length,
    upToDate: kids.length - behind.length,
    perVaccine: SCHEDULE.filter((v) => (eligible.get(v.code) ?? 0) > 0).map((v) => {
      const e = eligible.get(v.code) ?? 0;
      const g = given.get(v.code) ?? 0;
      return { code: v.code, label: v.label, eligible: e, given: g, percent: Math.round((g / e) * 1000) / 10 };
    }),
    behind,
  };
}
