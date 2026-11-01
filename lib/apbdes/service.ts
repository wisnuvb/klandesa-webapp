/**
 * Keuangan desa menurut Permendagri 20/2018: APB Desa (awal dan perubahan), Buku Kas Umum, penutupan bulan.
 * Semua perhitungan uang memakai sen (BigInt). Perubahan Buku Kas Umum dilakukan dalam transaksi yang mengunci
 * baris pengaturan tahun sebagai pernyataan PERTAMA (lihat catatan di waste-bank.ts), supaya dua petugas yang mencatat
 * bersamaan tidak sama-sama lolos pemeriksaan saldo atau pagu anggaran.
 */
import { Prisma, type PrismaClient } from "@prisma/client";
import { cleanText, fail, invalid, isoDay, type Result } from "@/lib/form-input";
import { fromCents, type Cents } from "@/lib/coop/loan-math";
import { LIMITS, accountKind, activityOptions, isKegiatanCode, kegiatanName, accountName } from "./catalog";
import { checkLedger, monthOf, type LedgerEntry } from "./ledger";
import { budgetBalance, type BudgetLine } from "./reports";
import { parseEntryInput, parseLineInput, parseSettingsInput, type EntryInput } from "./schema";

type Db = Prisma.TransactionClient;
export type Ok<T> = { ok: true; data: T };
export const ok = <T>(data: T): Ok<T> => ({ ok: true, data });
export const bad = (status: number, field: string, msg: string) => ({ ok: false as const, status, errors: [msg], fieldErrors: { [field]: msg } });

const validYear = (y: number): boolean => Number.isInteger(y) && y >= 2000 && y <= 2100;

// ---- Pengaturan tahun anggaran

export async function ensureYear(db: Db, villageId: number, year: number) {
  await db.apbdesYear.createMany({ data: [{ villageId, year }], skipDuplicates: true });
  return db.apbdesYear.findUniqueOrThrow({ where: { villageId_year: { villageId, year } } });
}

export async function saveSettings(db: PrismaClient, args: { villageId: number; year: number; input: unknown }): Promise<Result<unknown>> {
  if (!validYear(args.year)) return fail(400, "Tahun tidak valid.");
  const p = parseSettingsInput(args.input);
  if (!p.ok) return invalid(p);
  await ensureYear(db, args.villageId, args.year);
  const row = await db.apbdesYear.update({ where: { villageId_year: { villageId: args.villageId, year: args.year } }, data: p.value });
  return ok(settingsView(row));
}

function settingsView(r: { year: number; bankName: string | null; bankBranch: string | null; bankAccountNo: string | null; villageHeadName: string | null; secretaryName: string | null; treasurerName: string | null }) {
  return {
    year: r.year,
    bankName: r.bankName,
    bankBranch: r.bankBranch,
    bankAccountNo: r.bankAccountNo,
    villageHeadName: r.villageHeadName,
    secretaryName: r.secretaryName,
    treasurerName: r.treasurerName,
  };
}

// ---- Dokumen APB Desa

export interface DocumentSummary {
  id: number;
  year: number;
  version: number;
  label: string;
  status: string;
  regulationNumber: string | null;
  regulationDate: string | null;
  exceptionalReason: string | null;
  lineCount: number;
}

const docLabel = (version: number): string => (version === 0 ? "APB Desa" : `Perubahan APB Desa ke-${version}`);

export async function listDocuments(db: Db, villageId: number, year: number): Promise<DocumentSummary[]> {
  const docs = await db.apbdesDocument.findMany({ where: { villageId, year }, orderBy: { version: "asc" }, include: { _count: { select: { lines: true } } } });
  return docs.map((d) => ({
    id: d.id,
    year: d.year,
    version: d.version,
    label: docLabel(d.version),
    status: d.status,
    regulationNumber: d.regulationNumber,
    regulationDate: isoDay(d.regulationDate),
    exceptionalReason: d.exceptionalReason,
    lineCount: d._count.lines,
  }));
}

export interface LineView {
  id: number;
  activityCode: string | null;
  activityName: string | null;
  accountCode: string;
  accountName: string;
  description: string;
  amount: string;
  fundSource: string | null;
}

const lineView = (l: { id: number; activityCode: string | null; accountCode: string; description: string; amountCents: bigint; fundSource: string | null }): LineView => ({
  id: l.id,
  activityCode: l.activityCode,
  activityName: l.activityCode ? kegiatanName(l.activityCode) : null,
  accountCode: l.accountCode,
  accountName: accountName(l.accountCode) ?? l.accountCode,
  description: l.description,
  amount: fromCents(l.amountCents),
  fundSource: l.fundSource,
});

export const toBudgetLines = (lines: { activityCode: string | null; accountCode: string; description: string; amountCents: bigint; fundSource: string | null }[]): BudgetLine[] =>
  lines.map((l) => ({ activityCode: l.activityCode, accountCode: l.accountCode, description: l.description, amountCents: l.amountCents, fundSource: l.fundSource }));

export async function getDocument(db: Db, villageId: number, id: number): Promise<Result<unknown>> {
  const d = await db.apbdesDocument.findFirst({ where: { id, villageId }, include: { lines: { orderBy: [{ activityCode: "asc" }, { accountCode: "asc" }, { id: "asc" }] } } });
  if (!d) return fail(404, "Dokumen tidak ditemukan.");
  const bal = budgetBalance(toBudgetLines(d.lines));
  return ok({
    id: d.id,
    year: d.year,
    version: d.version,
    label: docLabel(d.version),
    status: d.status,
    regulationNumber: d.regulationNumber,
    regulationDate: isoDay(d.regulationDate),
    exceptionalReason: d.exceptionalReason,
    lines: d.lines.map(lineView),
    totals: { income: fromCents(bal.income), expense: fromCents(bal.expense), financingIn: fromCents(bal.financingIn), financingOut: fromCents(bal.financingOut), difference: fromCents(bal.difference) },
  });
}

export async function createDocument(db: PrismaClient, args: { villageId: number; year: number; userId: number | null }): Promise<Result<{ id: number }>> {
  if (!validYear(args.year)) return fail(400, "Tahun tidak valid.");
  const exists = await db.apbdesDocument.findFirst({ where: { villageId: args.villageId, year: args.year, version: 0 }, select: { id: true } });
  if (exists) return fail(409, `APB Desa ${args.year} sudah ada. Untuk mengubahnya, buat Perubahan APB Desa.`);
  try {
    const d = await db.apbdesDocument.create({ data: { villageId: args.villageId, year: args.year, version: 0, createdById: args.userId } });
    return ok({ id: d.id });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail(409, `APB Desa ${args.year} sudah ada.`);
    throw e;
  }
}

/** Perubahan APB Desa: salinan APB Desa terakhir yang ditetapkan. Hanya sekali setahun kecuali keadaan luar biasa (Pasal 40 ayat 2). */
export async function createAmendment(db: PrismaClient, args: { villageId: number; year: number; userId: number | null; exceptionalReason?: unknown }): Promise<Result<{ id: number; version: number }>> {
  if (!validYear(args.year)) return fail(400, "Tahun tidak valid.");
  await ensureYear(db, args.villageId, args.year);
  return db.$transaction(async (tx) => {
    await lockYear(tx, args.villageId, args.year);
    const docs = await tx.apbdesDocument.findMany({ where: { villageId: args.villageId, year: args.year }, orderBy: { version: "asc" }, include: { lines: true } });
    const adopted = docs.filter((d) => d.status === "DITETAPKAN");
    const last = adopted[adopted.length - 1];
    if (!last) return fail(409, "Belum ada APB Desa yang ditetapkan untuk tahun ini.");
    if (docs.some((d) => d.status === "DRAFT")) return fail(409, "Masih ada dokumen draf. Tetapkan atau hapus dulu sebelum membuat perubahan baru.");
    const version = docs[docs.length - 1]!.version + 1;
    const reason = cleanText(args.exceptionalReason, 500);
    if (version >= 2 && (!reason.value || reason.value.length < 10 || reason.tooLong || reason.bad)) {
      return bad(400, "exceptionalReason", "Perubahan APB Desa hanya sekali setahun kecuali keadaan luar biasa. Tuliskan keadaan luar biasanya (minimal 10 karakter).");
    }
    const d = await tx.apbdesDocument.create({ data: { villageId: args.villageId, year: args.year, version, createdById: args.userId, exceptionalReason: version >= 2 ? reason.value : null } });
    await tx.apbdesLine.createMany({
      data: last.lines.map((l) => ({ documentId: d.id, villageId: args.villageId, activityCode: l.activityCode, accountCode: l.accountCode, description: l.description, amountCents: l.amountCents, fundSource: l.fundSource })),
    });
    return ok({ id: d.id, version });
  });
}

async function draftDocument(db: Db, villageId: number, id: number) {
  const d = await db.apbdesDocument.findFirst({ where: { id, villageId } });
  if (!d) return { err: fail(404, "Dokumen tidak ditemukan.") } as const;
  if (d.status !== "DRAFT") return { err: fail(409, "Dokumen yang sudah ditetapkan tidak dapat diubah. Buat Perubahan APB Desa.") } as const;
  return { doc: d } as const;
}

export async function addLine(db: PrismaClient, args: { villageId: number; documentId: number; input: unknown }): Promise<Result<LineView>> {
  const p = parseLineInput(args.input);
  if (!p.ok) return invalid(p);
  const g = await draftDocument(db, args.villageId, args.documentId);
  if (g.err) return g.err;
  if ((await db.apbdesLine.count({ where: { documentId: args.documentId } })) >= LIMITS.linesPerDocument) return fail(409, `Satu dokumen maksimal ${LIMITS.linesPerDocument} baris anggaran.`);
  const l = await db.apbdesLine.create({ data: { documentId: args.documentId, villageId: args.villageId, ...p.value } });
  return ok(lineView(l));
}

export async function updateLine(db: PrismaClient, args: { villageId: number; documentId: number; lineId: number; input: unknown }): Promise<Result<LineView>> {
  const p = parseLineInput(args.input);
  if (!p.ok) return invalid(p);
  const g = await draftDocument(db, args.villageId, args.documentId);
  if (g.err) return g.err;
  const res = await db.apbdesLine.updateMany({ where: { id: args.lineId, documentId: args.documentId }, data: p.value });
  if (res.count === 0) return fail(404, "Baris anggaran tidak ditemukan.");
  return ok(lineView(await db.apbdesLine.findUniqueOrThrow({ where: { id: args.lineId } })));
}

export async function deleteLine(db: PrismaClient, args: { villageId: number; documentId: number; lineId: number }): Promise<Result<{ id: number }>> {
  const g = await draftDocument(db, args.villageId, args.documentId);
  if (g.err) return g.err;
  const res = await db.apbdesLine.deleteMany({ where: { id: args.lineId, documentId: args.documentId } });
  return res.count === 0 ? fail(404, "Baris anggaran tidak ditemukan.") : ok({ id: args.lineId });
}

export async function deleteDocument(db: PrismaClient, args: { villageId: number; documentId: number }): Promise<Result<{ id: number }>> {
  const g = await draftDocument(db, args.villageId, args.documentId);
  if (g.err) return g.err;
  await db.apbdesDocument.delete({ where: { id: args.documentId } });
  return ok({ id: args.documentId });
}

/** Menetapkan dokumen setelah Perdes disahkan. Ketidakseimbangan anggaran hanya diperingatkan: Perdes tetap yang berlaku. */
export async function adoptDocument(db: PrismaClient, args: { villageId: number; documentId: number; regulationNumber: unknown; regulationDate: unknown; now?: Date }): Promise<Result<{ warnings: string[] }>> {
  const fe: Record<string, string> = {};
  const num = cleanText(args.regulationNumber, 100);
  if (num.bad || num.tooLong || !num.value) fe.regulationNumber = "Isi nomor Peraturan Desa (maks. 100 karakter)";
  let date: Date | null = null;
  if (typeof args.regulationDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.regulationDate)) {
    const d = new Date(`${args.regulationDate}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === args.regulationDate) date = d;
  }
  if (!date) fe.regulationDate = "Tanggal penetapan tidak valid";
  else if (date.getTime() > (args.now ?? new Date()).getTime() + 86_400_000) fe.regulationDate = "Tanggal penetapan tidak boleh di masa depan";
  if (Object.keys(fe).length) return { ok: false, status: 400, errors: Object.values(fe), fieldErrors: fe };

  return db.$transaction(async (tx) => {
    const g = await draftDocument(tx, args.villageId, args.documentId);
    if (g.err) return g.err;
    const d = g.doc;
    const later = await tx.apbdesDocument.count({ where: { villageId: args.villageId, year: d.year, version: { gt: d.version }, status: "DITETAPKAN" } });
    if (later > 0) return fail(409, "Sudah ada perubahan yang lebih baru yang ditetapkan.");
    const lines = await tx.apbdesLine.findMany({ where: { documentId: d.id } });
    if (lines.length === 0) return fail(409, "Dokumen belum berisi baris anggaran.");
    const bal = budgetBalance(toBudgetLines(lines));
    if (bal.income === 0n || bal.expense === 0n) return fail(409, "Isi dulu anggaran pendapatan dan belanja.");
    const warnings: string[] = [];
    if (bal.difference !== 0n) {
      warnings.push(`Anggaran belum seimbang: pendapatan + penerimaan pembiayaan - belanja - pengeluaran pembiayaan = Rp${fromCents(bal.difference)}. Biasanya defisit ditutup dengan SiLPA tahun lalu dan surplus dipakai untuk pengeluaran pembiayaan. Periksa dengan Peraturan Desa yang disahkan.`);
    }
    await tx.apbdesDocument.update({ where: { id: d.id }, data: { status: "DITETAPKAN", regulationNumber: num.value, regulationDate: date } });
    return ok({ warnings });
  });
}

/** APB Desa yang berlaku untuk pencatatan dan laporan: versi tertinggi yang sudah ditetapkan. */
export async function activeDocument(db: Db, villageId: number, year: number) {
  return db.apbdesDocument.findFirst({ where: { villageId, year, status: "DITETAPKAN" }, orderBy: { version: "desc" }, include: { lines: true } });
}

// ---- Buku Kas Umum

export const toLedger = (e: { id: number; entryDate: Date; voucherNo: string; type: string; channel: string; activityCode: string | null; accountCode: string | null; description: string; amountCents: bigint; taxCents: bigint; taxKind: string | null; bankFee: boolean; requestId?: number | null; panjarId?: number | null }): LedgerEntry => ({
  id: e.id,
  entryDate: isoDay(e.entryDate)!,
  voucherNo: e.voucherNo,
  type: e.type as LedgerEntry["type"],
  channel: e.channel as LedgerEntry["channel"],
  activityCode: e.activityCode,
  accountCode: e.accountCode,
  description: e.description,
  amountCents: e.amountCents,
  taxCents: e.taxCents,
  taxKind: e.taxKind,
  bankFee: e.bankFee,
  requestId: e.requestId ?? null,
  panjarId: e.panjarId ?? null,
});

export async function loadEntries(db: Db, villageId: number, year: number): Promise<LedgerEntry[]> {
  const rows = await db.apbdesEntry.findMany({ where: { villageId, year }, orderBy: [{ entryDate: "asc" }, { id: "asc" }] });
  return rows.map(toLedger);
}

export interface EntryView {
  id: number;
  entryDate: string;
  voucherNo: string;
  type: string;
  channel: string;
  activityCode: string | null;
  accountCode: string | null;
  accountName: string | null;
  description: string;
  amount: string;
  tax: string;
  taxKind: string | null;
  bankFee: boolean;
  locked: boolean;
  /** Berasal dari SPP, panjar, atau pembayaran modul lain: tidak diubah/dihapus lewat formulir umum */
  linked: boolean;
  /** Berasal dari pembayaran BLT, upah PKTD, atau angsuran KDMP (diubah lewat modul itu) */
  fromPayout: boolean;
}

export const entryView = (e: LedgerEntry, closed: Set<number>, payoutIds: Set<number> = new Set()): EntryView => ({
  id: e.id,
  entryDate: e.entryDate,
  voucherNo: e.voucherNo,
  type: e.type,
  channel: e.channel,
  activityCode: e.activityCode,
  accountCode: e.accountCode,
  accountName: e.accountCode ? accountName(e.accountCode) : null,
  description: e.description,
  amount: fromCents(e.amountCents),
  tax: fromCents(e.taxCents),
  taxKind: e.taxKind,
  bankFee: e.bankFee,
  locked: closed.has(monthOf(e.entryDate)),
  linked: Boolean(e.requestId) || Boolean(e.panjarId) || payoutIds.has(e.id),
  fromPayout: payoutIds.has(e.id),
});

export async function closedMonths(db: Db, villageId: number, year: number): Promise<Set<number>> {
  const rows = await db.apbdesMonthClose.findMany({ where: { villageId, year }, select: { month: true } });
  return new Set(rows.map((r) => r.month));
}

/** Kunci baris pengaturan tahun. HARUS pernyataan pertama dalam transaksi. */
export async function lockYear(tx: Db, villageId: number, year: number): Promise<void> {
  await tx.$queryRaw`SELECT id FROM apbdes_years WHERE villageId = ${villageId} AND year = ${year} FOR UPDATE`;
}

/** Pemeriksaan yang bergantung pada seluruh Buku Kas Umum tahun itu: saldo tidak boleh minus, belanja tidak melebihi anggaran. */
export function checkAll(entries: LedgerEntry[], budgetByKey: Map<string, Cents> | null, capKey?: string): string | null {
  const bal = checkLedger(entries);
  if (bal) return bal;
  if (budgetByKey) {
    const spent = new Map<string, Cents>();
    for (const e of entries) {
      if ((e.type !== "PENGELUARAN" && e.type !== "PANJAR_KEMBALI") || !e.accountCode) continue;
      const k = `${e.activityCode ?? ""}|${e.accountCode}`;
      spent.set(k, (spent.get(k) ?? 0n) + (e.type === "PANJAR_KEMBALI" ? -e.amountCents : e.amountCents));
    }
    for (const [k, v] of spent) {
      if (capKey !== undefined && k !== capKey) continue; // pagu lama yang sudah terlewati oleh perubahan tidak menghalangi catatan lain
      const cap = budgetByKey.get(k) ?? 0n;
      if (v > cap) {
        const [act, acc] = k.split("|");
        return `Belanja melebihi anggaran pada ${act ? `kegiatan ${act}, ` : ""}rekening ${acc} (anggaran Rp${fromCents(cap)}, belanja menjadi Rp${fromCents(v)}). Pergeseran antar rincian memerlukan Perubahan APB Desa atau Peraturan Kepala Desa tentang penjabaran perubahan.`;
      }
    }
  }
  return null;
}

export function budgetMap(lines: { activityCode: string | null; accountCode: string; amountCents: bigint }[]): Map<string, Cents> {
  const m = new Map<string, Cents>();
  for (const l of lines) {
    const k = `${l.activityCode ?? ""}|${l.accountCode}`;
    m.set(k, (m.get(k) ?? 0n) + l.amountCents);
  }
  return m;
}

/** Catatan pada bulan terbuka yang mendahului bulan tertutup akan menggeser saldo awal bulan tertutup itu. */
const LATER_CLOSED_MSG = (closed: Set<number>, month: number): string | null => {
  const later = [...closed].filter((m) => m > month).sort((a, b) => a - b)[0];
  return later === undefined ? null : `Bulan ke-${later} sudah ditutup. Catatan pada bulan ke-${month} akan menggeser saldo bulan itu; buka kembali bulan yang lebih akhir dulu.`;
};

const LINKED_MSG = "Catatan ini dibuat dari SPP atau panjar. Ubahnya lewat SPP atau panjar yang bersangkutan.";

const LOCKED_MSG = (month: number) => `Buku kas bulan ke-${month} sudah ditutup. Minta pembukaan kembali bila ada koreksi.`;

/**
 * Membuat catatan Buku Kas Umum di dalam transaksi pemanggil. Pemanggil WAJIB sudah memegang kunci tahun (lockYear) sebelum
 * pembacaan apa pun. Melempar Rollback bila ada pemeriksaan yang gagal (buku kas ditutup, melebihi anggaran, saldo minus).
 */
export async function createEntryInTx(tx: Db, args: { villageId: number; userId: number | null; year: number; value: EntryInput }): Promise<Result<{ id: number }>> {
  const { villageId, userId, year, value } = args;
  const month = value.entryDate.getUTCMonth() + 1;
  const closed = await closedMonths(tx, villageId, year);
  if (closed.has(month)) return fail(409, LOCKED_MSG(month));
  const later = LATER_CLOSED_MSG(closed, month);
  if (later) return fail(409, later);
  const existing = await loadEntries(tx, villageId, year);
  if (existing.length >= LIMITS.entriesPerYear) return fail(409, `Satu tahun anggaran maksimal ${LIMITS.entriesPerYear} catatan.`);

  let budget: Map<string, Cents> | null = null;
  if (value.type === "PENGELUARAN") {
    const doc = await activeDocument(tx, villageId, year);
    if (!doc) return bad(409, "accountCode", "APB Desa tahun ini belum ditetapkan, sehingga belanja belum dapat dicatat.");
    budget = budgetMap(doc.lines);
    const key = `${value.activityCode ?? ""}|${value.accountCode}`;
    if (!budget.has(key)) return bad(409, "accountCode", "Rekening dan kegiatan ini tidak ada di APB Desa yang berlaku. Tambahkan lewat Perubahan APB Desa.");
  }
  const row = await tx.apbdesEntry.create({ data: { villageId, year, createdById: userId, ...value } });
  const err = checkAll([...existing, toLedger(row)], budget, `${value.activityCode ?? ""}|${value.accountCode}`);
  if (err) throw new Rollback(err);
  return ok({ id: row.id });
}

export async function addEntry(db: PrismaClient, args: { villageId: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<{ id: number }>> {
  const now = args.now ?? new Date();
  const p = parseEntryInput(args.input, now);
  if (!p.ok) return invalid(p);
  const year = p.value.entryDate.getUTCFullYear();
  if (!validYear(year)) return fail(400, "Tanggal di luar rentang tahun anggaran yang didukung.");
  await ensureYear(db, args.villageId, year);
  return db.$transaction(async (tx) => {
    await lockYear(tx, args.villageId, year);
    return createEntryInTx(tx, { villageId: args.villageId, userId: args.userId, year, value: p.value });
  }).catch(rollbackToResult);
}

/** Apakah catatan ini dibuat dari pembayaran BLT, upah PKTD, atau angsuran KDMP (dikelola lewat modul itu). */
export async function isPayoutLinked(tx: Db, entryId: number): Promise<boolean> {
  const [a, b, c] = await Promise.all([
    tx.bltPayment.count({ where: { bkuEntryId: entryId } }),
    tx.pktdWorkDay.count({ where: { bkuEntryId: entryId } }),
    tx.kdmpInstallment.count({ where: { bkuEntryId: entryId } }),
  ]);
  return a + b + c > 0;
}
/** Id catatan buku kas satu tahun yang berasal dari pembayaran modul lain. */
export async function payoutLinkedIds(db: Db, villageId: number, year: number): Promise<Set<number>> {
  const where = { bkuEntryId: { not: null }, villageId } as const;
  const [a, b, c] = await Promise.all([
    db.bltPayment.findMany({ where: { ...where, bkuEntry: { year } }, select: { bkuEntryId: true }, distinct: ["bkuEntryId"] }),
    db.pktdWorkDay.findMany({ where: { ...where, bkuEntry: { year } }, select: { bkuEntryId: true }, distinct: ["bkuEntryId"] }),
    db.kdmpInstallment.findMany({ where: { ...where, bkuEntry: { year } }, select: { bkuEntryId: true }, distinct: ["bkuEntryId"] }),
  ]);
  return new Set([...a, ...b, ...c].flatMap((r) => (r.bkuEntryId ? [r.bkuEntryId] : [])));
}
const PAYOUT_LINKED_MSG = "Catatan ini berasal dari pembayaran BLT, upah PKTD, atau angsuran KDMP. Ubah atau batalkan lewat modul yang bersangkutan.";

/**
 * Menghapus satu catatan di dalam transaksi pemanggil (kunci tahun sudah dipegang). `viaPayout`: dipanggil dari modul pembayaran
 * yang membuat catatan itu, jadi catatan bertaut pembayaran boleh dihapus (tautannya dilepas oleh FK SET NULL / pemanggil).
 */
export async function deleteEntryInTx(tx: Db, args: { villageId: number; entryId: number; viaPayout?: boolean }): Promise<Result<{ id: number; year: number }>> {
  const cur = await tx.apbdesEntry.findFirst({ where: { id: args.entryId, villageId: args.villageId } });
  if (!cur) return fail(404, "Catatan tidak ditemukan.");
  if (cur.requestId !== null || cur.panjarId !== null) return fail(409, LINKED_MSG);
  if (!args.viaPayout && (await isPayoutLinked(tx, cur.id))) return fail(409, PAYOUT_LINKED_MSG);
  const month = cur.entryDate.getUTCMonth() + 1;
  const closedSet = await closedMonths(tx, args.villageId, cur.year);
  if (closedSet.has(month)) return fail(409, LOCKED_MSG(month));
  const laterDel = LATER_CLOSED_MSG(closedSet, month);
  if (laterDel) return fail(409, laterDel);
  await tx.apbdesEntry.delete({ where: { id: cur.id } });
  const rest = await loadEntries(tx, args.villageId, cur.year);
  const err = checkLedger(rest);
  if (err) throw new Rollback(`Catatan ini tidak dapat dihapus karena catatan sesudahnya bergantung padanya. ${err}`);
  return ok({ id: cur.id, year: cur.year });
}

export async function deleteEntry(db: PrismaClient, args: { villageId: number; entryId: number }): Promise<Result<{ id: number }>> {
  const e = await db.apbdesEntry.findFirst({ where: { id: args.entryId, villageId: args.villageId }, select: { year: true } });
  if (!e) return fail(404, "Catatan tidak ditemukan.");
  return db.$transaction(async (tx) => {
    await lockYear(tx, args.villageId, e.year);
    const r = await deleteEntryInTx(tx, { villageId: args.villageId, entryId: args.entryId });
    return r.ok ? ok({ id: r.data.id }) : r;
  }).catch(rollbackToResult);
}

/** Mengubah catatan: tanggal baru tidak boleh pindah ke atau dari bulan yang sudah ditutup. */
export async function updateEntry(db: PrismaClient, args: { villageId: number; entryId: number; input: unknown; now?: Date }): Promise<Result<{ id: number }>> {
  const p = parseEntryInput(args.input, args.now ?? new Date());
  if (!p.ok) return invalid(p);
  const e = await db.apbdesEntry.findFirst({ where: { id: args.entryId, villageId: args.villageId }, select: { year: true } });
  if (!e) return fail(404, "Catatan tidak ditemukan.");
  const year = e.year;
  if (p.value.entryDate.getUTCFullYear() !== year) return fail(400, "Tanggal harus tetap di tahun anggaran yang sama.");
  return db.$transaction(async (tx) => {
    await lockYear(tx, args.villageId, year);
    const cur = await tx.apbdesEntry.findFirst({ where: { id: args.entryId, villageId: args.villageId } });
    if (!cur) return fail(404, "Catatan tidak ditemukan.");
    const closed = await closedMonths(tx, args.villageId, year);
    const oldMonth = cur.entryDate.getUTCMonth() + 1;
    const newMonth = p.value.entryDate.getUTCMonth() + 1;
    if (cur.requestId !== null || cur.panjarId !== null) return fail(409, LINKED_MSG);
    if (await isPayoutLinked(tx, cur.id)) return fail(409, PAYOUT_LINKED_MSG);
    if (closed.has(oldMonth)) return fail(409, LOCKED_MSG(oldMonth));
    if (closed.has(newMonth)) return fail(409, LOCKED_MSG(newMonth));
    const laterUpd = LATER_CLOSED_MSG(closed, Math.min(oldMonth, newMonth));
    if (laterUpd) return fail(409, laterUpd);
    let budget: Map<string, Cents> | null = null;
    if (p.value.type === "PENGELUARAN") {
      const doc = await activeDocument(tx, args.villageId, year);
      if (!doc) return fail(409, "APB Desa tahun ini belum ditetapkan.");
      budget = budgetMap(doc.lines);
      if (!budget.has(`${p.value.activityCode ?? ""}|${p.value.accountCode}`)) return fail(409, "Rekening dan kegiatan ini tidak ada di APB Desa yang berlaku.");
    }
    const row = await tx.apbdesEntry.update({ where: { id: cur.id }, data: p.value });
    const all = (await loadEntries(tx, args.villageId, year)).map((x) => (x.id === row.id ? toLedger(row) : x));
    const err = checkAll(all, budget, `${p.value.activityCode ?? ""}|${p.value.accountCode}`);
    if (err) throw new Rollback(err);
    return ok({ id: row.id });
  }).catch(rollbackToResult);
}

export class Rollback extends Error {}
export function rollbackToResult(e: unknown): Result<never> {
  if (e instanceof Rollback) return fail(409, e.message);
  throw e;
}

// ---- Penutupan bulan

export type MonthState = "BUKA" | "DITUTUP" | "DIVERIFIKASI" | "DISETUJUI";
export interface MonthStatus {
  month: number;
  state: MonthState;
  closedAt: string | null;
  verifiedAt: string | null;
  approvedAt: string | null;
  entryCount: number;
}

export async function monthStatuses(db: Db, villageId: number, year: number): Promise<MonthStatus[]> {
  const [closes, counts] = await Promise.all([
    db.apbdesMonthClose.findMany({ where: { villageId, year } }),
    db.apbdesEntry.findMany({ where: { villageId, year }, select: { entryDate: true } }),
  ]);
  const per = new Map<number, number>();
  for (const c of counts) per.set(c.entryDate.getUTCMonth() + 1, (per.get(c.entryDate.getUTCMonth() + 1) ?? 0) + 1);
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const c = closes.find((x) => x.month === month);
    const state: MonthState = !c ? "BUKA" : c.approvedAt ? "DISETUJUI" : c.verifiedAt ? "DIVERIFIKASI" : "DITUTUP";
    return { month, state, closedAt: c?.closedAt.toISOString() ?? null, verifiedAt: c?.verifiedAt?.toISOString() ?? null, approvedAt: c?.approvedAt?.toISOString() ?? null, entryCount: per.get(month) ?? 0 };
  });
}

export type MonthAction = "close" | "verify" | "approve" | "reopen";

export async function actOnMonth(db: PrismaClient, args: { villageId: number; userId: number | null; year: number; month: number; action: MonthAction; now?: Date; allowReopenApproved?: boolean }): Promise<Result<MonthStatus[]>> {
  const { villageId, year, month } = args;
  if (!validYear(year) || !Number.isInteger(month) || month < 1 || month > 12) return fail(400, "Bulan atau tahun tidak valid.");
  const now = args.now ?? new Date();
  await ensureYear(db, villageId, year);
  return db.$transaction(async (tx) => {
    await lockYear(tx, villageId, year);
    const cur = await tx.apbdesMonthClose.findUnique({ where: { villageId_year_month: { villageId, year, month } } });
    if (args.action === "close") {
      if (cur) return fail(409, "Bulan ini sudah ditutup.");
      if (Date.UTC(year, month, 1) > now.getTime()) return fail(409, "Buku kas baru dapat ditutup setelah bulan itu berakhir (Pasal 63).");
      const statuses = await monthStatuses(tx, villageId, year);
      const earlier = statuses.find((s) => s.month < month && s.state === "BUKA" && s.entryCount > 0);
      if (earlier) return fail(409, `Tutup dulu buku kas bulan ${earlier.month} (masih ada catatan yang belum ditutup).`);
      await tx.apbdesMonthClose.create({ data: { villageId, year, month, closedById: args.userId } });
    } else if (args.action === "verify") {
      if (!cur) return fail(409, "Tutup buku kas bulan ini dulu.");
      if (cur.verifiedAt) return fail(409, "Bulan ini sudah diverifikasi.");
      await tx.apbdesMonthClose.update({ where: { id: cur.id }, data: { verifiedAt: now, verifiedById: args.userId } });
    } else if (args.action === "approve") {
      if (!cur?.verifiedAt) return fail(409, "Bulan ini belum diverifikasi Sekretaris Desa.");
      if (cur.approvedAt) return fail(409, "Bulan ini sudah disetujui.");
      await tx.apbdesMonthClose.update({ where: { id: cur.id }, data: { approvedAt: now, approvedById: args.userId } });
    } else {
      if (!cur) return fail(409, "Bulan ini belum ditutup.");
      // Persetujuan Kepala Desa tidak boleh hilang diam-diam: hanya peran berwenang menyetujui yang dapat membatalkannya.
      if (cur.approvedAt && !args.allowReopenApproved) return fail(409, "Bulan ini sudah disetujui Kepala Desa. Pembukaan kembali memerlukan wewenang persetujuan.");
      const later = await tx.apbdesMonthClose.count({ where: { villageId, year, month: { gt: month } } });
      if (later > 0) return fail(409, "Buka kembali bulan yang lebih akhir dulu.");
      await tx.apbdesMonthClose.delete({ where: { id: cur.id } });
    }
    return ok(await monthStatuses(tx, villageId, year));
  });
}

export { activityOptions, isKegiatanCode, accountKind };
