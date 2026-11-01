/**
 * Layanan BUM Desa inti (Paket 3): koreksi transaksi kas berjejak, jurnal berpasangan, laporan posisi keuangan dan laba rugi per unit
 * dan gabungan, penutupan periode semester, legalitas/pengurus, serta arus penyertaan modal dan bagi hasil dengan APB Desa.
 *
 * KUNCI: setiap penulisan memegang kunci baris `bumdes` (raw SELECT ... FOR UPDATE) sebagai pernyataan PERTAMA transaksi. Arus APB Desa
 * lalu mengambil kunci tahun APB Desa (apbdes_years). Urutan seragam: bumdes -> apbdes_years. Tidak ada alur yang mengunci dengan urutan
 * terbalik. Catatan APB Desa dibuat HANYA lewat createEntryInTx/deleteEntryInTx (Buku Kas Umum), tidak menulis apbdes_entries sendiri.
 */
import { Prisma, type PrismaClient } from "@prisma/client";
import { fail, invalid, isoDay, type Result } from "@/lib/form-input";
import { fromCents } from "@/lib/coop/loan-math";
import { activeDocument, budgetMap, createEntryInTx, deleteEntryInTx, ensureYear, loadEntries, lockYear, rollbackToResult } from "@/lib/apbdes/service";
import { parseEntryInput } from "@/lib/apbdes/schema";
import {
  ACCOUNTS,
  APBDES_CAPITAL_ACCOUNT,
  APBDES_PROFIT_SHARE_ACCOUNT,
  ANNUAL_MUSDES_MONTHS,
  CAPITAL_DISBURSE_MONTHS,
  EQUITY_VILLAGE_CAPITAL,
  EQUITY_VILLAGE_PROFIT_SHARE,
  FLOW_KIND,
  FLOW_MEETING_KIND,
  JOURNAL_SOURCE,
  LIMITS,
  OFFICER_ROLE,
  PERIOD_KIND,
  REGISTRATION_WORKDAYS,
  TERM_YEARS,
  accountName,
  type JournalSource,
  type PeriodKind,
} from "./catalog";
import {
  buildReport,
  cashJournalLines,
  checkLines,
  halfEnded,
  halvesOf,
  periodOfDate,
  reservedAccountViolation,
  rangeOf,
  totalsOf,
  voucherNumber,
  type BalanceRow,
  type Half,
  type JLine,
  type Report,
  type Section,
  type Statements,
} from "./calc";
import { parseCash, parseFlow, parseJournal, parseLegal, parseOfficer, parseReason, parsePeriodAction, parseResolution, type CashInput } from "./schema";

type Db = Prisma.TransactionClient;
const ok = <T>(data: T): { ok: true; data: T } => ({ ok: true, data });
class Stop extends Error {}
const stop = (msg: string): never => {
  throw new Stop(msg);
};
function asResult(e: unknown): Result<never> {
  if (e instanceof Stop) return fail(409, e.message);
  return rollbackToResult(e);
}
const TX = { timeout: 20_000, maxWait: 10_000 } as const;
const rp = (c: bigint): string => `Rp${new Intl.NumberFormat("id-ID").format(c / 100n)}`;
const iso = (d: Date): string => d.toISOString().slice(0, 10);
const dayOf = (s: string): Date => new Date(`${s}T00:00:00.000Z`);
const centsOfDecimal = (d: Prisma.Decimal | number | string): bigint => {
  const s = new Prisma.Decimal(d).toFixed(2);
  const neg = s.startsWith("-");
  const [i, f] = (neg ? s.slice(1) : s).split(".");
  const v = BigInt(i!) * 100n + BigInt(f ?? "0");
  return neg ? -v : v;
};
const decimalOfCents = (c: bigint): string => fromCents(c);

/** Kunci baris BUMDes. HARUS pernyataan pertama dalam transaksi interaktif (MySQL REPEATABLE READ). */
export async function lockBumdes(tx: Db, bumdesId: number): Promise<void> {
  const rows = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM bumdes WHERE id = ${bumdesId} FOR UPDATE`;
  if (!rows.length) stop("BUMDes tidak ditemukan.");
}

// ============================================================================================================================
// Periode
// ============================================================================================================================

const closedMessage = (year: number, half: Half): string => `${half === 1 ? "Semester I" : "Semester II"} ${year} sudah ditutup. Buka kembali periodenya dengan alasan bila ada koreksi.`;

async function assertOpen(tx: Db, bumdesId: number, date: Date | string): Promise<void> {
  const { year, half } = periodOfDate(typeof date === "string" ? date : iso(date));
  const c = await tx.bumdesPeriodClose.findUnique({ where: { bumdesId_year_half: { bumdesId, year, half } }, select: { id: true } });
  if (c) stop(closedMessage(year, half));
}

export interface PeriodView {
  year: number;
  half: Half;
  label: string;
  state: "BUKA" | "DITUTUP";
  closedAt: string | null;
  profit: string | null;
  assets: string | null;
  /** Alasan tombol Tutup tidak berlaku (null = boleh ditutup) */
  closeBlocker: string | null;
  canReopen: boolean;
}
export interface PeriodsOverview {
  year: number;
  periods: PeriodView[];
  /** Pengingat tenggat laporan (informasi, bukan penghalang) */
  reminders: { level: "WARN" | "INFO"; message: string; ref: string }[];
  log: { id: number; year: number; half: number; action: string; reason: string | null; at: string }[];
}

/** Transaksi kas aktif dalam rentang yang belum punya jurnal aktif (laporan keuangan menjadi tidak lengkap). */
async function unjournaledCount(db: Db, bumdesId: number, from: string, to: string): Promise<number> {
  return db.bumdesTransaction.count({ where: { bumdesId, status: "AKTIF", entryDate: { gte: dayOf(from), lte: dayOf(to) }, journals: { none: { status: "AKTIF" } } } });
}

/** Semester I hanya dapat ditutup bila semester II tahun sebelumnya sudah ditutup, kalau tahun itu punya jurnal. */
async function prevYearBlocker(db: Db, bumdesId: number, year: number): Promise<string | null> {
  const n = await db.bumdesJournal.count({ where: { bumdesId, year: year - 1, status: "AKTIF" } });
  if (n === 0) return null;
  const s2 = await db.bumdesPeriodClose.findUnique({ where: { bumdesId_year_half: { bumdesId, year: year - 1, half: 2 } }, select: { id: true } });
  return s2 ? null : `Tutup Semester II ${year - 1} lebih dulu (tahun itu memiliki jurnal).`;
}

/** Penutupan pada periode yang lebih akhir (lintas tahun) yang menghalangi pembukaan kembali. */
async function laterClose(db: Db, bumdesId: number, year: number, half: number): Promise<{ year: number; half: number } | null> {
  return db.bumdesPeriodClose.findFirst({ where: { bumdesId, OR: [{ year: { gt: year } }, { year, half: { gt: half } }] }, orderBy: [{ year: "asc" }, { half: "asc" }], select: { year: true, half: true } });
}

export async function getPeriods(db: Db, bumdesId: number, year: number, now: Date): Promise<Result<PeriodsOverview>> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return fail(400, "Tahun tidak valid.");
  const [closes, log] = await Promise.all([
    db.bumdesPeriodClose.findMany({ where: { bumdesId, year } }),
    db.bumdesPeriodLog.findMany({ where: { bumdesId, year }, orderBy: { id: "desc" }, take: 30 }),
  ]);
  const periods: PeriodView[] = [];
  for (const half of [1, 2] as Half[]) {
    const c = closes.find((x) => x.half === half);
    let blocker: string | null = null;
    if (!c) {
      if (!halfEnded(year, half, now)) blocker = `${half === 1 ? "Semester I" : "Semester II"} belum berakhir.`;
      else if (half === 2 && !closes.some((x) => x.half === 1)) blocker = "Tutup Semester I lebih dulu.";
      else if (half === 1 && (await prevYearBlocker(db, bumdesId, year))) blocker = await prevYearBlocker(db, bumdesId, year);
      else {
        const r = rangeOf(year, half === 1 ? "S1" : "S2");
        const n = await unjournaledCount(db, bumdesId, r.start, r.end);
        if (n > 0) blocker = `${n} transaksi kas belum berjurnal. Susun jurnalnya dulu (tab Transaksi kas).`;
      }
    }
    const later = Boolean(c) && (await laterClose(db, bumdesId, year, half)) !== null;
    periods.push({
      year,
      half,
      label: `${half === 1 ? "Semester I (Januari-Juni)" : "Semester II (Juli-Desember)"} ${year}`,
      state: c ? "DITUTUP" : "BUKA",
      closedAt: c?.closedAt.toISOString() ?? null,
      profit: c ? fromCents(c.profitCents) : null,
      assets: c ? fromCents(c.assetCents) : null,
      closeBlocker: c ? null : blocker,
      canReopen: Boolean(c) && !later,
    });
  }
  const reminders: PeriodsOverview["reminders"] = [];
  const yearEnded = halfEnded(year, 2, now);
  if (yearEnded) {
    const deadline = `${year + 1}-${String(ANNUAL_MUSDES_MONTHS).padStart(2, "0")}-30`;
    const today = iso(now);
    reminders.push({
      level: today > deadline ? "WARN" : "INFO",
      message: `Laporan tahunan ${year} disampaikan kepada Musyawarah Desa tahunan paling lama ${ANNUAL_MUSDES_MONTHS} bulan setelah tahun buku berakhir (sekitar ${deadline}), setelah ditelaah penasihat dan pengawas. Musyawarah Desa itu memutuskan penerimaan laporan dan penggunaan bagian hasil usaha untuk Desa.`,
      ref: "PP 11/2021 Pasal 19 ayat 3, Pasal 58 ayat 5, Pasal 59 ayat 2",
    });
  }
  return ok({ year, periods, reminders, log: log.map((l) => ({ id: l.id, year: l.year, half: l.half, action: l.action, reason: l.reason, at: l.createdAt.toISOString() })) });
}

export async function actOnPeriod(db: PrismaClient, args: { bumdesId: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<PeriodsOverview>> {
  const p = parsePeriodAction(args.input);
  if (!p.ok) return invalid(p);
  const { year, half, action, reason } = p.value;
  const now = args.now ?? new Date();
  const r = await db
    .$transaction(async (tx) => {
      await lockBumdes(tx, args.bumdesId);
      const cur = await tx.bumdesPeriodClose.findUnique({ where: { bumdesId_year_half: { bumdesId: args.bumdesId, year, half } } });
      const label = `${half === 1 ? "Semester I" : "Semester II"} ${year}`;
      if (action === "tutup") {
        if (cur) return fail(409, `${label} sudah ditutup.`);
        if (!halfEnded(year, half, now)) return fail(409, `${label} belum berakhir; periode baru dapat ditutup setelah berakhir.`);
        if (half === 2) {
          const s1 = await tx.bumdesPeriodClose.findUnique({ where: { bumdesId_year_half: { bumdesId: args.bumdesId, year, half: 1 } }, select: { id: true } });
          if (!s1) return fail(409, "Tutup Semester I lebih dulu.");
        } else {
          const prev = await prevYearBlocker(tx, args.bumdesId, year);
          if (prev) return fail(409, prev);
        }
        const range = rangeOf(year, half === 1 ? "S1" : "S2");
        const missing = await unjournaledCount(tx, args.bumdesId, range.start, range.end);
        if (missing > 0) return fail(409, `${missing} transaksi kas pada ${label} belum berjurnal. Susun jurnalnya dulu supaya laporan lengkap.`);
        const rep = await reportInTx(tx, args.bumdesId, year, half === 1 ? "S1" : "S2");
        const bad = rep.entities.find((e) => !e.neraca.balanced);
        if (bad || rep.elimination.residual !== 0n) return fail(409, bad ? `Neraca ${bad.name} belum seimbang (selisih ${rp(bad.neraca.difference < 0n ? -bad.neraca.difference : bad.neraca.difference)}). Periksa jurnal sebelum menutup.` : `Akun RK Pusat dan RK Unit usaha belum saling meniadakan (selisih ${rp(rep.elimination.residual < 0n ? -rep.elimination.residual : rep.elimination.residual)}). Periksa jurnal antar-unit sebelum menutup.`);
        await tx.bumdesPeriodClose.create({ data: { bumdesId: args.bumdesId, year, half, closedById: args.userId, profitCents: rep.consolidated.labaRugi.labaBersih, assetCents: rep.consolidated.neraca.totalAset } });
        await tx.bumdesPeriodLog.create({ data: { bumdesId: args.bumdesId, year, half, action: "TUTUP", byUserId: args.userId } });
      } else {
        if (!cur) return fail(409, `${label} belum ditutup.`);
        const later = await laterClose(tx, args.bumdesId, year, half);
        if (later) return fail(409, `Buka kembali ${later.half === 1 ? "Semester I" : "Semester II"} ${later.year} lebih dulu.`);
        await tx.bumdesPeriodClose.delete({ where: { id: cur.id } });
        await tx.bumdesPeriodLog.create({ data: { bumdesId: args.bumdesId, year, half, action: "BUKA", reason, byUserId: args.userId } });
      }
      return ok(true);
    }, TX)
    .catch(asResult);
  if (!r.ok) return r;
  return getPeriods(db, args.bumdesId, year, now);
}

// ============================================================================================================================
// Jurnal
// ============================================================================================================================

export interface JournalLineView {
  lineNo: number;
  accountCode: string;
  accountName: string;
  debit: string;
  credit: string;
  memo: string | null;
}
export interface JournalView {
  id: number;
  entryDate: string;
  voucherNo: string;
  description: string;
  reference: string | null;
  source: string;
  sourceLabel: string;
  unitId: number | null;
  unitName: string;
  transactionId: number | null;
  correctsId: number | null;
  status: string;
  voidReason: string | null;
  voidedAt: string | null;
  total: string;
  lines: JournalLineView[];
  /** Dapat dikoreksi/dibatalkan langsung dari daftar jurnal (hanya jurnal manual yang aktif) */
  editable: boolean;
}

type JournalRow = Prisma.BumdesJournalGetPayload<{ include: { lines: true } }>;
const journalView = (j: JournalRow, unitNames: Map<number, string>): JournalView => ({
  id: j.id,
  entryDate: iso(j.entryDate),
  voucherNo: j.voucherNo,
  description: j.description,
  reference: j.reference,
  source: j.source,
  sourceLabel: JOURNAL_SOURCE[j.source as JournalSource] ?? j.source,
  unitId: j.unitId,
  unitName: j.unitId === null ? "Kantor Pusat" : (unitNames.get(j.unitId) ?? `Unit #${j.unitId}`),
  transactionId: j.transactionId,
  correctsId: j.correctsId,
  status: j.status,
  voidReason: j.voidReason,
  voidedAt: j.voidedAt?.toISOString() ?? null,
  total: fromCents(j.totalDebitCents),
  lines: [...j.lines].sort((a, b) => a.lineNo - b.lineNo).map((l) => ({ lineNo: l.lineNo, accountCode: l.accountCode, accountName: accountName(l.accountCode), debit: fromCents(l.debitCents), credit: fromCents(l.creditCents), memo: l.memo })),
  editable: (j.source === "MANUAL" || j.source === "SALDO_AWAL") && j.status === "AKTIF",
});

interface NewJournal {
  bumdesId: number;
  unitId: number | null;
  entryDate: Date;
  description: string;
  reference?: string | null;
  source: JournalSource;
  transactionId?: number | null;
  correctsId?: number | null;
  lines: JLine[];
  userId: number | null;
}

/** Menulis jurnal di dalam transaksi pemanggil (kunci BUMDes sudah dipegang). Melempar Stop bila periode tertutup atau jurnal tak sah. */
async function createJournalInTx(tx: Db, j: NewJournal): Promise<{ id: number; voucherNo: string }> {
  const errs = checkLines(j.lines);
  if (errs.length) stop(errs[0]!);
  const reserved = reservedAccountViolation(j.source, j.lines);
  if (reserved) stop(reserved);
  if (j.source === "SALDO_AWAL" && j.unitId !== null) stop("Jurnal pembukaan dicatat pada Kantor Pusat.");
  if (j.unitId !== null) {
    const unit = await tx.bumdesUnit.findFirst({ where: { id: j.unitId, bumdesId: j.bumdesId }, select: { id: true } });
    if (!unit) stop("Unit usaha tidak ditemukan.");
  }
  await assertOpen(tx, j.bumdesId, j.entryDate);
  const year = j.entryDate.getUTCFullYear();
  const agg = await tx.bumdesJournal.aggregate({ where: { bumdesId: j.bumdesId, year }, _max: { seq: true }, _count: { _all: true } });
  if (agg._count._all >= LIMITS.journalsPerYear) stop(`Satu tahun maksimal ${LIMITS.journalsPerYear} jurnal.`);
  const seq = (agg._max.seq ?? 0) + 1;
  const voucherNo = voucherNumber(seq, iso(j.entryDate), j.unitId);
  const { debit, credit } = totalsOf(j.lines);
  const row = await tx.bumdesJournal.create({
    data: {
      bumdesId: j.bumdesId,
      unitId: j.unitId,
      entryDate: j.entryDate,
      year,
      seq,
      voucherNo,
      description: j.description.slice(0, 300),
      reference: j.reference ?? null,
      source: j.source,
      transactionId: j.transactionId ?? null,
      correctsId: j.correctsId ?? null,
      totalDebitCents: debit,
      totalCreditCents: credit,
      createdById: j.userId,
      lines: { create: j.lines.map((l, i) => ({ lineNo: i + 1, accountCode: l.accountCode, debitCents: l.debitCents, creditCents: l.creditCents, memo: l.memo })) },
    },
    select: { id: true },
  });
  return { id: row.id, voucherNo };
}

/** Membatalkan jurnal (status DIBATALKAN; baris tetap ada). Periode tanggal jurnal harus terbuka. */
async function voidJournalInTx(tx: Db, args: { bumdesId: number; journalId: number; userId: number | null; reason: string; now: Date }): Promise<void> {
  const cur = await tx.bumdesJournal.findFirst({ where: { id: args.journalId, bumdesId: args.bumdesId }, select: { id: true, entryDate: true, status: true } });
  if (!cur) stop("Jurnal tidak ditemukan.");
  if (cur!.status !== "AKTIF") return;
  await assertOpen(tx, args.bumdesId, cur!.entryDate);
  await tx.bumdesJournal.update({ where: { id: args.journalId }, data: { status: "DIBATALKAN", voidedAt: args.now, voidedById: args.userId, voidReason: args.reason.slice(0, 300) } });
}

export async function createManualJournal(db: PrismaClient, args: { bumdesId: number; userId: number | null; input: unknown; now?: Date; cap?: number | null }): Promise<Result<{ id: number; voucherNo: string }>> {
  const now = args.now ?? new Date();
  const p = parseJournal(args.input, now);
  if (!p.ok) return invalid(p);
  return db
    .$transaction(async (tx) => {
      await lockBumdes(tx, args.bumdesId);
      if (args.cap !== null && args.cap !== undefined) {
        const n = await tx.bumdesJournal.count({ where: { bumdesId: args.bumdesId, source: { in: ["MANUAL", "SALDO_AWAL"] } } });
        if (n >= args.cap) return fail(402, "RESOURCE_LIMIT_REACHED");
      }
      const j = await createJournalInTx(tx, { bumdesId: args.bumdesId, ...p.value, source: p.value.opening ? "SALDO_AWAL" : "MANUAL", userId: args.userId });
      return ok(j);
    }, TX)
    .catch(asResult);
}

/** Koreksi jurnal manual: jurnal lama dibatalkan dan diganti jurnal baru (tertaut correctsId). Keduanya tersimpan. */
export async function correctManualJournal(db: PrismaClient, args: { bumdesId: number; journalId: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<{ id: number; voucherNo: string }>> {
  const now = args.now ?? new Date();
  const reason = parseReason(args.input);
  if (!reason.ok) return invalid(reason);
  return db
    .$transaction(async (tx) => {
      await lockBumdes(tx, args.bumdesId);
      const cur = await tx.bumdesJournal.findFirst({ where: { id: args.journalId, bumdesId: args.bumdesId }, select: { id: true, source: true, status: true } });
      if (!cur) return fail(404, "Jurnal tidak ditemukan.");
      if (cur.source !== "MANUAL" && cur.source !== "SALDO_AWAL") return fail(409, "Jurnal ini berasal dari transaksi kas atau arus APB Desa. Koreksi lewat sumbernya.");
      if (cur.status !== "AKTIF") return fail(409, "Jurnal ini sudah dibatalkan.");
      // Sumber jurnal pengganti sama dengan jurnal asal: jurnal biasa tak bisa "naik" menjadi jurnal pembukaan lewat koreksi.
      const p = parseJournal({ ...(args.input as Record<string, unknown>), opening: cur.source === "SALDO_AWAL" }, now);
      if (!p.ok) return invalid(p);
      await voidJournalInTx(tx, { bumdesId: args.bumdesId, journalId: cur.id, userId: args.userId, reason: `Dikoreksi: ${reason.value.reason}`, now });
      const j = await createJournalInTx(tx, { bumdesId: args.bumdesId, ...p.value, source: cur.source, correctsId: cur.id, userId: args.userId });
      return ok(j);
    }, TX)
    .catch(asResult);
}

export async function voidManualJournal(db: PrismaClient, args: { bumdesId: number; journalId: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<{ id: number }>> {
  const reason = parseReason(args.input);
  if (!reason.ok) return invalid(reason);
  return db
    .$transaction(async (tx) => {
      await lockBumdes(tx, args.bumdesId);
      const cur = await tx.bumdesJournal.findFirst({ where: { id: args.journalId, bumdesId: args.bumdesId }, select: { id: true, source: true, status: true } });
      if (!cur) return fail(404, "Jurnal tidak ditemukan.");
      if (cur.source !== "MANUAL" && cur.source !== "SALDO_AWAL") return fail(409, "Jurnal ini berasal dari transaksi kas atau arus APB Desa. Batalkan lewat sumbernya.");
      if (cur.status !== "AKTIF") return fail(409, "Jurnal ini sudah dibatalkan.");
      await voidJournalInTx(tx, { bumdesId: args.bumdesId, journalId: cur.id, userId: args.userId, reason: reason.value.reason, now: args.now ?? new Date() });
      return ok({ id: cur.id });
    }, TX)
    .catch(asResult);
}

export interface JournalFilter {
  from?: string | null;
  to?: string | null;
  unitId?: number | "PUSAT" | null;
  source?: string | null;
  status?: string | null;
  page: number;
  pageSize: number;
}

export async function listJournals(db: Db, bumdesId: number, f: JournalFilter): Promise<{ items: JournalView[]; total: number; page: number; pageSize: number }> {
  const where: Prisma.BumdesJournalWhereInput = { bumdesId };
  if (f.from || f.to) where.entryDate = { ...(f.from ? { gte: dayOf(f.from) } : {}), ...(f.to ? { lte: dayOf(f.to) } : {}) };
  if (f.unitId === "PUSAT") where.unitId = null;
  else if (typeof f.unitId === "number") where.unitId = f.unitId;
  if (f.source && f.source in JOURNAL_SOURCE) where.source = f.source;
  if (f.status === "AKTIF" || f.status === "DIBATALKAN") where.status = f.status;
  const [total, rows, units] = await Promise.all([
    db.bumdesJournal.count({ where }),
    db.bumdesJournal.findMany({ where, include: { lines: true }, orderBy: [{ entryDate: "desc" }, { id: "desc" }], skip: (f.page - 1) * f.pageSize, take: f.pageSize }),
    db.bumdesUnit.findMany({ where: { bumdesId }, select: { id: true, name: true }, take: 500 }),
  ]);
  const names = new Map(units.map((u) => [u.id, u.name]));
  return { items: rows.map((r) => journalView(r, names)), total, page: f.page, pageSize: f.pageSize };
}

// ============================================================================================================================
// Transaksi kas: tambah, ubah, batalkan (berjejak), dan penyusunan jurnal untuk data lama
// ============================================================================================================================

type TxRow = Prisma.BumdesTransactionGetPayload<object>;
const snapshotOf = (t: TxRow) => ({
  entryDate: iso(t.entryDate),
  direction: t.direction,
  amount: new Prisma.Decimal(t.amount).toFixed(2),
  category: t.category,
  description: t.description,
  unitId: t.unitId,
  accountCode: t.accountCode,
  cashAccountCode: t.cashAccountCode,
  status: t.status,
});

function cashMemo(category: string): string {
  return `Transaksi kas: ${category}`.slice(0, 200);
}

export async function createCashTransaction(db: PrismaClient, args: { bumdesId: number; userId: number; input: unknown; now?: Date }): Promise<Result<{ id: number; journalId: number }>> {
  const now = args.now ?? new Date();
  const p = parseCash(args.input, now);
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      await lockBumdes(tx, args.bumdesId);
      const unit = await tx.bumdesUnit.findFirst({ where: { id: v.unitId, bumdesId: args.bumdesId }, select: { id: true } });
      if (!unit) return fail(404, "Unit tidak ditemukan.");
      await assertOpen(tx, args.bumdesId, v.entryDate);
      const row = await tx.bumdesTransaction.create({
        data: { bumdesId: args.bumdesId, unitId: v.unitId, entryDate: v.entryDate, direction: v.direction, amount: decimalOfCents(v.amountCents), category: v.category, description: v.description, accountCode: v.accountCode, cashAccountCode: v.cashAccountCode, createdBy: args.userId },
        select: { id: true },
      });
      const j = await createJournalInTx(tx, { bumdesId: args.bumdesId, unitId: v.unitId, entryDate: v.entryDate, description: cashMemo(v.category), source: "KAS", transactionId: row.id, lines: cashJournalLines({ direction: v.direction, amountCents: v.amountCents, cashAccount: v.cashAccountCode, counterAccount: v.accountCode, memo: v.description?.slice(0, 200) ?? null }), userId: args.userId });
      return ok({ id: row.id, journalId: j.id });
    }, TX)
    .catch(asResult);
}

const sameCash = (cur: TxRow, v: CashInput): boolean =>
  cur.unitId === v.unitId &&
  iso(cur.entryDate) === iso(v.entryDate) &&
  cur.direction === v.direction &&
  centsOfDecimal(cur.amount) === v.amountCents &&
  cur.category === v.category &&
  (cur.description ?? null) === (v.description ?? null) &&
  cur.accountCode === v.accountCode &&
  cur.cashAccountCode === v.cashAccountCode;

/** Mengubah transaksi kas dengan alasan. Isi lama disimpan di riwayat; jurnal lama dibatalkan dan diganti jurnal baru. */
export async function updateCashTransaction(db: PrismaClient, args: { bumdesId: number; id: number; userId: number; input: unknown; now?: Date }): Promise<Result<{ id: number; revision: number }>> {
  const now = args.now ?? new Date();
  const reason = parseReason(args.input);
  if (!reason.ok) return invalid(reason);
  return db
    .$transaction(async (tx) => {
      await lockBumdes(tx, args.bumdesId);
      const cur = await tx.bumdesTransaction.findFirst({ where: { id: args.id, bumdesId: args.bumdesId } });
      if (!cur) return fail(404, "Transaksi tidak ditemukan.");
      if (cur.status !== "AKTIF") return fail(409, "Transaksi ini sudah dibatalkan dan tidak dapat diubah.");
      const p = parseCash(args.input, now, { unitId: cur.unitId, entryDate: iso(cur.entryDate), direction: cur.direction as "income" | "expense", amountCents: centsOfDecimal(cur.amount), category: cur.category, description: cur.description, accountCode: cur.accountCode ?? undefined, cashAccountCode: cur.cashAccountCode ?? undefined });
      if (!p.ok) return invalid(p);
      const v = p.value;
      if (sameCash(cur, v)) return fail(400, "Tidak ada yang berubah. Ubah minimal satu isian.");
      const unit = await tx.bumdesUnit.findFirst({ where: { id: v.unitId, bumdesId: args.bumdesId }, select: { id: true } });
      if (!unit) return fail(404, "Unit tidak ditemukan.");
      await assertOpen(tx, args.bumdesId, cur.entryDate);
      await assertOpen(tx, args.bumdesId, v.entryDate);
      const revision = cur.revision + 1;
      const after = await tx.bumdesTransaction.update({
        where: { id: cur.id },
        data: { unitId: v.unitId, entryDate: v.entryDate, direction: v.direction, amount: decimalOfCents(v.amountCents), category: v.category, description: v.description, accountCode: v.accountCode, cashAccountCode: v.cashAccountCode, revision },
      });
      await tx.bumdesTransactionRevision.create({ data: { transactionId: cur.id, revision, action: "UBAH", reason: reason.value.reason, before: snapshotOf(cur), after: snapshotOf(after), byUserId: args.userId } });
      const olds = await tx.bumdesJournal.findMany({ where: { transactionId: cur.id, status: "AKTIF" }, select: { id: true } });
      for (const o of olds) await voidJournalInTx(tx, { bumdesId: args.bumdesId, journalId: o.id, userId: args.userId, reason: `Koreksi transaksi kas revisi ${revision}: ${reason.value.reason}`, now });
      await createJournalInTx(tx, { bumdesId: args.bumdesId, unitId: v.unitId, entryDate: v.entryDate, description: cashMemo(v.category), source: "KAS", transactionId: cur.id, correctsId: olds[0]?.id ?? null, lines: cashJournalLines({ direction: v.direction, amountCents: v.amountCents, cashAccount: v.cashAccountCode, counterAccount: v.accountCode, memo: v.description?.slice(0, 200) ?? null }), userId: args.userId });
      return ok({ id: cur.id, revision });
    }, TX)
    .catch(asResult);
}

/** Membatalkan transaksi kas (baris dan riwayat tetap ada). Jurnal turunannya ikut dibatalkan. */
export async function voidCashTransaction(db: PrismaClient, args: { bumdesId: number; id: number; userId: number; input: unknown; now?: Date }): Promise<Result<{ id: number; revision: number }>> {
  const now = args.now ?? new Date();
  const reason = parseReason(args.input);
  if (!reason.ok) return invalid(reason);
  return db
    .$transaction(async (tx) => {
      await lockBumdes(tx, args.bumdesId);
      const cur = await tx.bumdesTransaction.findFirst({ where: { id: args.id, bumdesId: args.bumdesId } });
      if (!cur) return fail(404, "Transaksi tidak ditemukan.");
      if (cur.status !== "AKTIF") return fail(409, "Transaksi ini sudah dibatalkan.");
      await assertOpen(tx, args.bumdesId, cur.entryDate);
      const revision = cur.revision + 1;
      const after = await tx.bumdesTransaction.update({ where: { id: cur.id }, data: { status: "DIBATALKAN", voidedAt: now, voidedById: args.userId, voidReason: reason.value.reason, revision } });
      await tx.bumdesTransactionRevision.create({ data: { transactionId: cur.id, revision, action: "BATAL", reason: reason.value.reason, before: snapshotOf(cur), after: snapshotOf(after), byUserId: args.userId } });
      const olds = await tx.bumdesJournal.findMany({ where: { transactionId: cur.id, status: "AKTIF" }, select: { id: true } });
      for (const o of olds) await voidJournalInTx(tx, { bumdesId: args.bumdesId, journalId: o.id, userId: args.userId, reason: `Transaksi kas dibatalkan: ${reason.value.reason}`, now });
      return ok({ id: cur.id, revision });
    }, TX)
    .catch(asResult);
}

export async function transactionHistory(db: Db, bumdesId: number, id: number): Promise<Result<{ id: number; revisions: { revision: number; action: string; reason: string; before: unknown; after: unknown; at: string; byUserId: number | null }[] }>> {
  const t = await db.bumdesTransaction.findFirst({ where: { id, bumdesId }, select: { id: true } });
  if (!t) return fail(404, "Transaksi tidak ditemukan.");
  const rows = await db.bumdesTransactionRevision.findMany({ where: { transactionId: id }, orderBy: { revision: "asc" }, take: 200 });
  return ok({ id, revisions: rows.map((r) => ({ revision: r.revision, action: r.action, reason: r.reason, before: r.before, after: r.after, at: r.createdAt.toISOString(), byUserId: r.byUserId })) });
}

/** Menyusun jurnal untuk transaksi kas lama yang belum berjurnal, memakai akun bawaan (akun lawan umum). Bertahap, 200 per panggilan. */
export async function journalizeLegacy(db: PrismaClient, args: { bumdesId: number; userId: number }): Promise<Result<{ created: number; skippedClosed: number; remaining: number }>> {
  return db
    .$transaction(async (tx) => {
      await lockBumdes(tx, args.bumdesId);
      const rows = await tx.bumdesTransaction.findMany({ where: { bumdesId: args.bumdesId, status: "AKTIF", journals: { none: { status: "AKTIF" } } }, orderBy: [{ entryDate: "asc" }, { id: "asc" }], take: 200 });
      let created = 0;
      let skippedClosed = 0;
      for (const t of rows) {
        const { year, half } = periodOfDate(iso(t.entryDate));
        const closed = await tx.bumdesPeriodClose.findUnique({ where: { bumdesId_year_half: { bumdesId: args.bumdesId, year, half } }, select: { id: true } });
        if (closed) {
          skippedClosed += 1;
          continue;
        }
        const direction = t.direction === "expense" ? "expense" : "income";
        const cash = t.cashAccountCode ?? "1.1.01.01";
        const counter = t.accountCode ?? (direction === "expense" ? "6.2.99.99" : "4.1.05.99");
        const amountCents = centsOfDecimal(t.amount);
        if (amountCents <= 0n) {
          skippedClosed += 1;
          continue;
        }
        await createJournalInTx(tx, { bumdesId: args.bumdesId, unitId: t.unitId, entryDate: t.entryDate, description: cashMemo(t.category), source: "KAS", transactionId: t.id, lines: cashJournalLines({ direction, amountCents, cashAccount: cash, counterAccount: counter, memo: t.description?.slice(0, 200) ?? null }), userId: args.userId });
        if (t.accountCode === null || t.cashAccountCode === null) await tx.bumdesTransaction.update({ where: { id: t.id }, data: { accountCode: counter, cashAccountCode: cash } });
        created += 1;
      }
      const remaining = await tx.bumdesTransaction.count({ where: { bumdesId: args.bumdesId, status: "AKTIF", journals: { none: { status: "AKTIF" } } } });
      return ok({ created, skippedClosed, remaining: Math.max(0, remaining - 0) });
    }, TX)
    .catch(asResult);
}

export async function legacyCount(db: Db, bumdesId: number): Promise<number> {
  return db.bumdesTransaction.count({ where: { bumdesId, status: "AKTIF", journals: { none: { status: "AKTIF" } } } });
}

// ============================================================================================================================
// Laporan
// ============================================================================================================================

async function balanceRows(db: Db, bumdesId: number, range: ReturnType<typeof rangeOf>): Promise<BalanceRow[]> {
  const ys = range.yearStart;
  const ps = range.start;
  const pe = range.end;
  const rows = await db.$queryRaw<{ unitId: number | null; accountCode: string; prior: bigint; ytdBefore: bigint; inPeriod: bigint }[]>`
    SELECT j.unitId AS unitId, l.accountCode AS accountCode,
      CAST(COALESCE(SUM(CASE WHEN j.entryDate < ${ys} THEN l.debitCents - l.creditCents ELSE 0 END), 0) AS SIGNED) AS prior,
      CAST(COALESCE(SUM(CASE WHEN j.entryDate >= ${ys} AND j.entryDate < ${ps} THEN l.debitCents - l.creditCents ELSE 0 END), 0) AS SIGNED) AS ytdBefore,
      CAST(COALESCE(SUM(CASE WHEN j.entryDate >= ${ps} AND j.entryDate <= ${pe} THEN l.debitCents - l.creditCents ELSE 0 END), 0) AS SIGNED) AS inPeriod
    FROM bumdes_journal_lines l
    INNER JOIN bumdes_journals j ON j.id = l.journalId
    WHERE j.bumdesId = ${bumdesId} AND j.status = 'AKTIF' AND j.entryDate <= ${pe}
    GROUP BY j.unitId, l.accountCode`;
  return rows.map((r) => ({ unitId: r.unitId === null ? null : Number(r.unitId), accountCode: r.accountCode, prior: BigInt(r.prior), ytdBefore: BigInt(r.ytdBefore), inPeriod: BigInt(r.inPeriod) }));
}

/** Laporan di dalam transaksi/penjelajahan pemanggil. */
export async function reportInTx(db: Db, bumdesId: number, year: number, kind: PeriodKind): Promise<Report> {
  const range = rangeOf(year, kind);
  const [units, rows] = await Promise.all([db.bumdesUnit.findMany({ where: { bumdesId }, orderBy: { name: "asc" }, select: { id: true, name: true }, take: 500 }), balanceRows(db, bumdesId, range)]);
  const entities = [{ unitId: null as number | null, name: "Kantor Pusat" }, ...units.map((u) => ({ unitId: u.id as number | null, name: u.name }))];
  return buildReport({ range, entities, rows });
}

export interface SectionView {
  label: string;
  lines: { code: string; name: string; amount: string }[];
  total: string;
}
export interface StatementsView {
  unitId: number | null;
  name: string;
  empty: boolean;
  neraca: { asOf: string; aset: SectionView; kewajiban: SectionView; ekuitas: SectionView; totalAset: string; totalKewajibanEkuitas: string; difference: string; balanced: boolean };
  labaRugi: { period: string; pendapatan: SectionView; hpp: SectionView; labaKotor: string; beban: SectionView; labaUsaha: string; pendapatanLain: SectionView; bebanLain: SectionView; labaSebelumPajak: string; bebanPajak: SectionView; labaBersih: string };
}
export interface ReportView {
  year: number;
  kind: PeriodKind;
  kindLabel: string;
  range: { start: string; end: string; label: string };
  entities: StatementsView[];
  consolidated: StatementsView;
  elimination: { rkUnit: string; rkPusat: string; residual: string; balanced: boolean };
  periodState: { half: number; state: "BUKA" | "DITUTUP" }[];
  findings: { level: "ERROR" | "WARN" | "INFO"; message: string; ref?: string }[];
}

const sec = (s: Section): SectionView => ({ label: s.label, lines: s.lines.map((l) => ({ code: l.code, name: l.name, amount: fromCents(l.amount) })), total: fromCents(s.total) });
const stm = (s: Statements): StatementsView => ({
  unitId: s.unitId,
  name: s.name,
  empty: s.empty,
  neraca: { asOf: s.neraca.asOf, aset: sec(s.neraca.aset), kewajiban: sec(s.neraca.kewajiban), ekuitas: sec(s.neraca.ekuitas), totalAset: fromCents(s.neraca.totalAset), totalKewajibanEkuitas: fromCents(s.neraca.totalKewajibanEkuitas), difference: fromCents(s.neraca.difference), balanced: s.neraca.balanced },
  labaRugi: { period: s.labaRugi.period, pendapatan: sec(s.labaRugi.pendapatan), hpp: sec(s.labaRugi.hpp), labaKotor: fromCents(s.labaRugi.labaKotor), beban: sec(s.labaRugi.beban), labaUsaha: fromCents(s.labaRugi.labaUsaha), pendapatanLain: sec(s.labaRugi.pendapatanLain), bebanLain: sec(s.labaRugi.bebanLain), labaSebelumPajak: fromCents(s.labaRugi.labaSebelumPajak), bebanPajak: sec(s.labaRugi.bebanPajak), labaBersih: fromCents(s.labaRugi.labaBersih) },
});

/**
 * Rekonsiliasi akun ekuitas yang hanya boleh digerakkan arus APB Desa: total 3.1.01.01 (dan 3.2.01.01) menurut jurnal bersumber arus harus sama dengan total
 * arus aktif; jurnal bersumber lain pada akun itu (tak seharusnya ada) dan jurnal pembukaan ditampilkan terpisah.
 */
export async function equityReconciliation(db: Db, bumdesId: number, end: string): Promise<ReportView["findings"]> {
  const rows = await db.$queryRaw<{ source: string; account: string; s: bigint }[]>`
    SELECT j.source AS source, l.accountCode AS account, CAST(COALESCE(SUM(l.creditCents - l.debitCents), 0) AS SIGNED) AS s
    FROM bumdes_journal_lines l INNER JOIN bumdes_journals j ON j.id = l.journalId
    WHERE j.bumdesId = ${bumdesId} AND j.status = 'AKTIF' AND j.entryDate <= ${end} AND l.accountCode IN (${EQUITY_VILLAGE_CAPITAL}, ${EQUITY_VILLAGE_PROFIT_SHARE})
    GROUP BY j.source, l.accountCode`;
  const flows = await db.bumdesVillageFlow.groupBy({ by: ["kind"], where: { bumdesId, status: "AKTIF", flowDate: { lte: dayOf(end) } }, _sum: { amountCents: true } });
  const flowSum = (kind: string): bigint => flows.find((f) => f.kind === kind)?._sum.amountCents ?? 0n;
  const sum = (account: string, pred: (source: string) => boolean): bigint => rows.filter((r) => r.account === account && pred(r.source)).reduce((t, r) => t + BigInt(r.s), 0n);
  const out: ReportView["findings"] = [];
  const capFromFlows = sum(EQUITY_VILLAGE_CAPITAL, (s) => s === "MODAL");
  if (capFromFlows !== flowSum("PENYERTAAN_MODAL")) out.push({ level: "ERROR", message: `Penyertaan Modal Desa (3.1.01.01) menurut jurnal arus ${rp(capFromFlows)} berbeda dari total arus penyertaan modal aktif ${rp(flowSum("PENYERTAAN_MODAL"))}. Periksa jurnal dan tab Dana Desa.`, ref: "PP 11/2021 Pasal 40-43" });
  const capOther = sum(EQUITY_VILLAGE_CAPITAL, (s) => s !== "MODAL" && s !== "SALDO_AWAL");
  if (capOther !== 0n) out.push({ level: "ERROR", message: `Ada jurnal bukan-arus yang menggerakkan Penyertaan Modal Desa (3.1.01.01) sebesar ${rp(capOther)}. Akun ini hanya boleh digerakkan arus APB Desa.`, ref: "PP 11/2021 Pasal 41 ayat 4" });
  const capOpening = sum(EQUITY_VILLAGE_CAPITAL, (s) => s === "SALDO_AWAL");
  if (capOpening !== 0n) out.push({ level: "INFO", message: `Penyertaan Modal Desa saldo awal ${rp(capOpening)} dicatat lewat jurnal pembukaan, tanpa keputusan Musyawarah Desa dan Buku Kas Umum di aplikasi. Simpan Peraturan Desa/keputusan asalnya.` });
  const shareFromFlows = -sum(EQUITY_VILLAGE_PROFIT_SHARE, (s) => s === "BAGI_HASIL");
  if (shareFromFlows !== flowSum("BAGI_HASIL")) out.push({ level: "ERROR", message: `Bagi hasil ke Desa (3.2.01.01) menurut jurnal arus ${rp(shareFromFlows)} berbeda dari total arus bagi hasil aktif ${rp(flowSum("BAGI_HASIL"))}. Periksa jurnal dan tab Dana Desa.`, ref: "PP 11/2021 Pasal 60" });
  const shareOther = sum(EQUITY_VILLAGE_PROFIT_SHARE, (s) => s !== "BAGI_HASIL");
  if (shareOther !== 0n) out.push({ level: "ERROR", message: `Ada jurnal bukan-arus yang menggerakkan Bagi Hasil Penyertaan Modal Desa (3.2.01.01) sebesar ${rp(-shareOther)}. Akun ini hanya boleh digerakkan arus APB Desa.`, ref: "PP 11/2021 Pasal 59 ayat 2" });
  return out;
}

export async function getReport(db: Db, bumdesId: number, year: number, kind: PeriodKind): Promise<Result<ReportView>> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return fail(400, "Tahun tidak valid.");
  const rep = await reportInTx(db, bumdesId, year, kind);
  const closes = await db.bumdesPeriodClose.findMany({ where: { bumdesId, year }, select: { half: true } });
  const periodState = halvesOf(kind).map((h) => ({ half: h, state: closes.some((c) => c.half === h) ? ("DITUTUP" as const) : ("BUKA" as const) }));
  const findings: ReportView["findings"] = [];
  const missing = await unjournaledCount(db, bumdesId, "2000-01-01", rep.range.end);
  if (missing > 0) findings.push({ level: "WARN", message: `${missing} transaksi kas belum berjurnal sehingga belum masuk laporan ini. Susun jurnalnya di tab Transaksi kas.` });
  findings.push(...(await equityReconciliation(db, bumdesId, rep.range.end)));
  const unbalanced = rep.entities.filter((e) => !e.neraca.balanced);
  for (const e of unbalanced) findings.push({ level: "ERROR", message: `Neraca ${e.name} tidak seimbang (selisih ${rp(e.neraca.difference < 0n ? -e.neraca.difference : e.neraca.difference)}). Ini seharusnya mustahil; laporkan ke pengelola Klandesa.` });
  if (rep.elimination.residual !== 0n) findings.push({ level: "WARN", message: `Akun RK Unit Usaha dan RK Pusat belum saling meniadakan (selisih ${rp(rep.elimination.residual < 0n ? -rep.elimination.residual : rep.elimination.residual)}). Pindahan dana antara kantor pusat dan unit harus dijurnal di kedua sisi.`, ref: "Kepmendes PDTT 136/2022 Bab V.B" });
  if (rep.consolidated.empty) findings.push({ level: "INFO", message: "Belum ada jurnal pada atau sebelum periode ini." });
  if (periodState.some((p) => p.state === "BUKA") && halvesOf(kind).every((h) => halfEnded(year, h, new Date()))) findings.push({ level: "INFO", message: "Periode ini sudah berakhir tetapi belum ditutup. Tutup periode di tab Periode setelah semua transaksi tercatat." });
  return ok({
    year,
    kind,
    kindLabel: PERIOD_KIND[kind],
    range: { start: rep.range.start, end: rep.range.end, label: rep.range.label },
    entities: rep.entities.map(stm),
    consolidated: stm(rep.consolidated),
    elimination: { rkUnit: fromCents(rep.elimination.rkUnit), rkPusat: fromCents(rep.elimination.rkPusat), residual: fromCents(rep.elimination.residual), balanced: rep.elimination.residual === 0n },
    periodState,
    findings,
  });
}

// ============================================================================================================================
// Legalitas dan pengurus
// ============================================================================================================================

/** Menambah hari kerja (Senin-Jumat). Hari libur nasional tidak dikenali, jadi tenggat bisa lebih awal dari yang sebenarnya. */
export function addWorkdays(from: Date, n: number): Date {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6) left -= 1;
  }
  return d;
}

export interface OfficerView {
  id: number;
  role: string;
  roleLabel: string;
  name: string;
  skNumber: string | null;
  skDate: string | null;
  startOn: string | null;
  endOn: string | null;
  /** Akhir jabatan yang berlaku: tanggal berakhir yang diisi, atau 5 tahun dari tanggal mulai (PP 11/2021 Pasal 26 dan 30) */
  termEnd: string | null;
  note: string | null;
}

export interface LegalOverview {
  bumdes: { id: number; name: string; address: string | null; phone: string | null; email: string | null; legalNotes: string | null };
  profile: {
    legalStatus: string;
    legalStatusLabel: string;
    establishMeetingId: number | null;
    establishMeeting: { id: number; title: string; status: string; heldOn: string | null } | null;
    establishedOn: string | null;
    perdesNumber: string | null;
    perdesDate: string | null;
    artNumber: string | null;
    artDate: string | null;
    nameApprovalNo: string | null;
    nameApprovalDate: string | null;
    certificateNo: string | null;
    certificateDate: string | null;
    nib: string | null;
    npwp: string | null;
    businessFields: string | null;
    initialCapital: string | null;
    rankingYear: number | null;
    rankingLevel: string | null;
    note: string | null;
  };
  officers: OfficerView[];
  /** Musyawarah Desa berberita acara final yang dapat dihubungkan */
  meetings: { id: number; title: string; kind: string; heldOn: string | null }[];
  checklist: { key: string; label: string; done: boolean; hint: string | null }[];
  findings: { level: "ERROR" | "WARN" | "INFO"; message: string; ref?: string }[];
}

const termEndOf = (o: { startOn: Date | null; endOn: Date | null }): string | null => {
  if (o.endOn) return iso(o.endOn);
  if (!o.startOn) return null;
  return `${o.startOn.getUTCFullYear() + TERM_YEARS}${iso(o.startOn).slice(4)}`;
};

export async function getLegal(db: Db, args: { villageId: number; bumdesId: number; today: string }): Promise<Result<LegalOverview>> {
  const [b, p, officers, meetingOptions] = await Promise.all([
    db.bumdes.findFirst({ where: { id: args.bumdesId }, select: { id: true, name: true, address: true, phone: true, email: true, legalNotes: true } }),
    db.bumdesLegalProfile.findUnique({ where: { bumdesId: args.bumdesId } }),
    db.bumdesOfficer.findMany({ where: { bumdesId: args.bumdesId }, orderBy: [{ role: "asc" }, { id: "asc" }], take: LIMITS.officers }),
    db.villageMeeting.findMany({ where: { villageId: args.villageId, status: "FINAL" }, orderBy: [{ heldOn: "desc" }, { id: "desc" }], take: 100, select: { id: true, title: true, kind: true, heldOn: true } }),
  ]);
  if (!b) return fail(404, "BUMDes tidak ditemukan.");
  const meeting = p?.establishMeetingId ? await db.villageMeeting.findFirst({ where: { id: p.establishMeetingId, villageId: args.villageId }, select: { id: true, title: true, status: true, heldOn: true } }) : null;
  const offViews: OfficerView[] = officers.map((o) => ({ id: o.id, role: o.role, roleLabel: OFFICER_ROLE[o.role as keyof typeof OFFICER_ROLE] ?? o.role, name: o.name, skNumber: o.skNumber, skDate: isoDay(o.skDate), startOn: isoDay(o.startOn), endOn: isoDay(o.endOn), termEnd: termEndOf(o), note: o.note }));

  const status = p?.legalStatus ?? "BELUM_DAFTAR";
  const findings: LegalOverview["findings"] = [];
  const checklist: LegalOverview["checklist"] = [
    { key: "musdes", label: "Berita acara Musyawarah Desa pendirian", done: meeting?.status === "FINAL", hint: meeting ? (meeting.status === "FINAL" ? null : "Berita acara belum final di menu Musyawarah Desa.") : "Hubungkan Musyawarah Desa pendirian." },
    { key: "perdes", label: "Peraturan Desa pendirian (memuat Anggaran Dasar)", done: Boolean(p?.perdesNumber && p?.perdesDate), hint: null },
    { key: "art", label: "Anggaran Rumah Tangga (Peraturan Kepala Desa)", done: Boolean(p?.artNumber && p?.artDate), hint: null },
    { key: "nama", label: "Persetujuan penggunaan nama", done: Boolean(p?.nameApprovalNo), hint: null },
    { key: "pengurus", label: "Pengurus: pelaksana operasional, sekretaris, bendahara, dan pengawas tercatat", done: ["PELAKSANA_OPERASIONAL", "SEKRETARIS", "BENDAHARA", "PENGAWAS"].every((r) => officers.some((o) => o.role === r)), hint: null },
    { key: "modal", label: "Modal awal dan bidang usaha terisi", done: Boolean(p?.initialCapitalCents && p?.businessFields), hint: null },
    { key: "sertifikat", label: "Sertifikat pendaftaran badan hukum", done: Boolean(p?.certificateNo), hint: null },
  ];
  if (status !== "BADAN_HUKUM" && p?.perdesDate) {
    const deadline = addWorkdays(p.perdesDate, REGISTRATION_WORKDAYS);
    if (status === "BELUM_DAFTAR" && iso(deadline) < args.today) findings.push({ level: "WARN", message: `Batas 20 hari kerja pendaftaran sejak Peraturan Desa pendirian (sekitar ${iso(deadline)}, hari libur nasional tidak dihitung) sudah lewat. Bila pendaftaran melewati batas, prosesnya diulang dari pendaftaran nama.`, ref: "Permendesa PDTT 3/2021 Pasal 9 ayat 4-5" });
    else if (status === "BELUM_DAFTAR") findings.push({ level: "INFO", message: `Daftarkan BUM Desa paling lambat sekitar ${iso(deadline)} (20 hari kerja sejak Peraturan Desa pendirian; hari libur nasional tidak dihitung).`, ref: "Permendesa PDTT 3/2021 Pasal 9 ayat 4" });
  }
  if (p?.nameApprovalDate && status !== "BADAN_HUKUM") {
    const exp = addWorkdays(p.nameApprovalDate, 40);
    if (iso(exp) < args.today) findings.push({ level: "WARN", message: `Persetujuan nama berlaku paling lama 40 hari kerja (sekitar ${iso(exp)}). Periksa apakah masih berlaku sebelum mendaftar.`, ref: "Permendesa PDTT 3/2021 Pasal 7" });
  }
  for (const o of offViews) {
    if ((o.role === "PELAKSANA_OPERASIONAL" || o.role === "PENGAWAS") && o.termEnd && o.termEnd < args.today) findings.push({ level: "WARN", message: `Masa jabatan ${o.roleLabel.toLowerCase()} ${o.name} berakhir ${o.termEnd} (jabatan 5 tahun). Perbarui SK atau catatannya.`, ref: "PP 11/2021 Pasal 26 dan 30" });
  }
  if (meeting && meeting.status !== "FINAL") findings.push({ level: "INFO", message: "Musyawarah Desa pendirian yang dihubungkan belum berberita acara final." });
  if (status === "BADAN_HUKUM" && !p?.certificateNo) findings.push({ level: "WARN", message: "Berstatus badan hukum tetapi nomor sertifikat belum dicatat." });

  return ok({
    bumdes: b,
    profile: {
      legalStatus: status,
      legalStatusLabel: { BELUM_DAFTAR: "Belum didaftarkan", PROSES: "Dalam proses pendaftaran", BADAN_HUKUM: "Berbadan hukum" }[status] ?? status,
      establishMeetingId: p?.establishMeetingId ?? null,
      establishMeeting: meeting ? { id: meeting.id, title: meeting.title, status: meeting.status, heldOn: isoDay(meeting.heldOn) } : null,
      establishedOn: isoDay(p?.establishedOn ?? null),
      perdesNumber: p?.perdesNumber ?? null,
      perdesDate: isoDay(p?.perdesDate ?? null),
      artNumber: p?.artNumber ?? null,
      artDate: isoDay(p?.artDate ?? null),
      nameApprovalNo: p?.nameApprovalNo ?? null,
      nameApprovalDate: isoDay(p?.nameApprovalDate ?? null),
      certificateNo: p?.certificateNo ?? null,
      certificateDate: isoDay(p?.certificateDate ?? null),
      nib: p?.nib ?? null,
      npwp: p?.npwp ?? null,
      businessFields: p?.businessFields ?? null,
      initialCapital: p?.initialCapitalCents != null ? fromCents(p.initialCapitalCents) : null,
      rankingYear: p?.rankingYear ?? null,
      rankingLevel: p?.rankingLevel ?? null,
      note: p?.note ?? null,
    },
    officers: offViews,
    meetings: meetingOptions.map((m) => ({ id: m.id, title: m.title, kind: m.kind, heldOn: isoDay(m.heldOn) })),
    checklist,
    findings,
  });
}

export async function saveLegal(db: PrismaClient, args: { villageId: number; bumdesId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parseLegal(args.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      await lockBumdes(tx, args.bumdesId);
      if (v.establishMeetingId !== null) {
        const m = await tx.villageMeeting.findFirst({ where: { id: v.establishMeetingId, villageId: args.villageId }, select: { id: true } });
        if (!m) return invalid({ errors: ["Musyawarah Desa tidak ditemukan."], fieldErrors: { establishMeetingId: "Musyawarah Desa tidak ditemukan." } });
      }
      const data = { legalStatus: v.legalStatus, establishMeetingId: v.establishMeetingId, establishedOn: v.establishedOn, perdesNumber: v.perdesNumber, perdesDate: v.perdesDate, artNumber: v.artNumber, artDate: v.artDate, nameApprovalNo: v.nameApprovalNo, nameApprovalDate: v.nameApprovalDate, certificateNo: v.certificateNo, certificateDate: v.certificateDate, nib: v.nib, npwp: v.npwp, businessFields: v.businessFields, initialCapitalCents: v.initialCapitalCents, rankingYear: v.rankingYear, rankingLevel: v.rankingLevel, note: v.note, updatedById: args.userId };
      const row = await tx.bumdesLegalProfile.upsert({ where: { bumdesId: args.bumdesId }, create: { bumdesId: args.bumdesId, ...data }, update: data, select: { id: true } });
      return ok({ id: row.id });
    }, TX)
    .catch(asResult);
}

export async function addOfficer(db: PrismaClient, args: { bumdesId: number; input: unknown }): Promise<Result<{ id: number; role: string; name: string }>> {
  const p = parseOfficer(args.input);
  if (!p.ok) return invalid(p);
  return db
    .$transaction(async (tx) => {
      await lockBumdes(tx, args.bumdesId);
      const n = await tx.bumdesOfficer.count({ where: { bumdesId: args.bumdesId } });
      if (n >= LIMITS.officers) return fail(409, `Maksimal ${LIMITS.officers} pengurus tercatat.`);
      const row = await tx.bumdesOfficer.create({ data: { bumdesId: args.bumdesId, ...p.value }, select: { id: true, role: true, name: true } });
      return ok(row);
    }, TX)
    .catch(asResult);
}

export async function updateOfficer(db: PrismaClient, args: { bumdesId: number; id: number; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parseOfficer(args.input);
  if (!p.ok) return invalid(p);
  const cur = await db.bumdesOfficer.findFirst({ where: { id: args.id, bumdesId: args.bumdesId }, select: { id: true } });
  if (!cur) return fail(404, "Pengurus tidak ditemukan.");
  await db.bumdesOfficer.update({ where: { id: cur.id }, data: p.value });
  return ok({ id: cur.id });
}

export async function removeOfficer(db: PrismaClient, args: { bumdesId: number; id: number }): Promise<Result<{ id: number; role: string; name: string }>> {
  const cur = await db.bumdesOfficer.findFirst({ where: { id: args.id, bumdesId: args.bumdesId }, select: { id: true, role: true, name: true } });
  if (!cur) return fail(404, "Pengurus tidak ditemukan.");
  await db.bumdesOfficer.delete({ where: { id: cur.id } });
  return ok(cur);
}

// ============================================================================================================================
// Arus APB Desa: penyertaan modal dan bagi hasil
// ============================================================================================================================

export interface ResolutionView {
  id: number;
  kind: string;
  kindLabel: string;
  meeting: { id: number; title: string; heldOn: string | null; status: string } | null;
  decision: { id: number; seq: number; text: string } | null;
  fiscalYear: number | null;
  amount: string;
  used: string;
  remaining: string;
  note: string | null;
  status: string;
  voidReason: string | null;
}

export interface FlowView {
  id: number;
  kind: string;
  kindLabel: string;
  fiscalYear: number | null;
  flowDate: string;
  amount: string;
  resolutionId: number;
  musdes: { id: number; title: string; heldOn: string | null; status: string } | null;
  cashAccountCode: string;
  cashAccountName: string;
  apbdesYear: number;
  apbdesEntry: { id: number; voucherNo: string; state: "OK" | "HILANG" | "BERBEDA" } | null;
  journalId: number | null;
  reference: string | null;
  note: string | null;
  status: string;
  voidReason: string | null;
  warnings: string[];
}
export interface FlowsOverview {
  year: number;
  flows: FlowView[];
  resolutions: ResolutionView[];
  /** Musyawarah Desa tentang BUM Desa berberita acara final, beserta butir keputusannya */
  meetings: { id: number; title: string; kind: string; heldOn: string | null; decisions: { id: number; seq: number; text: string }[] }[];
  capital: { budgeted: string | null; spent: string; remaining: string | null; documentLabel: string | null };
  totals: { capital: string; profitShare: string };
}

export async function listFlows(db: Db, args: { villageId: number; bumdesId: number; year: number }): Promise<Result<FlowsOverview>> {
  const { villageId, bumdesId, year } = args;
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return fail(400, "Tahun tidak valid.");
  const [rows, resRows] = await Promise.all([
    db.bumdesVillageFlow.findMany({ where: { bumdesId }, orderBy: [{ flowDate: "desc" }, { id: "desc" }], take: LIMITS.flows }),
    db.bumdesMusdesResolution.findMany({ where: { bumdesId }, orderBy: { id: "desc" }, take: LIMITS.resolutions }),
  ]);
  const meetingIds = [...new Set([...rows.map((r) => r.musdesMeetingId), ...resRows.map((r) => r.musdesMeetingId)])];
  const entryIds = rows.map((r) => r.apbdesEntryId).filter((x): x is number => x !== null);
  const [meetings, entries, options, doc, yearEntries, decisions] = await Promise.all([
    meetingIds.length ? db.villageMeeting.findMany({ where: { id: { in: meetingIds }, villageId }, select: { id: true, title: true, heldOn: true, status: true } }) : Promise.resolve([]),
    entryIds.length ? db.apbdesEntry.findMany({ where: { id: { in: entryIds }, villageId }, select: { id: true, voucherNo: true, type: true, accountCode: true, amountCents: true } }) : Promise.resolve([]),
    db.villageMeeting.findMany({ where: { villageId, status: "FINAL", kind: FLOW_MEETING_KIND }, orderBy: [{ heldOn: "desc" }, { id: "desc" }], take: 100, select: { id: true, title: true, kind: true, heldOn: true } }),
    activeDocument(db, villageId, year),
    loadEntries(db, villageId, year),
    db.villageMeetingDecision.findMany({ where: { meetingId: { in: [...new Set([...meetingIds, 0])] } }, select: { id: true, meetingId: true, seq: true, text: true }, take: 2000 }),
  ]);
  const optionIds = options.map((o) => o.id);
  const optionDecisions = optionIds.length ? await db.villageMeetingDecision.findMany({ where: { meetingId: { in: optionIds } }, orderBy: [{ meetingId: "asc" }, { seq: "asc" }], select: { id: true, meetingId: true, seq: true, text: true }, take: 3000 }) : [];
  const mById = new Map(meetings.map((m) => [m.id, m]));
  const eById = new Map(entries.map((e) => [e.id, e]));
  const dById = new Map(decisions.map((d) => [d.id, d]));

  const usedBy = new Map<number, bigint>();
  for (const r of rows) if (r.status === "AKTIF") usedBy.set(r.resolutionId, (usedBy.get(r.resolutionId) ?? 0n) + r.amountCents);
  const resolutions: ResolutionView[] = resRows.map((r) => {
    const m = mById.get(r.musdesMeetingId) ?? null;
    const d = dById.get(r.decisionId) ?? null;
    const used = usedBy.get(r.id) ?? 0n;
    return {
      id: r.id,
      kind: r.kind,
      kindLabel: FLOW_KIND[r.kind as keyof typeof FLOW_KIND]?.label ?? r.kind,
      meeting: m ? { id: m.id, title: m.title, heldOn: isoDay(m.heldOn), status: m.status } : null,
      decision: d ? { id: d.id, seq: d.seq, text: d.text } : null,
      fiscalYear: r.fiscalYear,
      amount: fromCents(r.amountCents),
      used: fromCents(used),
      remaining: fromCents(r.amountCents - used),
      note: r.note,
      status: r.status,
      voidReason: r.voidReason,
    };
  });

  // Pembanding bagi hasil: laba bersih tahun buku menurut pembukuan (penjaga utama ada di createFlow; ini mendeteksi penyimpangan data).
  const profitByYear = new Map<number, bigint>();
  for (const fy of new Set(rows.filter((r) => r.kind === "BAGI_HASIL" && r.fiscalYear !== null && r.status === "AKTIF").map((r) => r.fiscalYear!))) {
    const rep = await reportInTx(db, bumdesId, fy, "TAHUN");
    profitByYear.set(fy, rep.consolidated.labaRugi.labaBersih);
  }
  const sharedByYear = new Map<number, bigint>();
  for (const r of rows) if (r.kind === "BAGI_HASIL" && r.fiscalYear !== null && r.status === "AKTIF") sharedByYear.set(r.fiscalYear, (sharedByYear.get(r.fiscalYear) ?? 0n) + r.amountCents);

  const flows: FlowView[] = rows.map((r) => {
    const m = mById.get(r.musdesMeetingId) ?? null;
    const e = r.apbdesEntryId !== null ? eById.get(r.apbdesEntryId) : undefined;
    const expectedType = r.kind === "PENYERTAAN_MODAL" ? "PENGELUARAN" : "PENERIMAAN";
    const expectedAccount = r.kind === "PENYERTAAN_MODAL" ? APBDES_CAPITAL_ACCOUNT : APBDES_PROFIT_SHARE_ACCOUNT;
    const state: "OK" | "HILANG" | "BERBEDA" | null = r.apbdesEntryId === null ? null : !e ? "HILANG" : e.amountCents !== r.amountCents || e.type !== expectedType || e.accountCode !== expectedAccount ? "BERBEDA" : "OK";
    const warnings: string[] = [];
    if (r.status === "AKTIF") {
      if (state === "HILANG") warnings.push("Catatan Buku Kas Umum APB Desa untuk arus ini sudah tidak ada (data diubah di luar aplikasi). Periksa agar pembukuan Desa dan BUMDes tetap cocok.");
      if (state === "BERBEDA") warnings.push("Catatan Buku Kas Umum APB Desa berbeda dari arus ini (data diubah di luar aplikasi). Periksa di menu APB Desa.");
      if (r.kind === "PENYERTAAN_MODAL" && m?.heldOn) {
        const limit = new Date(Date.UTC(m.heldOn.getUTCFullYear(), m.heldOn.getUTCMonth() + CAPITAL_DISBURSE_MONTHS, m.heldOn.getUTCDate()));
        if (r.flowDate.getTime() > limit.getTime()) warnings.push(`Disalurkan lebih dari ${CAPITAL_DISBURSE_MONTHS} bulan setelah keputusan Musyawarah Desa (PP 11/2021 Pasal 43 ayat 1).`);
      }
      if (r.kind === "BAGI_HASIL" && r.fiscalYear !== null) {
        const profit = profitByYear.get(r.fiscalYear) ?? 0n;
        const shared = sharedByYear.get(r.fiscalYear) ?? 0n;
        if (shared > profit) warnings.push(`Total bagi hasil tahun buku ${r.fiscalYear} (${rp(shared)}) melebihi laba bersih menurut pembukuan (${rp(profit > 0n ? profit : 0n)}), mungkin karena jurnal dikoreksi setelah dicatat. Periksa pembukuan.`);
      }
    }
    return {
      id: r.id,
      kind: r.kind,
      kindLabel: FLOW_KIND[r.kind as keyof typeof FLOW_KIND]?.label ?? r.kind,
      fiscalYear: r.fiscalYear,
      flowDate: iso(r.flowDate),
      amount: fromCents(r.amountCents),
      resolutionId: r.resolutionId,
      musdes: m ? { id: m.id, title: m.title, heldOn: isoDay(m.heldOn), status: m.status } : null,
      cashAccountCode: r.cashAccountCode,
      cashAccountName: accountName(r.cashAccountCode),
      apbdesYear: r.apbdesYear,
      apbdesEntry: r.apbdesEntryId === null ? null : { id: r.apbdesEntryId, voucherNo: e?.voucherNo ?? "-", state: state ?? "HILANG" },
      journalId: r.journalId,
      reference: r.reference,
      note: r.note,
      status: r.status,
      voidReason: r.voidReason,
      warnings,
    };
  });

  let budgeted: bigint | null = null;
  if (doc) {
    const b = budgetMap(doc.lines).get(`|${APBDES_CAPITAL_ACCOUNT}`);
    budgeted = b ?? 0n;
  }
  const spent = yearEntries.filter((e) => e.type === "PENGELUARAN" && e.accountCode === APBDES_CAPITAL_ACCOUNT).reduce((t, e) => t + e.amountCents, 0n);
  const active = rows.filter((r) => r.status === "AKTIF");
  return ok({
    year,
    flows,
    resolutions,
    meetings: options.map((m) => ({ id: m.id, title: m.title, kind: m.kind, heldOn: isoDay(m.heldOn), decisions: optionDecisions.filter((d) => d.meetingId === m.id).map((d) => ({ id: d.id, seq: d.seq, text: d.text })) })),
    capital: { budgeted: budgeted === null ? null : fromCents(budgeted), spent: fromCents(spent), remaining: budgeted === null ? null : fromCents(budgeted - spent), documentLabel: doc ? (doc.version === 0 ? "APB Desa" : `Perubahan APB Desa ke-${doc.version}`) : null },
    totals: { capital: fromCents(active.filter((r) => r.kind === "PENYERTAAN_MODAL").reduce((t, r) => t + r.amountCents, 0n)), profitShare: fromCents(active.filter((r) => r.kind === "BAGI_HASIL").reduce((t, r) => t + r.amountCents, 0n)) },
  });
}

/**
 * Mencatat keputusan Musyawarah Desa tentang jumlah penyertaan modal atau bagi hasil. Keputusan ini menjadi PLAFON kumulatif arus APB Desa.
 * Syarat: Musyawarah Desa milik desa ini, berberita acara final, berjenis MUSDES_BUMDES, dan butir keputusan yang dipilih ada di berita acara itu.
 */
export async function createResolution(db: PrismaClient, args: { villageId: number; bumdesId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parseResolution(args.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      await lockBumdes(tx, args.bumdesId);
      const meeting = await tx.villageMeeting.findFirst({ where: { id: v.musdesMeetingId, villageId: args.villageId }, select: { id: true, status: true, kind: true } });
      if (!meeting) return invalid({ errors: ["Musyawarah Desa tidak ditemukan."], fieldErrors: { musdesMeetingId: "Musyawarah Desa tidak ditemukan." } });
      if (meeting.kind !== FLOW_MEETING_KIND) return invalid({ errors: ["Jenis Musyawarah Desa tidak sah."], fieldErrors: { musdesMeetingId: "Pilih Musyawarah Desa berjenis “Musyawarah Desa tentang BUM Desa”. Buat di menu Musyawarah Desa." } });
      if (meeting.status !== "FINAL") return invalid({ errors: ["Berita acara belum final."], fieldErrors: { musdesMeetingId: "Finalkan berita acara Musyawarah Desa itu lebih dulu." } });
      const decision = await tx.villageMeetingDecision.findFirst({ where: { id: v.decisionId, meetingId: meeting.id }, select: { id: true } });
      if (!decision) return invalid({ errors: ["Butir keputusan tidak ada di berita acara itu."], fieldErrors: { decisionId: "Pilih butir keputusan dari berita acara Musyawarah Desa tersebut." } });
      const dup = await tx.bumdesMusdesResolution.count({ where: { bumdesId: args.bumdesId, decisionId: decision.id, kind: v.kind, status: "AKTIF" } });
      if (dup > 0) return invalid({ errors: ["Butir keputusan ini sudah dipakai."], fieldErrors: { decisionId: "Butir keputusan ini sudah menjadi dasar keputusan lain dengan jenis yang sama." } });
      const n = await tx.bumdesMusdesResolution.count({ where: { bumdesId: args.bumdesId } });
      if (n >= LIMITS.resolutions) return fail(409, `Maksimal ${LIMITS.resolutions} keputusan tercatat.`);
      const row = await tx.bumdesMusdesResolution.create({ data: { bumdesId: args.bumdesId, kind: v.kind, musdesMeetingId: meeting.id, decisionId: decision.id, fiscalYear: v.fiscalYear, amountCents: v.amountCents, note: v.note, createdById: args.userId }, select: { id: true } });
      return ok({ id: row.id });
    }, TX)
    .catch(asResult);
}

export async function voidResolution(db: PrismaClient, args: { bumdesId: number; id: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<{ id: number; kind: string; amount: string }>> {
  const reason = parseReason(args.input);
  if (!reason.ok) return invalid(reason);
  return db
    .$transaction(async (tx) => {
      await lockBumdes(tx, args.bumdesId);
      const cur = await tx.bumdesMusdesResolution.findFirst({ where: { id: args.id, bumdesId: args.bumdesId } });
      if (!cur) return fail(404, "Keputusan tidak ditemukan.");
      if (cur.status !== "AKTIF") return fail(409, "Keputusan ini sudah dibatalkan.");
      const used = await tx.bumdesVillageFlow.count({ where: { resolutionId: cur.id, status: "AKTIF" } });
      if (used > 0) return fail(409, `Masih ada ${used} catatan arus aktif yang bersandar pada keputusan ini. Batalkan catatan itu dulu.`);
      await tx.bumdesMusdesResolution.update({ where: { id: cur.id }, data: { status: "DIBATALKAN", voidedAt: args.now ?? new Date(), voidedById: args.userId, voidReason: reason.value.reason } });
      return ok({ id: cur.id, kind: cur.kind, amount: fromCents(cur.amountCents) });
    }, TX)
    .catch(asResult);
}

/**
 * Mencatat penyertaan modal Desa (pengeluaran pembiayaan 6.2.2.01) atau bagi hasil ke Desa (pendapatan 4.1.1.01). Satu transaksi basis data:
 * catatan Buku Kas Umum APB Desa (createEntryInTx; menolak bila bulan BKU ditutup, anggaran tak ada/terlampaui, saldo minus), jurnal BUMDes,
 * dan baris arus. Wajib bersandar pada keputusan Musyawarah Desa (plafon kumulatif; PP 11/2021 Pasal 41 ayat 4, Pasal 17 huruf l, m, p, Pasal 59 ayat 2).
 * Bagi hasil DITOLAK bila total tahun buku melebihi laba bersih menurut pembukuan atau melebihi saldo kas BUMDes pada akun kas yang dipilih.
 */
export async function createFlow(db: PrismaClient, args: { villageId: number; bumdesId: number; bumdesName: string; userId: number | null; input: unknown; now?: Date }): Promise<Result<{ id: number; apbdesEntryId: number; journalId: number }>> {
  const now = args.now ?? new Date();
  const p = parseFlow(args.input, now);
  if (!p.ok) return invalid(p);
  const v = p.value;
  const year = v.flowDate.getUTCFullYear();
  await ensureYear(db, args.villageId, year);
  return db
    .$transaction(async (tx) => {
      await lockBumdes(tx, args.bumdesId);
      await lockYear(tx, args.villageId, year);
      const res = await tx.bumdesMusdesResolution.findFirst({ where: { id: v.resolutionId, bumdesId: args.bumdesId } });
      if (!res) return invalid({ errors: ["Keputusan Musyawarah Desa tidak ditemukan."], fieldErrors: { resolutionId: "Keputusan Musyawarah Desa tidak ditemukan." } });
      if (res.status !== "AKTIF") return invalid({ errors: ["Keputusan sudah dibatalkan."], fieldErrors: { resolutionId: "Keputusan ini sudah dibatalkan." } });
      if (res.kind !== v.kind) return invalid({ errors: ["Keputusan itu untuk jenis arus lain."], fieldErrors: { resolutionId: "Keputusan ini tidak untuk jenis arus yang dipilih." } });
      const meeting = await tx.villageMeeting.findFirst({ where: { id: res.musdesMeetingId, villageId: args.villageId }, select: { id: true, status: true, heldOn: true, kind: true } });
      if (!meeting || meeting.kind !== FLOW_MEETING_KIND) return invalid({ errors: ["Musyawarah Desa dasar keputusan ini tidak ditemukan atau bukan jenis Musyawarah Desa tentang BUM Desa."], fieldErrors: { resolutionId: "Musyawarah Desa dasar keputusan ini tidak ditemukan atau bukan jenis Musyawarah Desa tentang BUM Desa." } });
      if (meeting.status !== "FINAL") return invalid({ errors: ["Berita acara Musyawarah Desa dasar keputusan ini tidak lagi final."], fieldErrors: { resolutionId: "Berita acara Musyawarah Desa dasar keputusan ini tidak lagi final." } });
      if (meeting.heldOn && meeting.heldOn.getTime() > v.flowDate.getTime()) return invalid({ errors: ["Tanggal mendahului Musyawarah Desa."], fieldErrors: { flowDate: "Tanggal tidak boleh sebelum Musyawarah Desa yang memutuskannya." } });
      await assertOpen(tx, args.bumdesId, v.flowDate);
      const count = await tx.bumdesVillageFlow.count({ where: { bumdesId: args.bumdesId } });
      if (count >= LIMITS.flows) return fail(409, `Maksimal ${LIMITS.flows} catatan arus.`);

      // Plafon kumulatif keputusan Musyawarah Desa
      const usedAgg = await tx.bumdesVillageFlow.aggregate({ where: { resolutionId: res.id, status: "AKTIF" }, _sum: { amountCents: true } });
      const used = usedAgg._sum.amountCents ?? 0n;
      if (used + v.amountCents > res.amountCents) {
        const left = res.amountCents - used;
        return invalid({ errors: [`Melebihi jumlah yang diputuskan Musyawarah Desa (sisa ${rp(left > 0n ? left : 0n)}).`], fieldErrors: { amount: `Melebihi keputusan Musyawarah Desa; sisa ${rp(left > 0n ? left : 0n)}.` } });
      }

      const capital = v.kind === "PENYERTAAN_MODAL";
      let fiscalYear: number | null = null;
      if (!capital) {
        fiscalYear = res.fiscalYear;
        if (fiscalYear === null) return fail(409, "Keputusan bagi hasil tidak memuat tahun buku.");
        if (fiscalYear > year) return invalid({ errors: ["Tahun buku setelah tanggal penerimaan."], fieldErrors: { flowDate: "Tanggal penerimaan tidak boleh sebelum tahun buku asal laba." } });
        // Total bagi hasil satu tahun buku tidak boleh melebihi laba bersih menurut pembukuan.
        const rep = await reportInTx(tx, args.bumdesId, fiscalYear, "TAHUN");
        const profit = rep.consolidated.labaRugi.labaBersih;
        const sharedAgg = await tx.bumdesVillageFlow.aggregate({ where: { bumdesId: args.bumdesId, kind: "BAGI_HASIL", fiscalYear, status: "AKTIF" }, _sum: { amountCents: true } });
        const shared = sharedAgg._sum.amountCents ?? 0n;
        if (shared + v.amountCents > profit) {
          const room = profit - shared;
          return invalid({ errors: [`Bagi hasil melebihi laba bersih tahun buku ${fiscalYear} menurut pembukuan (laba bersih ${rp(profit > 0n ? profit : 0n)}, sudah dibagikan ${rp(shared)}, sisa ${rp(room > 0n ? room : 0n)}).`], fieldErrors: { amount: `Melebihi laba bersih tahun buku ${fiscalYear}; sisa ${rp(room > 0n ? room : 0n)}.` } });
        }
        // Dan tidak boleh melebihi saldo kas BUMDes pada akun kas yang dipilih (Kantor Pusat, sampai tanggal pembayaran).
        const bal = await tx.$queryRaw<{ s: bigint | null }[]>`
          SELECT CAST(COALESCE(SUM(l.debitCents - l.creditCents), 0) AS SIGNED) AS s
          FROM bumdes_journal_lines l INNER JOIN bumdes_journals j ON j.id = l.journalId
          WHERE j.bumdesId = ${args.bumdesId} AND j.status = 'AKTIF' AND j.unitId IS NULL AND l.accountCode = ${v.cashAccountCode} AND j.entryDate <= ${iso(v.flowDate)}`;
        const cash = BigInt(bal[0]?.s ?? 0);
        if (v.amountCents > cash) return invalid({ errors: [`Saldo ${accountName(v.cashAccountCode)} Kantor Pusat (${rp(cash > 0n ? cash : 0n)}) tidak cukup untuk bagi hasil ini.`], fieldErrors: { cashAccountCode: `Saldo akun kas ini ${rp(cash > 0n ? cash : 0n)}, kurang dari jumlah bagi hasil.` } });
      }

      const sameKindYear = await tx.bumdesVillageFlow.count({ where: { bumdesId: args.bumdesId, kind: v.kind, apbdesYear: year } });
      const voucher = `BUMDes/${capital ? "PM" : "BH"}/${year}/${String(sameKindYear + 1).padStart(3, "0")}`;
      const desc = (capital ? `Penyertaan modal Desa kepada ${args.bumdesName}` : `Bagi hasil usaha ${args.bumdesName} tahun buku ${fiscalYear}`).slice(0, 290);
      const entryIn = parseEntryInput({ entryDate: iso(v.flowDate), voucherNo: voucher, type: capital ? "PENGELUARAN" : "PENERIMAAN", channel: v.villageChannel, accountCode: capital ? APBDES_CAPITAL_ACCOUNT : APBDES_PROFIT_SHARE_ACCOUNT, description: desc, amount: fromCents(v.amountCents) }, now);
      if (!entryIn.ok) return invalid(entryIn);
      const entry = await createEntryInTx(tx, { villageId: args.villageId, userId: args.userId, year, value: entryIn.value });
      if (!entry.ok) return entry;
      const lines: JLine[] = capital
        ? [
            { accountCode: v.cashAccountCode, debitCents: v.amountCents, creditCents: 0n, memo: null },
            { accountCode: EQUITY_VILLAGE_CAPITAL, debitCents: 0n, creditCents: v.amountCents, memo: null },
          ]
        : [
            { accountCode: EQUITY_VILLAGE_PROFIT_SHARE, debitCents: v.amountCents, creditCents: 0n, memo: null },
            { accountCode: v.cashAccountCode, debitCents: 0n, creditCents: v.amountCents, memo: null },
          ];
      const j = await createJournalInTx(tx, { bumdesId: args.bumdesId, unitId: null, entryDate: v.flowDate, description: desc.slice(0, 300), reference: v.reference, source: capital ? "MODAL" : "BAGI_HASIL", lines, userId: args.userId });
      const row = await tx.bumdesVillageFlow.create({
        data: { bumdesId: args.bumdesId, kind: v.kind, fiscalYear, flowDate: v.flowDate, amountCents: v.amountCents, resolutionId: res.id, musdesMeetingId: res.musdesMeetingId, cashAccountCode: v.cashAccountCode, apbdesYear: year, apbdesEntryId: entry.data.id, journalId: j.id, reference: v.reference, note: v.note, createdById: args.userId },
        select: { id: true },
      });
      return ok({ id: row.id, apbdesEntryId: entry.data.id, journalId: j.id });
    }, TX)
    .catch(asResult);
}

/** Membatalkan arus: catatan BKU yang dibuatnya dihapus lewat deleteEntryInTx (ditolak bila bulan BKU ditutup), jurnal dibatalkan, arus ditandai dibatalkan. */
export async function voidFlow(db: PrismaClient, args: { villageId: number; bumdesId: number; id: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<{ id: number; kind: string; amount: string }>> {
  const reason = parseReason(args.input);
  if (!reason.ok) return invalid(reason);
  const now = args.now ?? new Date();
  const head = await db.bumdesVillageFlow.findFirst({ where: { id: args.id, bumdesId: args.bumdesId }, select: { apbdesYear: true } });
  if (!head) return fail(404, "Catatan tidak ditemukan.");
  return db
    .$transaction(async (tx) => {
      await lockBumdes(tx, args.bumdesId);
      await lockYear(tx, args.villageId, head.apbdesYear);
      const cur = await tx.bumdesVillageFlow.findFirst({ where: { id: args.id, bumdesId: args.bumdesId } });
      if (!cur) return fail(404, "Catatan tidak ditemukan.");
      if (cur.status !== "AKTIF") return fail(409, "Catatan ini sudah dibatalkan.");
      await assertOpen(tx, args.bumdesId, cur.flowDate);
      if (cur.apbdesEntryId !== null) {
        const e = await tx.apbdesEntry.findFirst({ where: { id: cur.apbdesEntryId, villageId: args.villageId }, select: { id: true, amountCents: true, type: true, accountCode: true } });
        if (e) {
          const expectedType = cur.kind === "PENYERTAAN_MODAL" ? "PENGELUARAN" : "PENERIMAAN";
          const expectedAccount = cur.kind === "PENYERTAAN_MODAL" ? APBDES_CAPITAL_ACCOUNT : APBDES_PROFIT_SHARE_ACCOUNT;
          if (e.amountCents !== cur.amountCents || e.type !== expectedType || e.accountCode !== expectedAccount) return fail(409, "Catatan Buku Kas Umum APB Desa untuk arus ini sudah berbeda dari yang dibuat modul BUMDes. Periksa dan rapikan di menu APB Desa dulu.");
          const del = await deleteEntryInTx(tx, { villageId: args.villageId, entryId: e.id, viaBumdes: true });
          if (!del.ok) return del;
        }
      }
      if (cur.journalId !== null) await voidJournalInTx(tx, { bumdesId: args.bumdesId, journalId: cur.journalId, userId: args.userId, reason: `Arus APB Desa dibatalkan: ${reason.value.reason}`, now });
      await tx.bumdesVillageFlow.update({ where: { id: cur.id }, data: { status: "DIBATALKAN", voidedAt: now, voidedById: args.userId, voidReason: reason.value.reason } });
      return ok({ id: cur.id, kind: cur.kind, amount: fromCents(cur.amountCents) });
    }, TX)
    .catch(asResult);
}

// ============================================================================================================================
// Ringkasan kas (transaksi aktif saja) dan lembar pendaftaran
// ============================================================================================================================

export interface CashSummary {
  unitCount: number;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  voidedCount: number;
}

export async function cashSummary(db: Db, bumdesId: number): Promise<CashSummary> {
  const [inc, exp, units, voided] = await Promise.all([
    db.bumdesTransaction.aggregate({ where: { bumdesId, direction: "income", status: "AKTIF" }, _sum: { amount: true } }),
    db.bumdesTransaction.aggregate({ where: { bumdesId, direction: "expense", status: "AKTIF" }, _sum: { amount: true } }),
    db.bumdesUnit.count({ where: { bumdesId, status: "active" } }),
    db.bumdesTransaction.count({ where: { bumdesId, status: "DIBATALKAN" } }),
  ]);
  const totalIncome = Number(inc._sum.amount ?? 0);
  const totalExpense = Number(exp._sum.amount ?? 0);
  return { unitCount: units, totalIncome, totalExpense, netProfit: totalIncome - totalExpense, voidedCount: voided };
}

export async function registrationPack(db: Db, args: { villageId: number; bumdesId: number; today: string }) {
  const [legal, village, units] = await Promise.all([
    getLegal(db, args),
    db.village.findUnique({ where: { id: args.villageId }, select: { name: true, district: true, regency: true, province: true } }),
    db.bumdesUnit.findMany({ where: { bumdesId: args.bumdesId }, orderBy: { name: "asc" }, select: { id: true, name: true, category: true, status: true }, take: 200 }),
  ]);
  if (!legal.ok) return legal;
  return ok({ ...legal.data, village, units });
}

export const ACCOUNT_OPTIONS = ACCOUNTS;
