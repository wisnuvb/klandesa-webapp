import { Prisma, type PrismaClient } from "@prisma/client";
import { fail, invalid, isoDay, type Result } from "@/lib/form-input";
import { fromCents } from "@/lib/coop/loan-math";
import { rulesFor } from "@/lib/dana-desa/rules";
import { BENEFICIARY_STATUS, CRITERIA, LIMITS, PROGRAM_STATUS, parseCriteria, type CriterionNo } from "./catalog";
import { parseBeneficiary, parsePayment, parseProgramCreate, parseProgramPatch, parseReplace, type BeneficiaryInput } from "./schema";

type Db = Prisma.TransactionClient;
const ok = <T>(data: T): { ok: true; data: T } => ({ ok: true, data });
class Stop extends Error {}
const stop = (msg: string): never => {
  throw new Stop(msg);
};
const asResult = (e: unknown): Result<never> => {
  if (e instanceof Stop) return fail(409, e.message);
  throw e;
};

const maskNik = (nik: string | null | undefined): string | null => (nik ? `${"•".repeat(Math.max(0, nik.length - 4))}${nik.slice(-4)}` : null);
const maskKk = maskNik;
const validNik = (nik: string | null | undefined): boolean => Boolean(nik && /^\d{16}$/.test(nik));
const NO_JOB = "Tidak bekerja / tidak tercatat";
const rp = (c: bigint): string => `Rp${new Intl.NumberFormat("id-ID").format(c / 100n)}`;

/** Kunci baris program. HARUS pernyataan pertama dalam transaksi (MySQL REPEATABLE READ). */
async function lockProgram(tx: Db, villageId: number, id: number) {
  const rows = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM blt_programs WHERE id = ${id} AND villageId = ${villageId} FOR UPDATE`;
  if (!rows.length) return null;
  return tx.bltProgram.findFirstOrThrow({ where: { id, villageId } });
}

// ---- Daftar dan rincian

export interface ProgramListItem {
  id: number;
  year: number;
  title: string;
  status: string;
  statusLabel: string;
  monthly: string;
  totalMonths: number;
  activeCount: number;
  paidAmount: string;
  needAmount: string;
}

export async function listPrograms(db: Db, villageId: number): Promise<ProgramListItem[]> {
  const programs = await db.bltProgram.findMany({ where: { villageId }, orderBy: { year: "desc" } });
  if (!programs.length) return [];
  const ids = programs.map((p) => p.id);
  const [active, paid] = await Promise.all([
    db.bltBeneficiary.groupBy({ by: ["programId"], where: { programId: { in: ids }, status: "AKTIF" }, _count: { _all: true } }),
    db.bltPayment.groupBy({ by: ["programId"], where: { programId: { in: ids } }, _sum: { amountCents: true } }),
  ]);
  return programs.map((p) => {
    const n = active.find((a) => a.programId === p.id)?._count._all ?? 0;
    return { id: p.id, year: p.year, title: p.title, status: p.status, statusLabel: PROGRAM_STATUS[p.status as keyof typeof PROGRAM_STATUS] ?? p.status, monthly: fromCents(p.monthlyCents), totalMonths: p.totalMonths, activeCount: n, paidAmount: fromCents(paid.find((x) => x.programId === p.id)?._sum.amountCents ?? 0n), needAmount: fromCents(p.monthlyCents * BigInt(p.totalMonths) * BigInt(n)) };
  });
}

export interface BeneficiaryView {
  id: number;
  name: string;
  kk: string | null;
  nikMasked: string | null;
  source: string;
  criteria: CriterionNo[];
  category: string;
  jobGroup: string;
  startMonth: number;
  status: string;
  statusLabel: string;
  endedReason: string | null;
  replacesId: number | null;
  decreeRef: string | null;
  paidMonths: number[];
  paidAmount: string;
  warnings: string[];
}
export interface ProgramView {
  id: number;
  year: number;
  title: string;
  monthly: string;
  totalMonths: number;
  status: string;
  statusLabel: string;
  musdes: { id: number; title: string; status: string; heldOn: string | null } | null;
  decreeNumber: string | null;
  decreeDate: string | null;
  reportedToRegencyOn: string | null;
  note: string | null;
  cap: { monthlyMax: string; monthsAtOnce: number; basisYear: number; exact: boolean };
  beneficiaries: BeneficiaryView[];
  payments: { id: number; beneficiaryId: number; beneficiaryName: string; monthFrom: number; monthTo: number; amount: string; method: string; paidOn: string; receivedBy: string | null; note: string | null }[];
  summary: { active: number; ended: number; needAmount: string; paidAmount: string; remainingAmount: string };
  warnings: string[];
  meetings: { id: number; kind: string; title: string; status: string; heldOn: string | null }[];
  criteria: Record<number, string>;
}

const heldOrFinal = (s: string) => s === "HELD" || s === "FINAL";

export async function getProgram(db: Db, villageId: number, id: number): Promise<Result<ProgramView>> {
  const p = await db.bltProgram.findFirst({
    where: { id, villageId },
    include: {
      musdesMeeting: { select: { id: true, title: true, status: true, heldOn: true } },
      beneficiaries: { orderBy: { id: "asc" }, include: { resident: { select: { nik: true, isAlive: true, moveDate: true, familyRole: true } } } },
      payments: { orderBy: [{ paidOn: "desc" }, { id: "desc" }] },
    },
  });
  if (!p) return fail(404, "Program BLT tidak ditemukan.");
  const meetings = await db.villageMeeting.findMany({ where: { villageId, kind: { in: ["MUSDES_BLT", "MUSDES_BLT_KHUSUS"] }, status: { not: "CANCELLED" } }, orderBy: { scheduledOn: "desc" }, take: 50, select: { id: true, kind: true, title: true, status: true, heldOn: true } });
  const niks = p.beneficiaries.map((b) => b.resident?.nik).filter((n): n is string => Boolean(n));
  const social = niks.length ? await db.socialBenefitBeneficiary.findMany({ where: { nik: { in: niks }, program: { villageId } }, select: { nik: true, program: { select: { name: true } } } }) : [];
  const pkh = new Map<string, string>();
  for (const s of social) if (/pkh|keluarga harapan/i.test(s.program.name)) pkh.set(s.nik, s.program.name);

  const byBen = new Map<number, typeof p.payments>();
  for (const pay of p.payments) byBen.set(pay.beneficiaryId, [...(byBen.get(pay.beneficiaryId) ?? []), pay]);
  const nameOf = new Map(p.beneficiaries.map((b) => [b.id, b.name]));

  let active = 0;
  let ended = 0;
  let need = 0n;
  const beneficiaries = p.beneficiaries.map((b): BeneficiaryView => {
    const pays = byBen.get(b.id) ?? [];
    const months = pays.flatMap((x) => Array.from({ length: x.monthTo - x.monthFrom + 1 }, (_, i) => x.monthFrom + i)).sort((a, c) => a - c);
    const warnings: string[] = [];
    const crit = parseCriteria(b.criteria);
    if (b.status === "AKTIF") {
      active += 1;
      need += p.monthlyCents * BigInt(Math.max(0, p.totalMonths - b.startMonth + 1));
      if (!b.resident) warnings.push("Data warga sudah dihapus; NIK dan alamat tidak dapat dicetak pada SK.");
      else {
        if (!validNik(b.resident.nik)) warnings.push("NIK belum 16 digit. Bagi keluarga tanpa NIK, terbitkan surat keterangan domisili dan fasilitasi layanan administrasi kependudukan (Lampiran II.A.2.b.2).");
        if (!b.resident.isAlive) warnings.push("Warga ini tercatat meninggal. Ganti penerima lewat Musyawarah Desa khusus.");
        else if (b.resident.moveDate) warnings.push("Warga ini tercatat sudah pindah. Periksa domisili; bila tidak lagi berdomisili di Desa, ganti penerima.");
        if (crit.includes(3) && pkh.has(b.resident.nik)) warnings.push(`Kriteria "tidak menerima PKH" dipilih, tetapi warga ini tercatat pada program "${pkh.get(b.resident.nik)}".`);
      }
    } else ended += 1;
    return {
      id: b.id,
      name: b.name,
      kk: maskKk(b.kk),
      nikMasked: maskNik(b.resident?.nik),
      source: b.source,
      criteria: crit,
      category: b.category,
      jobGroup: b.jobGroup,
      startMonth: b.startMonth,
      status: b.status,
      statusLabel: BENEFICIARY_STATUS[b.status as keyof typeof BENEFICIARY_STATUS] ?? b.status,
      endedReason: b.endedReason,
      replacesId: b.replacesId,
      decreeRef: b.decreeRef,
      paidMonths: months,
      paidAmount: fromCents(pays.reduce((s, x) => s + x.amountCents, 0n)),
      warnings,
    };
  });

  const paid = p.payments.reduce((s, x) => s + x.amountCents, 0n);
  const { rules, exact } = rulesFor(p.year);
  const warnings: string[] = [];
  if (p.status === "DRAFT" && !p.musdesMeetingId) warnings.push("Hubungkan Musyawarah Desa penetapan penerima BLT (jenis “Musyawarah Desa penetapan penerima BLT Desa”). Penerima harus diputuskan dalam Musyawarah Desa.");
  if (p.status !== "DRAFT" && !p.reportedToRegencyOn) warnings.push("Keputusan Kepala Desa belum dicatat dilaporkan kepada bupati/wali kota melalui camat.");
  if (p.monthlyCents > rules.bltMaxMonthlyCents) warnings.push(`Nilai per bulan melebihi batas ${rp(rules.bltMaxMonthlyCents)} per keluarga.`);
  if (!exact) warnings.push(`Aturan BLT tahun ${p.year} belum tercatat; memakai batas tahun ${rules.year}. Periksa peraturan tahun ${p.year}.`);

  return ok<ProgramView>({
    id: p.id,
    year: p.year,
    title: p.title,
    monthly: fromCents(p.monthlyCents),
    totalMonths: p.totalMonths,
    status: p.status,
    statusLabel: PROGRAM_STATUS[p.status as keyof typeof PROGRAM_STATUS] ?? p.status,
    musdes: p.musdesMeeting ? { id: p.musdesMeeting.id, title: p.musdesMeeting.title, status: p.musdesMeeting.status, heldOn: isoDay(p.musdesMeeting.heldOn) } : null,
    decreeNumber: p.decreeNumber,
    decreeDate: isoDay(p.decreeDate),
    reportedToRegencyOn: isoDay(p.reportedToRegencyOn),
    note: p.note,
    cap: { monthlyMax: fromCents(rules.bltMaxMonthlyCents), monthsAtOnce: rules.bltMaxMonthsAtOnce, basisYear: rules.year, exact },
    beneficiaries,
    payments: p.payments.map((x) => ({ id: x.id, beneficiaryId: x.beneficiaryId, beneficiaryName: nameOf.get(x.beneficiaryId) ?? "-", monthFrom: x.monthFrom, monthTo: x.monthTo, amount: fromCents(x.amountCents), method: x.method, paidOn: isoDay(x.paidOn)!, receivedBy: x.receivedBy, note: x.note })),
    summary: { active, ended, needAmount: fromCents(need), paidAmount: fromCents(paid), remainingAmount: fromCents(need > paid ? need - paid : 0n) },
    warnings,
    meetings: meetings.map((m) => ({ id: m.id, kind: m.kind, title: m.title, status: m.status, heldOn: isoDay(m.heldOn) })),
    criteria: { ...CRITERIA },
  });
}

// ---- Program

export async function createProgram(db: PrismaClient, args: { villageId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parseProgramCreate(args.input);
  if (!p.ok) return invalid(p);
  const { rules } = rulesFor(p.value.year);
  if (p.value.monthlyCents > rules.bltMaxMonthlyCents) return { ok: false, status: 400, errors: [`Nilai per bulan maksimal ${rp(rules.bltMaxMonthlyCents)} per keluarga.`], fieldErrors: { monthly: `Maksimal ${rp(rules.bltMaxMonthlyCents)} per bulan` } };
  try {
    const row = await db.bltProgram.create({ data: { villageId: args.villageId, year: p.value.year, title: p.value.title, monthlyCents: p.value.monthlyCents, totalMonths: p.value.totalMonths, createdById: args.userId } });
    return ok({ id: row.id });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail(409, `Program BLT tahun ${p.value.year} sudah ada.`);
    throw e;
  }
}

export async function patchProgram(db: PrismaClient, args: { villageId: number; id: number; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parseProgramPatch(args.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      const cur = await lockProgram(tx, args.villageId, args.id);
      if (!cur) return fail(404, "Program BLT tidak ditemukan.");
      const keys = Object.keys(v) as (keyof typeof v)[];
      const allowed: Record<string, (keyof typeof v)[]> = { DRAFT: keys, DITETAPKAN: ["reportedToRegencyOn", "note"], SELESAI: ["note"] };
      const blocked = keys.filter((k) => !allowed[cur.status]!.includes(k));
      if (blocked.length) return fail(409, cur.status === "DRAFT" ? "Isian tidak dapat diubah." : "Program sudah ditetapkan; hanya tanggal pelaporan kepada bupati dan catatan yang dapat diubah.");
      if (v.monthlyCents !== undefined && v.monthlyCents > rulesFor(cur.year).rules.bltMaxMonthlyCents) return fail(400, `Nilai per bulan maksimal ${rp(rulesFor(cur.year).rules.bltMaxMonthlyCents)} per keluarga.`);
      if (v.musdesMeetingId) {
        const m = await tx.villageMeeting.findFirst({ where: { id: v.musdesMeetingId, villageId: args.villageId, kind: "MUSDES_BLT" }, select: { id: true } });
        if (!m) return invalid({ errors: ["Musyawarah tidak ditemukan atau bukan jenis penetapan penerima BLT."], fieldErrors: { musdesMeetingId: "Pilih Musyawarah Desa penetapan penerima BLT." } });
      }
      await tx.bltProgram.update({ where: { id: cur.id }, data: v });
      return ok({ id: cur.id });
    })
    .catch(asResult);
}

export async function deleteProgram(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<{ id: number }>> {
  return db
    .$transaction(async (tx) => {
      const cur = await lockProgram(tx, args.villageId, args.id);
      if (!cur) return fail(404, "Program BLT tidak ditemukan.");
      if (cur.status !== "DRAFT") return fail(409, "Hanya program berstatus draf yang dapat dihapus.");
      if ((await tx.bltPayment.count({ where: { programId: cur.id } })) > 0) return fail(409, "Program sudah memiliki catatan pembayaran.");
      await tx.bltProgram.delete({ where: { id: cur.id } });
      return ok({ id: cur.id });
    })
    .catch(asResult);
}

export type StatusAction = "tetapkan" | "selesai" | "buka" | "cabut";
export async function changeStatus(db: PrismaClient, args: { villageId: number; id: number; action: StatusAction }): Promise<Result<{ status: string }>> {
  return db
    .$transaction(async (tx) => {
      const cur = await lockProgram(tx, args.villageId, args.id);
      if (!cur) return fail(404, "Program BLT tidak ditemukan.");
      const set = async (status: string) => {
        await tx.bltProgram.update({ where: { id: cur.id }, data: { status } });
        return ok({ status });
      };
      if (args.action === "tetapkan") {
        if (cur.status !== "DRAFT") return fail(409, "Hanya program berstatus draf yang dapat ditetapkan.");
        if (!cur.musdesMeetingId) return fail(409, "Hubungkan Musyawarah Desa penetapan penerima BLT lebih dulu.");
        const m = await tx.villageMeeting.findFirst({ where: { id: cur.musdesMeetingId, villageId: args.villageId }, select: { status: true } });
        if (!m || !heldOrFinal(m.status)) return fail(409, "Musyawarah Desa penetapan penerima belum terlaksana (tandai terlaksana dan susun berita acaranya).");
        if (!cur.decreeNumber || !cur.decreeDate) return fail(409, "Isi nomor dan tanggal Keputusan Kepala Desa.");
        if ((await tx.bltBeneficiary.count({ where: { programId: cur.id, status: "AKTIF" } })) < 1) return fail(409, "Belum ada keluarga penerima manfaat.");
        if (cur.monthlyCents > rulesFor(cur.year).rules.bltMaxMonthlyCents) return fail(409, "Nilai per bulan melebihi batas aturan.");
        return set("DITETAPKAN");
      }
      if (args.action === "selesai") return cur.status === "DITETAPKAN" ? set("SELESAI") : fail(409, "Hanya program yang sudah ditetapkan yang dapat diselesaikan.");
      if (args.action === "buka") return cur.status === "SELESAI" ? set("DITETAPKAN") : fail(409, "Hanya program selesai yang dapat dibuka kembali.");
      if (cur.status !== "DITETAPKAN") return fail(409, "Hanya program yang sudah ditetapkan yang dapat dicabut penetapannya.");
      if ((await tx.bltPayment.count({ where: { programId: cur.id } })) > 0) return fail(409, "Penetapan tidak dapat dicabut karena sudah ada pembayaran.");
      return set("DRAFT");
    })
    .catch(asResult);
}

// ---- Penerima

async function buildBeneficiary(tx: Db, villageId: number, programId: number, input: BeneficiaryInput, exceptId?: number) {
  const r = await tx.resident.findFirst({ where: { id: input.residentId, villageId }, select: { id: true, name: true, kk: true, occupation: true, isAlive: true, moveDate: true } });
  if (!r) return stop("Warga tidak ditemukan di Desa ini.");
  if (!r.isAlive) return stop("Warga ini tercatat meninggal dan tidak dapat menjadi penerima.");
  if (r.moveDate) return stop("Warga ini tercatat sudah pindah dan tidak dapat menjadi penerima.");
  const kk = r.kk?.trim() || null;
  const dup = await tx.bltBeneficiary.findFirst({
    where: { programId, status: "AKTIF", ...(exceptId ? { id: { not: exceptId } } : {}), OR: [{ residentId: r.id }, ...(kk ? [{ kk }] : [])] },
    select: { name: true },
  });
  if (dup) return stop(`Keluarga ini sudah terdaftar sebagai penerima (${dup.name}). Satu keluarga satu penerima.`);
  const active = await tx.bltBeneficiary.count({ where: { programId } });
  if (active >= LIMITS.beneficiariesPerProgram) return stop(`Penerima maksimal ${LIMITS.beneficiariesPerProgram} per program.`);
  return { residentId: r.id, name: r.name, kk, source: input.source, criteria: input.criteria.length ? input.criteria.join(",") : null, category: input.category, jobGroup: (r.occupation ?? "").trim().slice(0, 100) || NO_JOB };
}

export async function addBeneficiary(db: PrismaClient, args: { villageId: number; programId: number; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parseBeneficiary(args.input);
  if (!p.ok) return invalid(p);
  return db
    .$transaction(async (tx) => {
      const cur = await lockProgram(tx, args.villageId, args.programId);
      if (!cur) return fail(404, "Program BLT tidak ditemukan.");
      if (cur.status !== "DRAFT") return fail(409, "Penerima tidak dapat ditambah setelah Keputusan Kepala Desa terbit. Perubahan hanya lewat penggantian (Musyawarah Desa khusus).");
      const data = await buildBeneficiary(tx, args.villageId, cur.id, p.value);
      const row = await tx.bltBeneficiary.create({ data: { ...data, programId: cur.id, villageId: args.villageId } });
      return ok({ id: row.id });
    })
    .catch(asResult);
}

export async function removeBeneficiary(db: PrismaClient, args: { villageId: number; programId: number; id: number }): Promise<Result<{ id: number }>> {
  return db
    .$transaction(async (tx) => {
      const cur = await lockProgram(tx, args.villageId, args.programId);
      if (!cur) return fail(404, "Program BLT tidak ditemukan.");
      if (cur.status !== "DRAFT") return fail(409, "Penerima tidak dapat dihapus setelah Keputusan Kepala Desa terbit; gunakan penggantian.");
      const r = await tx.bltBeneficiary.deleteMany({ where: { id: args.id, programId: cur.id } });
      return r.count ? ok({ id: args.id }) : fail(404, "Penerima tidak ditemukan.");
    })
    .catch(asResult);
}

export async function replaceBeneficiary(db: PrismaClient, args: { villageId: number; programId: number; id: number; input: unknown }): Promise<Result<{ id: number | null }>> {
  const p = parseReplace(args.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      const cur = await lockProgram(tx, args.villageId, args.programId);
      if (!cur) return fail(404, "Program BLT tidak ditemukan.");
      if (cur.status !== "DITETAPKAN") return fail(409, "Penggantian hanya untuk program yang sudah ditetapkan dan belum selesai.");
      const old = await tx.bltBeneficiary.findFirst({ where: { id: args.id, programId: cur.id } });
      if (!old) return fail(404, "Penerima tidak ditemukan.");
      if (old.status !== "AKTIF") return fail(409, "Penerima ini sudah tidak aktif.");
      const m = await tx.villageMeeting.findFirst({ where: { id: v.meetingId, villageId: args.villageId, kind: "MUSDES_BLT_KHUSUS" }, select: { status: true } });
      if (!m) return fail(409, "Pilih Musyawarah Desa khusus penggantian penerima BLT.");
      if (!heldOrFinal(m.status)) return fail(409, "Musyawarah Desa khusus itu belum terlaksana.");
      const last = await tx.bltPayment.aggregate({ where: { beneficiaryId: old.id }, _max: { monthTo: true } });
      const startMonth = Math.max(old.startMonth, (last._max.monthTo ?? 0) + 1);
      let newId: number | null = null;
      if (v.replacement) {
        if (v.replacement.residentId === old.residentId) return fail(409, "Pengganti harus keluarga lain.");
        const sameKk = await tx.resident.findFirst({ where: { id: v.replacement.residentId, villageId: args.villageId, kk: { not: null } }, select: { kk: true } });
        if (sameKk?.kk && old.kk && sameKk.kk === old.kk) return fail(409, "Pengganti harus keluarga lain (Kartu Keluarga berbeda).");
        if (startMonth > cur.totalMonths) return fail(409, "Seluruh bulan program sudah dibayarkan kepada penerima ini; pengganti tidak diperlukan.");
        const data = await buildBeneficiary(tx, args.villageId, cur.id, v.replacement, old.id);
        const created = await tx.bltBeneficiary.create({ data: { ...data, programId: cur.id, villageId: args.villageId, startMonth, replacesId: old.id, decreeRef: v.decreeRef } });
        newId = created.id;
      }
      await tx.bltBeneficiary.update({ where: { id: old.id }, data: { status: v.replacement ? "DIGANTI" : "BERAKHIR", endedReason: v.reason, endedMeetingId: v.meetingId } });
      return ok({ id: newId });
    })
    .catch(asResult);
}

// ---- Pembayaran

export async function addPayment(db: PrismaClient, args: { villageId: number; programId: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<{ id: number; amount: string }>> {
  const p = parsePayment(args.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      const cur = await lockProgram(tx, args.villageId, args.programId);
      if (!cur) return fail(404, "Program BLT tidak ditemukan.");
      if (cur.status !== "DITETAPKAN") return fail(409, cur.status === "DRAFT" ? "Pembayaran baru dapat dicatat setelah Keputusan Kepala Desa terbit." : "Program sudah selesai.");
      const ben = await tx.bltBeneficiary.findFirst({ where: { id: v.beneficiaryId, programId: cur.id } });
      if (!ben) return fail(404, "Penerima tidak ditemukan.");
      if (ben.status !== "AKTIF") return fail(409, "Penerima ini sudah tidak aktif.");
      const n = v.monthTo - v.monthFrom + 1;
      const { rules } = rulesFor(cur.year);
      const tomorrow = new Date((args.now ?? new Date()).getTime() + 86_400_000).toISOString().slice(0, 10);
      if (v.paidOn.toISOString().slice(0, 10) > tomorrow) return invalid({ errors: ["Tanggal pembayaran tidak boleh di masa depan."], fieldErrors: { paidOn: "Tidak boleh di masa depan" } });
      if (n > rules.bltMaxMonthsAtOnce) return invalid({ errors: [`BLT dibayarkan paling banyak ${rules.bltMaxMonthsAtOnce} bulan sekaligus.`], fieldErrors: { monthTo: `Maksimal ${rules.bltMaxMonthsAtOnce} bulan sekaligus` } });
      if (v.monthTo > cur.totalMonths) return invalid({ errors: [`Program hanya ${cur.totalMonths} bulan.`], fieldErrors: { monthTo: `Program hanya ${cur.totalMonths} bulan` } });
      if (v.monthFrom < ben.startMonth) return invalid({ errors: [`Penerima ini berhak mulai bulan ke-${ben.startMonth}.`], fieldErrors: { monthFrom: `Mulai bulan ke-${ben.startMonth}` } });
      if (cur.decreeDate && v.paidOn < cur.decreeDate) return invalid({ errors: ["Tanggal pembayaran tidak boleh sebelum tanggal Keputusan Kepala Desa."], fieldErrors: { paidOn: "Sebelum tanggal Keputusan Kepala Desa" } });
      // Batas "sekaligus" berlaku per kesempatan pembayaran: bulan yang sudah dibayarkan pada tanggal yang sama ikut dihitung,
      // supaya pembayaran 12 bulan tidak bisa dipecah menjadi empat catatan 3 bulan.
      const sameDay = await tx.bltPayment.findMany({ where: { beneficiaryId: ben.id, paidOn: v.paidOn }, select: { monthFrom: true, monthTo: true } });
      const already = sameDay.reduce((t, x) => t + (x.monthTo - x.monthFrom + 1), 0);
      if (already + n > rules.bltMaxMonthsAtOnce) return invalid({ errors: [`Pada tanggal itu sudah dibayarkan ${already} bulan; BLT dibayarkan paling banyak ${rules.bltMaxMonthsAtOnce} bulan sekaligus.`], fieldErrors: { monthTo: `Maksimal ${rules.bltMaxMonthsAtOnce} bulan sekaligus` } });
      const overlap = await tx.bltPayment.findFirst({ where: { beneficiaryId: ben.id, monthFrom: { lte: v.monthTo }, monthTo: { gte: v.monthFrom } }, select: { monthFrom: true, monthTo: true } });
      if (overlap) return invalid({ errors: [`Bulan ke-${overlap.monthFrom}${overlap.monthTo !== overlap.monthFrom ? `–${overlap.monthTo}` : ""} sudah dibayarkan kepada penerima ini.`], fieldErrors: { monthFrom: "Bulan sudah dibayarkan" } });
      if ((await tx.bltPayment.count({ where: { beneficiaryId: ben.id } })) >= LIMITS.paymentsPerBeneficiary) return fail(409, "Jumlah catatan pembayaran melebihi batas.");
      const amountCents = cur.monthlyCents * BigInt(n);
      const row = await tx.bltPayment.create({ data: { programId: cur.id, villageId: args.villageId, beneficiaryId: ben.id, monthFrom: v.monthFrom, monthTo: v.monthTo, amountCents, method: v.method, paidOn: v.paidOn, receivedBy: v.receivedBy, note: v.note, createdById: args.userId } });
      return ok({ id: row.id, amount: fromCents(amountCents) });
    })
    .catch(asResult);
}

export async function voidPayment(db: PrismaClient, args: { villageId: number; programId: number; id: number }): Promise<Result<{ id: number; beneficiaryId: number; amount: string }>> {
  return db
    .$transaction(async (tx) => {
      const cur = await lockProgram(tx, args.villageId, args.programId);
      if (!cur) return fail(404, "Program BLT tidak ditemukan.");
      if (cur.status === "SELESAI") return fail(409, "Program sudah selesai; buka kembali untuk mengoreksi pembayaran.");
      const pay = await tx.bltPayment.findFirst({ where: { id: args.id, programId: cur.id } });
      if (!pay) return fail(404, "Pembayaran tidak ditemukan.");
      await tx.bltPayment.delete({ where: { id: pay.id } });
      return ok({ id: pay.id, beneficiaryId: pay.beneficiaryId, amount: fromCents(pay.amountCents) });
    })
    .catch(asResult);
}

// ---- Pencarian warga dan data cetak

export interface Candidate {
  id: number;
  name: string;
  kk: string | null;
  nikMasked: string | null;
  address: string;
  familyRole: string;
  occupation: string | null;
  alreadyIn: boolean;
  blocked: string | null;
}

export async function searchCandidates(db: Db, args: { villageId: number; programId: number; q: string }): Promise<Result<Candidate[]>> {
  const q = args.q.trim();
  if (q.length < 2) return ok([]);
  const prog = await db.bltProgram.findFirst({ where: { id: args.programId, villageId: args.villageId }, select: { id: true } });
  if (!prog) return fail(404, "Program BLT tidak ditemukan.");
  const rows = await db.resident.findMany({
    where: { villageId: args.villageId, OR: [{ name: { contains: q } }, { kk: { startsWith: q } }, { nik: { startsWith: q } }] },
    orderBy: { name: "asc" },
    take: LIMITS.residentSearch,
    select: { id: true, name: true, nik: true, kk: true, address: true, rt: true, rw: true, hamlet: true, familyRole: true, occupation: true, isAlive: true, moveDate: true },
  });
  const active = rows.length ? await db.bltBeneficiary.findMany({ where: { programId: prog.id, status: "AKTIF", OR: [{ residentId: { in: rows.map((r) => r.id) } }, { kk: { in: rows.map((r) => r.kk).filter((k): k is string => Boolean(k)) } }] }, select: { residentId: true, kk: true } }) : [];
  return ok(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      kk: maskKk(r.kk),
      nikMasked: maskNik(r.nik),
      address: [r.hamlet, r.rt && `RT ${r.rt}`, r.rw && `RW ${r.rw}`].filter(Boolean).join(", ") || r.address.slice(0, 80),
      familyRole: r.familyRole,
      occupation: r.occupation,
      alreadyIn: active.some((a) => a.residentId === r.id || (r.kk && a.kk === r.kk)),
      blocked: !r.isAlive ? "Tercatat meninggal" : r.moveDate ? "Tercatat pindah" : null,
    })),
  );
}

export interface PrintData {
  program: { id: number; year: number; title: string; monthly: string; totalMonths: number; status: string; decreeNumber: string | null; decreeDate: string | null; musdesTitle: string | null; musdesHeldOn: string | null };
  rows: { no: number; name: string; nik: string | null; kk: string | null; address: string; category: string; jobGroup: string; source: string; status: string; startMonth: number; paidMonths: string; paidAmount: string }[];
  byJobGroup: { jobGroup: string; count: number }[];
  byCategory: { category: string; count: number }[];
}

/** Data cetak SK/tanda terima. Memuat NIK lengkap, jadi hanya untuk peran dengan izin ekspor (dijaga di rute). */
export async function printData(db: Db, args: { villageId: number; id: number; includeEnded?: boolean }): Promise<Result<PrintData>> {
  const p = await db.bltProgram.findFirst({ where: { id: args.id, villageId: args.villageId }, include: { musdesMeeting: { select: { title: true, heldOn: true } }, beneficiaries: { where: args.includeEnded ? {} : { status: "AKTIF" }, orderBy: { id: "asc" }, include: { resident: { select: { nik: true, address: true, rt: true, rw: true, hamlet: true } }, payments: { select: { monthFrom: true, monthTo: true, amountCents: true }, orderBy: { monthFrom: "asc" } } } } } });
  if (!p) return fail(404, "Program BLT tidak ditemukan.");
  const rows = p.beneficiaries.map((b, i) => ({
    no: i + 1,
    name: b.name,
    nik: b.resident?.nik ?? null,
    kk: b.kk,
    address: b.resident ? [b.resident.address, b.resident.hamlet, b.resident.rt && `RT ${b.resident.rt}`, b.resident.rw && `RW ${b.resident.rw}`].filter(Boolean).join(", ") : "-",
    category: b.category,
    jobGroup: b.jobGroup,
    source: b.source,
    status: b.status,
    startMonth: b.startMonth,
    paidMonths: b.payments.map((x) => (x.monthFrom === x.monthTo ? String(x.monthFrom) : `${x.monthFrom}–${x.monthTo}`)).join(", ") || "-",
    paidAmount: fromCents(b.payments.reduce((t, x) => t + x.amountCents, 0n)),
  }));
  const tally = (key: "jobGroup" | "category") => [...rows.filter((r) => r.status === "AKTIF").reduce((m, r) => m.set(r[key], (m.get(r[key]) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]);
  return ok({
    program: { id: p.id, year: p.year, title: p.title, monthly: fromCents(p.monthlyCents), totalMonths: p.totalMonths, status: p.status, decreeNumber: p.decreeNumber, decreeDate: isoDay(p.decreeDate), musdesTitle: p.musdesMeeting?.title ?? null, musdesHeldOn: isoDay(p.musdesMeeting?.heldOn ?? null) },
    rows,
    byJobGroup: tally("jobGroup").map(([jobGroup, count]) => ({ jobGroup, count })),
    byCategory: tally("category").map(([category, count]) => ({ category, count })),
  });
}
