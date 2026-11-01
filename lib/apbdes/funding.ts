/**
 * Pendanaan pembayaran modul (BLT Desa, PKTD, KDMP) lewat SPP (Permendagri 20/2018 Pasal 52-56): pembayaran baru dapat dicatat
 * hanya bila ada SPP yang sudah diverifikasi, disetujui, dan DIBAYAR, dengan dana yang cukup. Pembayaran yang dicatat menjadi
 * realisasi (pertanggungjawaban) SPP itu; sisa panjar dikembalikan lewat modul APBDes.
 *
 * URUTAN KUNCI untuk alur pengajuan: kunci baris modul (raw, pernyataan pertama) lalu kunci tahun APB Desa (apbdes_years).
 * Pencatatan pembayaran hanya memegang kunci modulnya: status SPP DIBAYAR tidak pernah mundur, dan semua pembayaran di satu
 * lingkup ditulis di bawah kunci modul yang sama, jadi sisa dana dapat dihitung tanpa kunci tahun.
 */
import { Prisma, type PrismaClient } from "@prisma/client";
import { cleanText, fail, invalid, isRecord, type Parsed, type Result } from "@/lib/form-input";
import { fromCents, toCents } from "@/lib/coop/loan-math";
import { SPP_STATUS, accountKind, accountName, isKegiatanCode, isLeafAccountCode, kegiatanName } from "./catalog";
import { createRequestInTx, type SppInput } from "./spp";
import { activeDocument, budgetMap, ensureYear, loadEntries, lockYear, rollbackToResult } from "./service";
import { moduleSpentBySpp } from "./spp-usage";

type Db = Prisma.TransactionClient;
export type FundingKind = "BLT" | "PKTD" | "KDMP";

const OPEN = ["DIAJUKAN", "DIVERIFIKASI", "DISETUJUI"];
const MAX_CENTS = 99_999_999_999_999n;
const rp = (c: bigint): string => `Rp${new Intl.NumberFormat("id-ID").format(c / 100n)}`;
const isoDay = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);

export interface FundingSpp {
  id: number;
  label: string;
  status: string;
  statusLabel: string;
  activityCode: string;
  activityName: string;
  gross: string;
  used: string;
  returned: string;
  /** Sisa dana yang dapat dipakai untuk pembayaran (hanya SPP berstatus dibayar) */
  available: string;
  paidAt: string | null;
}
export interface FundingView {
  spps: FundingSpp[];
  /** SPP yang sudah diajukan atau dibayar tetapi dananya belum dibayarkan kepada penerima */
  unspent: string;
  /** Kebutuhan pembayaran yang belum didanai SPP mana pun; batas atas pengajuan SPP baru */
  fundable: string;
  /** Sisa dana SPP dibayar yang dapat langsung dipakai */
  available: string;
}

interface Snapshot {
  rows: { id: number; number: number; year: number; status: string; activityCode: string; gross: bigint; used: bigint; returned: bigint; paidAt: Date | null }[];
  unspent: bigint;
}

/** Keadaan pendanaan satu lingkup (program BLT, kegiatan PKTD, atau tahun KDMP). */
async function snapshot(db: Db, villageId: number, kind: FundingKind, sourceId: number): Promise<Snapshot> {
  const reqs = await db.apbdesPayRequest.findMany({ where: { villageId, sourceKind: kind, sourceId }, include: { lines: { select: { amountCents: true } } }, orderBy: [{ paidAt: "asc" }, { id: "asc" }], take: 500 });
  if (!reqs.length) return { rows: [], unspent: 0n };
  const ids = reqs.map((r) => r.id);
  const [used, panjars] = await Promise.all([moduleSpentBySpp(db, ids), db.apbdesPanjar.findMany({ where: { villageId, requestId: { in: ids } }, select: { id: true, requestId: true } })]);
  const returnedBy = new Map<number, bigint>();
  if (panjars.length) {
    const ret = await db.apbdesEntry.groupBy({ by: ["panjarId"], where: { villageId, type: "PANJAR_KEMBALI", panjarId: { in: panjars.map((p) => p.id) } }, _sum: { amountCents: true } });
    for (const p of panjars) returnedBy.set(p.requestId, ret.find((g) => g.panjarId === p.id)?._sum.amountCents ?? 0n);
  }
  let unspent = 0n;
  const rows = reqs.map((r) => {
    const gross = r.lines.reduce((a, l) => a + l.amountCents, 0n);
    const u = used.get(r.id) ?? 0n;
    const ret = returnedBy.get(r.id) ?? 0n;
    if (OPEN.includes(r.status)) unspent += gross;
    else if (r.status === "DIBAYAR") unspent += gross - ret - u;
    return { id: r.id, number: r.number, year: r.year, status: r.status, activityCode: r.activityCode, gross, used: u, returned: ret, paidAt: r.paidAt };
  });
  return { rows, unspent: unspent < 0n ? 0n : unspent };
}

const capacity = (r: Snapshot["rows"][number]): bigint => (r.status === "DIBAYAR" ? (r.gross - r.returned - r.used > 0n ? r.gross - r.returned - r.used : 0n) : 0n);

export async function fundingOf(db: Db, villageId: number, kind: FundingKind, sourceId: number, remainingNeed: bigint): Promise<FundingView> {
  const s = await snapshot(db, villageId, kind, sourceId);
  const fundable = remainingNeed - s.unspent;
  return {
    spps: s.rows
      .map((r) => ({ id: r.id, label: `SPP ${String(r.number).padStart(3, "0")}/${r.year}`, status: r.status, statusLabel: SPP_STATUS[r.status as keyof typeof SPP_STATUS] ?? r.status, activityCode: r.activityCode, activityName: kegiatanName(r.activityCode) ?? r.activityCode, gross: fromCents(r.gross), used: fromCents(r.used), returned: fromCents(r.returned), available: fromCents(capacity(r)), paidAt: isoDay(r.paidAt) }))
      .reverse(),
    unspent: fromCents(s.unspent),
    fundable: fromCents(fundable > 0n ? fundable : 0n),
    available: fromCents(s.rows.reduce((a, r) => a + capacity(r), 0n)),
  };
}

/**
 * Memilih SPP yang menanggung satu pembayaran: SPP berstatus dibayar tertua yang sisa dananya cukup dan sudah dibayar pada atau
 * sebelum tanggal pembayaran. Pembayaran tidak dipecah antar SPP.
 */
export async function pickFunding(db: Db, args: { villageId: number; kind: FundingKind; sourceId: number; amountCents: bigint; paidOn: Date; what: string }): Promise<{ ok: true; sppId: number } | { ok: false; message: string }> {
  const s = await snapshot(db, args.villageId, args.kind, args.sourceId);
  const paid = s.rows.filter((r) => r.status === "DIBAYAR");
  if (!paid.length) {
    const open = s.rows.filter((r) => OPEN.includes(r.status)).length;
    return { ok: false, message: open ? `${args.what} belum dapat dicatat: SPP yang diajukan belum dibayar. Selesaikan verifikasi, persetujuan Kepala Desa, dan pembayarannya di menu APBDes (SPP).` : `${args.what} belum dapat dicatat: belum ada SPP yang menjadi dasar pembayaran. Ajukan SPP lebih dulu dan selesaikan sampai dibayar (Permendagri 20/2018 Pasal 52–56).` };
  }
  const dated = paid.filter((r) => r.paidAt === null || r.paidAt.getTime() <= args.paidOn.getTime());
  if (!dated.length) return { ok: false, message: `Tanggal pembayaran ${isoDay(args.paidOn)} lebih awal dari tanggal SPP dibayar (${isoDay(paid[0]!.paidAt)}). Pembayaran kepada penerima dilakukan setelah SPP dibayar.` };
  const fit = dated.find((r) => capacity(r) >= args.amountCents);
  if (fit) return { ok: true, sppId: fit.id };
  const best = dated.reduce((a, r) => (capacity(r) > a ? capacity(r) : a), 0n);
  return { ok: false, message: `Dana SPP tidak cukup untuk ${args.what.toLowerCase()} sebesar ${rp(args.amountCents)}. Sisa dana pada satu SPP paling banyak ${rp(best)}. Ajukan SPP tambahan.` };
}

// ---- Pengajuan SPP dari modul

export interface FundingRequestInput {
  activityCode: string;
  accountCode: string;
  amountCents: bigint;
  executorName: string | null;
  payee: string | null;
  hasReceipt: boolean;
  workPeriod: string | null;
}

export function parseFundingRequest(kind: FundingKind, body: unknown): Parsed<FundingRequestInput> {
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const fe: Record<string, string> = {};
  const activityCode = typeof body.activityCode === "string" ? body.activityCode.trim() : "";
  if (!isKegiatanCode(activityCode)) fe.activityCode = "Pilih kegiatan belanja dari APB Desa.";
  const accountCode = typeof body.accountCode === "string" ? body.accountCode.trim() : "";
  if (!isLeafAccountCode(accountCode) || accountKind(accountCode) !== "BELANJA") fe.accountCode = "Pilih rekening belanja (5.x) dari APB Desa.";
  const amount = typeof body.amount === "string" || typeof body.amount === "number" ? toCents(body.amount) : null;
  if (amount === null || amount <= 0n || amount > MAX_CENTS) fe.amount = "Jumlah SPP harus angka rupiah lebih dari nol.";
  const exec = cleanText(body.executorName, 150);
  const payee = cleanText(body.payee, 150);
  const period = cleanText(body.workPeriod, 100);
  if (exec.bad || exec.tooLong) fe.executorName = "Nama pelaksana maksimal 150 karakter.";
  if (payee.bad || payee.tooLong) fe.payee = "Penerima pembayaran maksimal 150 karakter.";
  if (period.bad || period.tooLong) fe.workPeriod = "Periode maksimal 100 karakter.";
  if (kind === "KDMP" && !payee.value) fe.payee = "Isi penerima pembayaran (penyedia).";
  if (kind === "KDMP" && body.hasReceipt !== true) fe.hasReceipt = "Lampirkan bukti penerimaan barang/jasa dan pernyataan tanggung jawab belanja, lalu centang pernyataan ini (Pasal 55).";
  if (kind !== "KDMP" && !exec.value) fe.executorName = "Isi nama Kaur/Kasi penerima panjar (pelaksana swakelola).";
  if (Object.keys(fe).length || amount === null) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { activityCode, accountCode, amountCents: amount, executorName: exec.value, payee: payee.value, hasReceipt: body.hasReceipt === true, workPeriod: period.value } };
}

export interface RequestArgs {
  villageId: number;
  userId: number | null;
  kind: FundingKind;
  sourceId: number;
  year: number;
  input: unknown;
  now?: Date;
  /** Satu pernyataan raw SELECT ... FOR UPDATE pada baris modul. */
  lockModule: (tx: Db) => Promise<void>;
  /** Kebutuhan pembayaran yang belum dibayarkan (sen); null bila lingkup tidak ditemukan atau belum dapat didanai. */
  remainingNeed: (tx: Db) => Promise<{ cents: bigint } | { refuse: string; status?: number }>;
  /** Uraian baris SPP. */
  describe: string;
}

/** Mengajukan SPP dari modul. Jumlah dibatasi pada kebutuhan yang belum didanai; aturan SPP lain (DPA disetujui, anggaran, RAK) diperiksa createRequestInTx. */
export async function requestFunding(db: PrismaClient, a: RequestArgs): Promise<Result<{ id: number; number: number; amount: string }>> {
  const p = parseFundingRequest(a.kind, a.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  if (!Number.isInteger(a.year) || a.year < 2000 || a.year > 2100) return fail(400, "Tahun di luar rentang yang didukung.");
  await ensureYear(db, a.villageId, a.year);
  return db
    .$transaction(
      async (tx) => {
        await a.lockModule(tx);
        await lockYear(tx, a.villageId, a.year);
        const need = await a.remainingNeed(tx);
        if ("refuse" in need) return fail(need.status ?? 409, need.refuse);
        const s = await snapshot(tx, a.villageId, a.kind, a.sourceId);
        const fundable = need.cents - s.unspent;
        if (v.amountCents > fundable) return invalid({ errors: [fundable > 0n ? `Jumlah SPP melebihi kebutuhan yang belum didanai (${rp(fundable)}).` : "Seluruh kebutuhan pembayaran sudah didanai SPP yang diajukan atau belum habis dibayarkan."], fieldErrors: { amount: fundable > 0n ? `Maksimal ${rp(fundable)}` : "Tidak ada kebutuhan yang belum didanai" } });
        const value: SppInput = {
          activityCode: v.activityCode,
          mode: a.kind === "KDMP" ? "PENYEDIA" : "SWAKELOLA",
          executorName: a.kind === "KDMP" ? null : v.executorName,
          workPeriod: v.workPeriod,
          hasReceipt: a.kind === "KDMP" ? v.hasReceipt : false,
          lines: [{ accountCode: v.accountCode, description: a.describe, payee: a.kind === "KDMP" ? v.payee : v.executorName, amountCents: v.amountCents, taxCents: 0n, taxKind: null }],
        };
        const r = await createRequestInTx(tx, { villageId: a.villageId, userId: a.userId, year: a.year, value, now: a.now ?? new Date(), source: { kind: a.kind, id: a.sourceId } });
        return r.ok ? { ok: true as const, data: { ...r.data, amount: fromCents(v.amountCents) } } : r;
      },
      { timeout: 15_000, maxWait: 10_000 },
    )
    .catch(rollbackToResult);
}

// ---- Pilihan belanja untuk dialog pengajuan

export interface BudgetOption {
  activityCode: string;
  activityName: string;
  accountCode: string;
  accountName: string;
  budget: string;
  spent: string;
  remaining: string;
  /** Sebagian atau seluruh anggaran baris ini bersumber Dana Desa */
  hasDanaDesa: boolean;
  /** DPA kegiatan sudah disetujui Kepala Desa (syarat SPP) */
  dpaApproved: boolean;
}

/** Pasangan kegiatan-rekening belanja pada APB Desa yang berlaku beserta sisa anggaran dan status DPA (Dana Desa di urutan atas). */
export async function budgetOptions(db: Db, villageId: number, year: number): Promise<{ options: BudgetOption[]; hasActiveDocument: boolean }> {
  const doc = await activeDocument(db, villageId, year);
  if (!doc) return { options: [], hasActiveDocument: false };
  const [entries, plans] = await Promise.all([loadEntries(db, villageId, year), db.apbdesActivityPlan.findMany({ where: { villageId, year }, select: { activityCode: true, status: true } })]);
  const spent = new Map<string, bigint>();
  for (const e of entries) {
    if ((e.type !== "PENGELUARAN" && e.type !== "PANJAR_KEMBALI") || !e.accountCode) continue;
    const k = `${e.activityCode ?? ""}|${e.accountCode}`;
    spent.set(k, (spent.get(k) ?? 0n) + (e.type === "PANJAR_KEMBALI" ? -e.amountCents : e.amountCents));
  }
  const approved = new Set(plans.filter((x) => x.status === "DISETUJUI").map((x) => x.activityCode));
  const dd = new Set(doc.lines.filter((l) => l.fundSource === "DD").map((l) => `${l.activityCode ?? ""}|${l.accountCode}`));
  const budget = budgetMap(doc.lines.filter((l) => l.activityCode && accountKind(l.accountCode) === "BELANJA"));
  const options = [...budget]
    .map(([k, b]) => {
      const [activityCode, accountCode] = k.split("|") as [string, string];
      const s = spent.get(k) ?? 0n;
      return { activityCode, activityName: kegiatanName(activityCode) ?? activityCode, accountCode, accountName: accountName(accountCode) ?? accountCode, budget: fromCents(b), spent: fromCents(s), remaining: fromCents(b - s), hasDanaDesa: dd.has(k), dpaApproved: approved.has(activityCode) };
    })
    .sort((a, b) => Number(b.hasDanaDesa) - Number(a.hasDanaDesa) || Number(b.dpaApproved) - Number(a.dpaApproved) || a.activityCode.localeCompare(b.activityCode) || a.accountCode.localeCompare(b.accountCode));
  return { options, hasActiveDocument: true };
}
