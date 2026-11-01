/**
 * Pencatatan pembayaran modul lain (BLT Desa, upah PKTD, angsuran KDMP) ke Buku Kas Umum sebagai satu catatan PENGELUARAN.
 * Aturan buku kas (bulan ditutup, anggaran, saldo tidak minus) dipakai ulang lewat createEntryInTx/deleteEntryInTx.
 *
 * URUTAN KUNCI (mencegah deadlock dan pembacaan basi pada MySQL REPEATABLE READ): kunci baris modul (raw, pernyataan pertama),
 * lalu kunci tahun APB Desa (apbdes_years), baru pembacaan lain. Semua alur tautan memakai urutan yang sama; alur biasa modul
 * hanya mengambil kunci modulnya dan alur BKU hanya kunci tahun, jadi tidak ada siklus.
 */
import { Prisma, type PrismaClient } from "@prisma/client";
import { cleanText, fail, isRecord, type Parsed, type Result } from "@/lib/form-input";
import { fromCents } from "@/lib/coop/loan-math";
import { accountKind, accountName, isKegiatanCode, isLeafAccountCode, kegiatanName, isChannel, type Channel } from "./catalog";
import { activeDocument, budgetMap, createEntryInTx, deleteEntryInTx, ensureYear, loadEntries, lockYear, rollbackToResult } from "./service";

type Db = Prisma.TransactionClient;

export interface PayoutChoice {
  activityCode: string;
  accountCode: string;
  channel: Channel;
  voucherNo: string;
}

/** Pilihan kegiatan, rekening, kas, dan nomor bukti dari operator. */
export function parsePayoutChoice(body: unknown): Parsed<PayoutChoice> {
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const fe: Record<string, string> = {};
  const activityCode = typeof body.activityCode === "string" ? body.activityCode.trim() : "";
  if (!isKegiatanCode(activityCode)) fe.activityCode = "Pilih kegiatan belanja dari APB Desa.";
  const accountCode = typeof body.accountCode === "string" ? body.accountCode.trim() : "";
  if (!isLeafAccountCode(accountCode) || accountKind(accountCode) !== "BELANJA") fe.accountCode = "Pilih rekening belanja (5.x) dari APB Desa.";
  if (!isChannel(body.channel)) fe.channel = "Pilih kas tunai atau rekening bank.";
  const voucher = cleanText(body.voucherNo, 60);
  if (voucher.bad || voucher.tooLong || !voucher.value) fe.voucherNo = "Nomor bukti wajib diisi (maks. 60 karakter).";
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { activityCode, accountCode, channel: body.channel as Channel, voucherNo: voucher.value! } };
}

export interface PayoutOption {
  activityCode: string;
  activityName: string;
  accountCode: string;
  accountName: string;
  budget: string;
  spent: string;
  remaining: string;
  /** Sebagian atau seluruh anggaran baris ini bersumber Dana Desa */
  hasDanaDesa: boolean;
}

/** Pasangan kegiatan-rekening belanja pada APB Desa yang berlaku beserta sisa anggarannya (Dana Desa di urutan atas). */
export async function payoutOptions(db: Db, villageId: number, year: number): Promise<{ options: PayoutOption[]; hasActiveDocument: boolean }> {
  const doc = await activeDocument(db, villageId, year);
  if (!doc) return { options: [], hasActiveDocument: false };
  const entries = await loadEntries(db, villageId, year);
  const spent = new Map<string, bigint>();
  for (const e of entries) {
    if ((e.type !== "PENGELUARAN" && e.type !== "PANJAR_KEMBALI") || !e.accountCode) continue;
    const k = `${e.activityCode ?? ""}|${e.accountCode}`;
    spent.set(k, (spent.get(k) ?? 0n) + (e.type === "PANJAR_KEMBALI" ? -e.amountCents : e.amountCents));
  }
  const dd = new Set(doc.lines.filter((l) => l.fundSource === "DD").map((l) => `${l.activityCode ?? ""}|${l.accountCode}`));
  const budget = budgetMap(doc.lines.filter((l) => l.activityCode && accountKind(l.accountCode) === "BELANJA"));
  const options = [...budget]
    .map(([k, b]) => {
      const [activityCode, accountCode] = k.split("|") as [string, string];
      const s = spent.get(k) ?? 0n;
      return { activityCode, activityName: kegiatanName(activityCode) ?? activityCode, accountCode, accountName: accountName(accountCode) ?? accountCode, budget: fromCents(b), spent: fromCents(s), remaining: fromCents(b - s), hasDanaDesa: dd.has(k) };
    })
    .sort((a, b) => Number(b.hasDanaDesa) - Number(a.hasDanaDesa) || a.activityCode.localeCompare(b.activityCode) || a.accountCode.localeCompare(b.accountCode));
  return { options, hasActiveDocument: true };
}

/**
 * Menjalankan alur tautan dalam satu transaksi dengan urutan kunci yang benar. `lockModule` harus berupa SATU pernyataan raw
 * `SELECT ... FOR UPDATE` pada baris modul. `fn` boleh melempar Rollback untuk membatalkan seluruh perubahan.
 */
export async function runPayoutTx<T>(db: PrismaClient, args: { villageId: number; year: number; lockModule: (tx: Db) => Promise<void>; fn: (tx: Db) => Promise<Result<T>> }): Promise<Result<T>> {
  if (!Number.isInteger(args.year) || args.year < 2000 || args.year > 2100) return fail(400, "Tahun di luar rentang yang didukung.");
  await ensureYear(db, args.villageId, args.year);
  return db
    .$transaction(async (tx) => {
      await args.lockModule(tx);
      await lockYear(tx, args.villageId, args.year);
      return args.fn(tx);
    }, { timeout: 15_000, maxWait: 10_000 })
    .catch(rollbackToResult);
}

export interface PostArgs {
  villageId: number;
  userId: number | null;
  year: number;
  entryDate: Date;
  choice: PayoutChoice;
  description: string;
  amountCents: bigint;
  now?: Date;
}

/** Membuat satu catatan PENGELUARAN di buku kas (kunci sudah dipegang). Mengembalikan id catatan. */
export async function postPayoutEntry(tx: Db, a: PostArgs): Promise<Result<{ id: number; voucherNo: string }>> {
  if (a.amountCents <= 0n) return fail(409, "Jumlah yang dicatat harus lebih dari nol.");
  if (a.entryDate.getUTCFullYear() !== a.year) return fail(400, "Tanggal pembayaran berada di tahun anggaran lain.");
  if (a.entryDate.getTime() > (a.now ?? new Date()).getTime() + 86_400_000) return fail(400, "Tanggal pembayaran tidak boleh di masa depan.");
  const r = await createEntryInTx(tx, {
    villageId: a.villageId,
    userId: a.userId,
    year: a.year,
    value: { entryDate: a.entryDate, voucherNo: a.choice.voucherNo, type: "PENGELUARAN", channel: a.choice.channel, activityCode: a.choice.activityCode, accountCode: a.choice.accountCode, description: a.description.slice(0, 300), amountCents: a.amountCents, taxCents: 0n, taxKind: null, bankFee: false },
  });
  return r.ok ? { ok: true, data: { id: r.data.id, voucherNo: a.choice.voucherNo } } : r;
}

/** Menghapus catatan buku kas yang berasal dari modul pembayaran (kunci sudah dipegang). */
export async function removePayoutEntry(tx: Db, villageId: number, entryId: number) {
  return deleteEntryInTx(tx, { villageId, entryId, viaPayout: true });
}

/** Nomor bukti dan jumlah catatan BKU untuk ditampilkan di modul. */
/** Rincian catatan buku kas untuk jejak audit (rekening yang dibebani, kas, tanggal). */
export interface EntryAudit {
  paidOn: string;
  activityCode: string | null;
  accountCode: string | null;
  channel: string;
}
export const auditOf = (c: PayoutChoice, paidOn: Date): EntryAudit => ({ paidOn: paidOn.toISOString().slice(0, 10), activityCode: c.activityCode, accountCode: c.accountCode, channel: c.channel });

export async function entryBrief(db: Db, villageId: number, ids: number[]): Promise<Map<number, { voucherNo: string; amount: string; entryDate: string }>> {
  if (!ids.length) return new Map();
  const rows = await db.apbdesEntry.findMany({ where: { villageId, id: { in: ids } }, select: { id: true, voucherNo: true, amountCents: true, entryDate: true } });
  return new Map(rows.map((r) => [r.id, { voucherNo: r.voucherNo, amount: fromCents(r.amountCents), entryDate: r.entryDate.toISOString().slice(0, 10) }]));
}
