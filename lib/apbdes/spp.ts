/**
 * Surat Permintaan Pembayaran (SPP) dan panjar kegiatan swakelola menurut Permendagri 20/2018 Pasal 52-56 dan 66,
 * Lampiran M.1, M.2, Q.3. Alur: Kaur/Kasi mengajukan; Sekretaris Desa memverifikasi (Pasal 55 ayat 3); Kepala Desa menyetujui
 * (ayat 4); Kaur Keuangan membayar (ayat 5). Pembayaran menghasilkan catatan Buku Kas Umum dan, untuk swakelola, panjar yang
 * harus dipertanggungjawabkan atau dikembalikan dalam 10 hari kerja (Pasal 54). Uang dalam sen (BigInt).
 */
import { Prisma, type PrismaClient } from "@prisma/client";
import { cleanText, fail, future, invalid, isRecord, isoDay, parseIsoDate, type Parsed, type Result } from "@/lib/form-input";
import { fromCents, toCents, type Cents } from "@/lib/coop/loan-math";
import { accountKind, accountName, isChannel, isKegiatanCode, isLeafAccountCode, isTaxKind, kegiatanName, type Channel, type Mode, type SppStatus } from "./catalog";
import { plannedThrough } from "./dpa";
import { lockModuleRow, moduleSpentBySpp } from "./spp-usage";
import { Rollback, activeDocument, budgetMap, checkAll, closedMonths, ensureYear, loadEntries, lockYear, ok, rollbackToResult, toLedger } from "./service";

export const SPP_LIMITS = { linesPerRequest: 50, requestsPerYear: 5000, workDays: 10 } as const;

const money = (raw: unknown, allowZero = false): Cents | null => {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const v = toCents(raw);
  return v === null || (!allowZero && v <= 0n) ? null : v;
};

/** Tambah hari kerja (Senin-Jumat; hari libur nasional tidak dikenali, jadi tenggat bisa lebih awal dari yang sebenarnya). */
export function addWorkingDays(from: Date, n: number): Date {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6) left -= 1;
  }
  return d;
}

export interface SppLineInput {
  accountCode: string;
  description: string;
  payee: string | null;
  amountCents: Cents;
  taxCents: Cents;
  taxKind: string | null;
}
export interface SppInput {
  activityCode: string;
  mode: Mode;
  executorName: string | null;
  workPeriod: string | null;
  hasReceipt: boolean;
  lines: SppLineInput[];
}

export function parseSppInput(body: unknown): Parsed<SppInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Isian tidak terbaca"], fieldErrors: {} };
  const activityCode = typeof body.activityCode === "string" ? body.activityCode.trim() : "";
  if (!isKegiatanCode(activityCode)) fe.activityCode = "Pilih kegiatan";
  const mode = body.mode === "SWAKELOLA" || body.mode === "PENYEDIA" ? body.mode : null;
  if (!mode) fe.mode = "Pilih swakelola atau penyedia barang/jasa";
  const exec = cleanText(body.executorName, 150);
  if (exec.bad || exec.tooLong) fe.executorName = "Nama pelaksana maksimal 150 karakter";
  if (mode === "SWAKELOLA" && !exec.value) fe.executorName = "Swakelola: isi nama Kaur/Kasi penerima panjar";
  const period = cleanText(body.workPeriod, 100);
  if (period.bad || period.tooLong) fe.workPeriod = "Waktu pelaksanaan maksimal 100 karakter";
  const hasReceipt = body.hasReceipt === true;
  if (mode === "PENYEDIA" && !hasReceipt) fe.hasReceipt = "Penyedia: SPP diajukan setelah barang/jasa diterima, dengan pernyataan tanggung jawab belanja dan bukti penerimaan (Pasal 55)";
  const lines: SppLineInput[] = [];
  const raw = Array.isArray(body.lines) ? body.lines : [];
  if (raw.length === 0 || raw.length > SPP_LIMITS.linesPerRequest) fe.lines = `Isi 1 sampai ${SPP_LIMITS.linesPerRequest} baris`;
  raw.slice(0, SPP_LIMITS.linesPerRequest).forEach((r, i) => {
    const n = i + 1;
    if (!isRecord(r)) return void (fe[`line${n}`] = `Baris ${n}: tidak terbaca`);
    const accountCode = typeof r.accountCode === "string" ? r.accountCode.trim() : "";
    if (!isLeafAccountCode(accountCode) || accountKind(accountCode) !== "BELANJA") fe[`line${n}`] = `Baris ${n}: pilih rekening belanja`;
    const amountCents = money(r.amount);
    if (amountCents === null) fe[`line${n}`] = `Baris ${n}: jumlah harus angka lebih dari nol`;
    const d = cleanText(r.description, 300);
    const payee = cleanText(r.payee, 150);
    if (d.bad || d.tooLong || payee.bad || payee.tooLong) fe[`line${n}`] = `Baris ${n}: uraian maks. 300 dan penerima maks. 150 karakter`;
    let taxCents = 0n;
    let taxKind: string | null = null;
    if (r.taxAmount !== undefined && r.taxAmount !== null && r.taxAmount !== "" && r.taxAmount !== 0 && r.taxAmount !== "0") {
      const t = money(r.taxAmount);
      if (t === null || (amountCents !== null && t > amountCents)) fe[`line${n}`] = `Baris ${n}: pajak harus angka lebih dari nol dan tidak melebihi jumlah`;
      else if (!isTaxKind(r.taxKind)) fe[`line${n}`] = `Baris ${n}: pilih jenis pajak`;
      else {
        taxCents = t;
        taxKind = r.taxKind;
      }
    }
    if (!fe[`line${n}`] && amountCents !== null) lines.push({ accountCode, description: d.value ?? accountName(accountCode) ?? "", payee: payee.value, amountCents, taxCents, taxKind });
  });
  return Object.keys(fe).length || !mode ? { ok: false, errors: Object.values(fe), fieldErrors: fe } : { ok: true, value: { activityCode, mode, executorName: exec.value, workPeriod: period.value, hasReceipt, lines } };
}

export interface SppLineView {
  id: number;
  accountCode: string;
  accountName: string;
  description: string;
  payee: string | null;
  amount: string;
  tax: string;
  taxKind: string | null;
  /** Lampiran M.1: pagu, pencairan sampai yang lalu, permintaan sekarang, jumlah sampai saat ini, sisa dana */
  pagu: string;
  previous: string;
  total: string;
  remaining: string;
}
export interface SppView {
  id: number;
  year: number;
  number: number;
  label: string;
  activityCode: string;
  activityName: string;
  mode: Mode;
  executorName: string | null;
  workPeriod: string | null;
  status: SppStatus;
  rejectNote: string | null;
  hasReceipt: boolean;
  requestedAt: string;
  verifiedAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  total: string;
  lines: SppLineView[];
}

type ReqRow = Prisma.ApbdesPayRequestGetPayload<{ include: { lines: true } }>;

/** Pencairan lalu per kegiatan+rekening: seluruh SPP dibayar sebelum SPP ini (nomor lebih kecil). */
async function viewOf(db: Db, villageId: number, r: ReqRow): Promise<SppView> {
  const doc = await activeDocument(db, villageId, r.year);
  const budget = budgetMap(doc?.lines ?? []);
  const paid = await db.apbdesPayRequestLine.findMany({ where: { request: { villageId, year: r.year, activityCode: r.activityCode, status: "DIBAYAR", number: { lt: r.number } } }, select: { accountCode: true, amountCents: true } });
  const total = r.lines.reduce((a, l) => a + l.amountCents, 0n);
  return {
    id: r.id,
    year: r.year,
    number: r.number,
    label: `SPP ${String(r.number).padStart(3, "0")}/${r.year}`,
    activityCode: r.activityCode,
    activityName: kegiatanName(r.activityCode) ?? r.activityCode,
    mode: r.mode as Mode,
    executorName: r.executorName,
    workPeriod: r.workPeriod,
    status: r.status as SppStatus,
    rejectNote: r.rejectNote,
    hasReceipt: r.hasReceipt,
    requestedAt: r.requestedAt.toISOString(),
    verifiedAt: r.verifiedAt?.toISOString() ?? null,
    approvedAt: r.approvedAt?.toISOString() ?? null,
    paidAt: isoDay(r.paidAt),
    total: fromCents(total),
    lines: r.lines.map((l) => {
      const pagu = budget.get(`${r.activityCode}|${l.accountCode}`) ?? 0n;
      const prev = paid.filter((p) => p.accountCode === l.accountCode).reduce((a, p) => a + p.amountCents, 0n);
      return { id: l.id, accountCode: l.accountCode, accountName: accountName(l.accountCode) ?? l.accountCode, description: l.description, payee: l.payee, amount: fromCents(l.amountCents), tax: fromCents(l.taxCents), taxKind: l.taxKind, pagu: fromCents(pagu), previous: fromCents(prev), total: fromCents(prev + l.amountCents), remaining: fromCents(pagu - prev - l.amountCents) };
    }),
  };
}

type Db = Prisma.TransactionClient;

export async function listRequests(db: Db, villageId: number, year: number): Promise<SppView[]> {
  const rows = await db.apbdesPayRequest.findMany({ where: { villageId, year }, include: { lines: { orderBy: { id: "asc" } } }, orderBy: { number: "desc" }, take: 500 });
  return Promise.all(rows.map((r) => viewOf(db, villageId, r)));
}

export async function getRequest(db: Db, villageId: number, id: number): Promise<Result<SppView>> {
  const r = await db.apbdesPayRequest.findFirst({ where: { id, villageId }, include: { lines: { orderBy: { id: "asc" } } } });
  return r ? ok(await viewOf(db, villageId, r)) : fail(404, "SPP tidak ditemukan.");
}

const OPEN: SppStatus[] = ["DIAJUKAN", "DIVERIFIKASI", "DISETUJUI"];

/**
 * Mengajukan SPP di dalam transaksi pemanggil; pemanggil WAJIB sudah memegang kunci tahun (lockYear) sebelum pembacaan apa pun.
 * Syarat: DPA kegiatan disetujui (Pasal 52), rekening ada di APB Desa, tidak melebihi anggaran tersisa maupun rencana penarikan sampai bulan ini (Pasal 53).
 * `source` menandai SPP yang diajukan dari modul pembayaran (BLT, PKTD, KDMP).
 */
export async function createRequestInTx(tx: Db, args: { villageId: number; userId: number | null; year: number; value: SppInput; now: Date; source?: { kind: "BLT" | "PKTD" | "KDMP"; id: number } }): Promise<Result<{ id: number; number: number }>> {
  const { value: v, now } = args;
  const doc = await activeDocument(tx, args.villageId, args.year);
  if (!doc) return fail(409, "APB Desa tahun ini belum ditetapkan.");
  const plan = await tx.apbdesActivityPlan.findUnique({ where: { villageId_year_activityCode: { villageId: args.villageId, year: args.year, activityCode: v.activityCode } } });
  if (plan?.status !== "DISETUJUI") return fail(409, "DPA kegiatan ini belum disetujui Kepala Desa. Kegiatan dilaksanakan berdasarkan DPA yang disetujui (Pasal 52).");
  if ((await tx.apbdesPayRequest.count({ where: { villageId: args.villageId, year: args.year } })) >= SPP_LIMITS.requestsPerYear) return fail(409, "Batas jumlah SPP tahun ini tercapai.");
  const budget = budgetMap(doc.lines);
  const entries = await loadEntries(tx, args.villageId, args.year);
  const pending = await tx.apbdesPayRequestLine.findMany({ where: { request: { villageId: args.villageId, year: args.year, activityCode: v.activityCode, status: { in: OPEN } } }, select: { accountCode: true, amountCents: true } });
  const month = args.year === now.getUTCFullYear() ? now.getUTCMonth() + 1 : args.year < now.getUTCFullYear() ? 12 : 1;
  const asked = new Map<string, Cents>();
  for (const l of v.lines) asked.set(l.accountCode, (asked.get(l.accountCode) ?? 0n) + l.amountCents);
  for (const [acc, amount] of asked) {
    const key = `${v.activityCode}|${acc}`;
    const pagu = budget.get(key);
    if (pagu === undefined) return invalid({ errors: [`Rekening ${acc} tidak ada di APB Desa untuk kegiatan ini.`], fieldErrors: { lines: `Rekening ${acc} tidak dianggarkan` } });
    const realized = entries.filter((e) => e.activityCode === v.activityCode && e.accountCode === acc).reduce((a, e) => a + (e.type === "PENGELUARAN" ? e.amountCents : e.type === "PANJAR_KEMBALI" ? -e.amountCents : 0n), 0n);
    const open = pending.filter((x) => x.accountCode === acc).reduce((a, x) => a + x.amountCents, 0n);
    if (realized + open + amount > pagu) return invalid({ errors: [`Rekening ${acc}: permintaan Rp${fromCents(amount)} melebihi sisa anggaran Rp${fromCents(pagu - realized - open)} (termasuk SPP yang masih berjalan).`], fieldErrors: { lines: `Melebihi sisa anggaran pada ${acc}` } });
    const cap = await plannedThrough(tx, args.villageId, args.year, v.activityCode, acc, month);
    if (realized + open + amount > cap) return invalid({ errors: [`Rekening ${acc}: melebihi rencana penarikan (RAK) sampai bulan ${month}, yaitu Rp${fromCents(cap)}. Ubah rencana penarikan lewat DPA bila memang perlu.`], fieldErrors: { lines: `Melebihi rencana penarikan pada ${acc}` } });
  }
  const last = await tx.apbdesPayRequest.findFirst({ where: { villageId: args.villageId, year: args.year }, orderBy: { number: "desc" }, select: { number: true } });
  const number = (last?.number ?? 0) + 1;
  const row = await tx.apbdesPayRequest.create({
    data: {
      villageId: args.villageId,
      year: args.year,
      number,
      activityCode: v.activityCode,
      mode: v.mode,
      executorName: v.executorName ?? plan.executorName,
      workPeriod: v.workPeriod,
      hasReceipt: v.hasReceipt,
      sourceKind: args.source?.kind ?? null,
      sourceId: args.source?.id ?? null,
      createdById: args.userId,
      lines: { create: v.lines.map((l) => ({ accountCode: l.accountCode, description: l.description, payee: l.payee, amountCents: l.amountCents, taxCents: l.taxCents, taxKind: l.taxKind })) },
    },
  });
  return ok({ id: row.id, number });
}

export async function createRequest(db: PrismaClient, args: { villageId: number; userId: number | null; year: number; input: unknown; now?: Date }): Promise<Result<{ id: number; number: number }>> {
  const p = parseSppInput(args.input);
  if (!p.ok) return invalid(p);
  await ensureYear(db, args.villageId, args.year);
  return db
    .$transaction(async (tx) => {
      await lockYear(tx, args.villageId, args.year);
      return createRequestInTx(tx, { villageId: args.villageId, userId: args.userId, year: args.year, value: p.value, now: args.now ?? new Date() });
    })
    .catch(rollbackToResult);
}

export type SppAction = "verify" | "approve" | "reject" | "pay";

export interface PayInput {
  paidAt: Date;
  channel: Channel;
}

export function parsePayInput(body: unknown, now: Date): Parsed<PayInput> {
  const fe: Record<string, string> = {};
  const b = isRecord(body) ? body : {};
  const paidAt = parseIsoDate(b.paidAt);
  if (!paidAt) fe.paidAt = "Isi tanggal pembayaran";
  else if (future(paidAt, now)) fe.paidAt = "Tanggal tidak boleh di masa depan";
  if (!isChannel(b.channel)) fe.channel = "Pilih kas tunai atau rekening bank";
  return Object.keys(fe).length || !paidAt || !isChannel(b.channel) ? { ok: false, errors: Object.values(fe), fieldErrors: fe } : { ok: true, value: { paidAt, channel: b.channel } };
}

export async function actOnRequest(db: PrismaClient, args: { villageId: number; userId: number | null; requestId: number; action: SppAction; input?: unknown; now?: Date }): Promise<Result<{ status: SppStatus }>> {
  const now = args.now ?? new Date();
  const probe = await db.apbdesPayRequest.findFirst({ where: { id: args.requestId, villageId: args.villageId }, select: { year: true } });
  if (!probe) return fail(404, "SPP tidak ditemukan.");
  let pay: PayInput | null = null;
  let note: string | null = null;
  if (args.action === "pay") {
    const pp = parsePayInput(args.input, now);
    if (!pp.ok) return invalid(pp);
    pay = pp.value;
  }
  if (args.action === "reject") {
    const t = cleanText(isRecord(args.input) ? args.input.note : null, 300);
    if (t.bad || t.tooLong || !t.value) return invalid({ errors: ["Tuliskan alasan penolakan (maks. 300 karakter)."], fieldErrors: { note: "Alasan wajib diisi" } });
    note = t.value;
  }
  const year = probe.year;
  return db
    .$transaction(async (tx) => {
      await lockYear(tx, args.villageId, year);
      const r = await tx.apbdesPayRequest.findFirst({ where: { id: args.requestId, villageId: args.villageId }, include: { lines: true } });
      if (!r) return fail(404, "SPP tidak ditemukan.");
      const set = (data: Prisma.ApbdesPayRequestUpdateInput) => tx.apbdesPayRequest.update({ where: { id: r.id }, data });
      if (args.action === "verify") {
        if (r.status !== "DIAJUKAN") return fail(409, "SPP ini bukan berstatus diajukan.");
        await set({ status: "DIVERIFIKASI", verifiedAt: now });
        return ok({ status: "DIVERIFIKASI" as SppStatus });
      }
      if (args.action === "approve") {
        if (r.status !== "DIVERIFIKASI") return fail(409, "SPP harus diverifikasi Sekretaris Desa lebih dulu.");
        await set({ status: "DISETUJUI", approvedAt: now });
        return ok({ status: "DISETUJUI" as SppStatus });
      }
      if (args.action === "reject") {
        if (!OPEN.includes(r.status as SppStatus)) return fail(409, "SPP ini sudah dibayar atau ditolak.");
        await set({ status: "DITOLAK", rejectNote: note });
        return ok({ status: "DITOLAK" as SppStatus });
      }
      // pay
      if (r.status !== "DISETUJUI") return fail(409, "SPP harus disetujui Kepala Desa lebih dulu.");
      const when = pay!.paidAt;
      const month = when.getUTCMonth() + 1;
      if (when.getUTCFullYear() !== year) return invalid({ errors: ["Tanggal pembayaran harus di tahun anggaran SPP."], fieldErrors: { paidAt: "Beda tahun anggaran" } });
      if ((await closedMonths(tx, args.villageId, year)).has(month)) return fail(409, `Buku kas bulan ke-${month} sudah ditutup.`);
      const doc = await activeDocument(tx, args.villageId, year);
      if (!doc) return fail(409, "APB Desa tahun ini belum ditetapkan.");
      const created = [];
      for (const l of r.lines) {
        created.push(
          await tx.apbdesEntry.create({
            data: { villageId: args.villageId, year, entryDate: when, voucherNo: `SPP-${String(r.number).padStart(3, "0")}`, type: "PENGELUARAN", channel: pay!.channel, activityCode: r.activityCode, accountCode: l.accountCode, description: `${l.description}${l.payee ? ` (${l.payee})` : ""}`, amountCents: l.amountCents, taxCents: l.taxCents, taxKind: l.taxKind, requestId: r.id, createdById: args.userId },
          }),
        );
      }
      const all = [...(await loadEntries(tx, args.villageId, year))];
      for (const l of r.lines) {
        const err = checkAll(all, budgetMap(doc.lines), `${r.activityCode}|${l.accountCode}`);
        if (err) throw new Rollback(err);
      }
      if (r.mode === "SWAKELOLA") {
        const net = r.lines.reduce((a, l) => a + l.amountCents - l.taxCents, 0n);
        await tx.apbdesPanjar.create({ data: { villageId: args.villageId, year, requestId: r.id, activityCode: r.activityCode, holderName: r.executorName ?? "-", givenAt: when, givenCents: net, dueAt: addWorkingDays(when, SPP_LIMITS.workDays) } });
      }
      await set({ status: "DIBAYAR", paidAt: when });
      void created;
      return ok({ status: "DIBAYAR" as SppStatus });
    })
    .catch(rollbackToResult);
}

// ---- Panjar (Pasal 54, Lampiran Q.3)

export interface PanjarView {
  id: number;
  requestLabel: string;
  activityCode: string;
  activityName: string;
  holderName: string;
  givenAt: string;
  dueAt: string;
  given: string;
  spent: string;
  returned: string;
  balance: string;
  /** Pembayaran yang dicatat modul BLT/PKTD/KDMP dari SPP ini; otomatis dihitung sebagai pertanggungjawaban */
  fromModule: string;
  moduleKind: string | null;
  state: "TERBUKA" | "LUNAS" | "TERLAMBAT";
  accounts: { accountCode: string; accountName: string; paid: string; returned: string; returnable: string }[];
  spj: { id: number; spjDate: string; voucherNo: string; description: string; amount: string; checked: boolean }[];
  returns: { id: number; date: string; amount: string; accountCode: string | null }[];
}

export async function listPanjar(db: Db, villageId: number, year: number, today: Date = new Date()): Promise<PanjarView[]> {
  const rows = await db.apbdesPanjar.findMany({ where: { villageId, year }, include: { spj: { orderBy: { spjDate: "asc" } } }, orderBy: { givenAt: "desc" }, take: 500 });
  if (rows.length === 0) return [];
  const requests = await db.apbdesPayRequest.findMany({ where: { id: { in: rows.map((r) => r.requestId) }, villageId }, include: { lines: true } });
  const returns = await db.apbdesEntry.findMany({ where: { villageId, year, type: "PANJAR_KEMBALI", panjarId: { in: rows.map((r) => r.id) } }, orderBy: { entryDate: "asc" } });
  const todayStr = today.toISOString().slice(0, 10);
  const viaModule = await moduleSpentBySpp(db, rows.map((r) => r.requestId));
  return rows.map((p) => {
    const req = requests.find((r) => r.id === p.requestId);
    const mod = viaModule.get(p.requestId) ?? 0n;
    const spent = p.spj.reduce((a, s) => a + s.amountCents, 0n) + mod;
    const ret = returns.filter((e) => e.panjarId === p.id);
    const returned = ret.reduce((a, e) => a + e.amountCents, 0n);
    const balance = p.givenCents - spent - returned;
    const accs = [...new Set((req?.lines ?? []).map((l) => l.accountCode))];
    return {
      id: p.id,
      requestLabel: req ? `SPP ${String(req.number).padStart(3, "0")}/${req.year}` : "-",
      activityCode: p.activityCode,
      activityName: kegiatanName(p.activityCode) ?? p.activityCode,
      holderName: p.holderName,
      givenAt: isoDay(p.givenAt)!,
      dueAt: isoDay(p.dueAt)!,
      given: fromCents(p.givenCents),
      spent: fromCents(spent),
      returned: fromCents(returned),
      balance: fromCents(balance),
      fromModule: fromCents(mod),
      moduleKind: req?.sourceKind ?? null,
      state: balance === 0n ? "LUNAS" : isoDay(p.dueAt)! < todayStr ? "TERLAMBAT" : "TERBUKA",
      accounts: accs.map((a) => {
        const paid = (req?.lines ?? []).filter((l) => l.accountCode === a).reduce((x, l) => x + l.amountCents, 0n);
        const rr = ret.filter((e) => e.accountCode === a).reduce((x, e) => x + e.amountCents, 0n);
        return { accountCode: a, accountName: accountName(a) ?? a, paid: fromCents(paid), returned: fromCents(rr), returnable: fromCents(paid - rr) };
      }),
      spj: p.spj.map((s) => ({ id: s.id, spjDate: isoDay(s.spjDate)!, voucherNo: s.voucherNo, description: s.description, amount: fromCents(s.amountCents), checked: s.checkedAt !== null })),
      returns: ret.map((e) => ({ id: e.id, date: isoDay(e.entryDate)!, amount: fromCents(e.amountCents), accountCode: e.accountCode })),
    };
  });
}

/** Pertanggungjawaban panjar: bukti pembayaran barang/jasa. SPJ ditambah pengembalian tidak boleh melebihi panjar yang diterima. */
export async function addPanjarSpj(db: PrismaClient, args: { villageId: number; panjarId: number; input: unknown; now?: Date }): Promise<Result<{ id: number; balance: string }>> {
  const b = isRecord(args.input) ? args.input : {};
  const fe: Record<string, string> = {};
  const spjDate = parseIsoDate(b.spjDate);
  if (!spjDate) fe.spjDate = "Isi tanggal bukti";
  else if (future(spjDate, args.now ?? new Date())) fe.spjDate = "Tanggal tidak boleh di masa depan";
  const voucher = cleanText(b.voucherNo, 60);
  if (voucher.bad || voucher.tooLong || !voucher.value) fe.voucherNo = "Nomor bukti wajib diisi (maks. 60 karakter)";
  const desc = cleanText(b.description, 300);
  if (desc.bad || desc.tooLong || !desc.value) fe.description = "Uraian wajib diisi (maks. 300 karakter)";
  const amount = money(b.amount);
  if (amount === null) fe.amount = "Jumlah harus angka lebih dari nol";
  if (Object.keys(fe).length || !spjDate || amount === null) return invalid({ errors: Object.values(fe), fieldErrors: fe });
  const probe = await db.apbdesPanjar.findFirst({ where: { id: args.panjarId, villageId: args.villageId }, select: { year: true, requestId: true } });
  if (!probe) return fail(404, "Panjar tidak ditemukan.");
  // Panjar dari SPP bersumber modul dipertanggungjawabkan otomatis oleh pembayaran yang dicatat di modulnya; SPJ manual akan menggandakan.
  const src = await db.apbdesPayRequest.findFirst({ where: { id: probe.requestId, villageId: args.villageId }, select: { sourceKind: true } });
  if (src?.sourceKind) return fail(409, "Panjar ini berasal dari SPP modul BLT/PKTD/KDMP dan dipertanggungjawabkan otomatis oleh pembayaran yang dicatat di modul itu. Catat pembayarannya di modul, bukan sebagai bukti manual.");
  return db
    .$transaction(async (tx) => {
      await lockYear(tx, args.villageId, probe.year);
      const p = await tx.apbdesPanjar.findFirst({ where: { id: args.panjarId, villageId: args.villageId }, include: { spj: true } });
      if (!p) return fail(404, "Panjar tidak ditemukan.");
      if (spjDate.getTime() < p.givenAt.getTime()) return invalid({ errors: ["Tanggal bukti sebelum panjar diberikan."], fieldErrors: { spjDate: "Sebelum panjar diberikan" } });
      const returned = (await tx.apbdesEntry.aggregate({ where: { villageId: args.villageId, panjarId: p.id, type: "PANJAR_KEMBALI" }, _sum: { amountCents: true } }))._sum.amountCents ?? 0n;
      const spent = p.spj.reduce((a, s) => a + s.amountCents, 0n) + ((await moduleSpentBySpp(tx, [p.requestId])).get(p.requestId) ?? 0n);
      if (spent + returned + amount > p.givenCents) return invalid({ errors: [`Pertanggungjawaban melebihi panjar. Saldo panjar Rp${fromCents(p.givenCents - spent - returned)}.`], fieldErrors: { amount: "Melebihi saldo panjar" } });
      const row = await tx.apbdesPanjarSpj.create({ data: { panjarId: p.id, villageId: args.villageId, spjDate, voucherNo: voucher.value!, description: desc.value!, amountCents: amount } });
      return ok({ id: row.id, balance: fromCents(p.givenCents - spent - returned - amount) });
    })
    .catch(rollbackToResult);
}

/** Sekretaris Desa memeriksa kesesuaian bukti dengan pertanggungjawaban (Pasal 54 ayat 5). */
export async function checkPanjarSpj(db: PrismaClient, args: { villageId: number; spjId: number; now?: Date }): Promise<Result<{ id: number }>> {
  const res = await db.apbdesPanjarSpj.updateMany({ where: { id: args.spjId, villageId: args.villageId, checkedAt: null }, data: { checkedAt: args.now ?? new Date() } });
  return res.count === 0 ? fail(404, "Bukti tidak ditemukan atau sudah diperiksa.") : ok({ id: args.spjId });
}

/** Mengembalikan sisa panjar ke kas desa (Pasal 54 ayat 2 dan 6): mengurangi realisasi belanja pada rekening yang dipilih. */
export async function returnPanjar(db: PrismaClient, args: { villageId: number; userId: number | null; panjarId: number; input: unknown; now?: Date }): Promise<Result<{ id: number; balance: string }>> {
  const b = isRecord(args.input) ? args.input : {};
  const now = args.now ?? new Date();
  const fe: Record<string, string> = {};
  const date = parseIsoDate(b.date);
  if (!date) fe.date = "Isi tanggal pengembalian";
  else if (future(date, now)) fe.date = "Tanggal tidak boleh di masa depan";
  const accountCode = typeof b.accountCode === "string" ? b.accountCode.trim() : "";
  if (!isLeafAccountCode(accountCode)) fe.accountCode = "Pilih rekening belanja yang dikurangi";
  const amount = money(b.amount);
  if (amount === null) fe.amount = "Jumlah harus angka lebih dari nol";
  const voucher = cleanText(b.voucherNo, 60);
  if (voucher.bad || voucher.tooLong || !voucher.value) fe.voucherNo = "Nomor bukti setor wajib diisi";
  const channel = isChannel(b.channel) ? b.channel : null;
  if (!channel) fe.channel = "Pilih kas tunai atau rekening bank";
  if (Object.keys(fe).length || !date || amount === null || !channel) return invalid({ errors: Object.values(fe), fieldErrors: fe });
  const probe = await db.apbdesPanjar.findFirst({ where: { id: args.panjarId, villageId: args.villageId }, select: { year: true, requestId: true } });
  if (!probe) return fail(404, "Panjar tidak ditemukan.");
  const year = probe.year;
  const src = await db.apbdesPayRequest.findFirst({ where: { id: probe.requestId, villageId: args.villageId }, select: { sourceKind: true, sourceId: true } });
  return db
    .$transaction(async (tx) => {
      // Pengembalian mengurangi dana SPP yang dapat dibayarkan modul: serialkan dengan pencatatan pembayaran lewat kunci modul lebih dulu.
      if (src?.sourceKind && src.sourceId !== null) await lockModuleRow(tx, args.villageId, src.sourceKind, src.sourceId);
      await lockYear(tx, args.villageId, year);
      const p = await tx.apbdesPanjar.findFirst({ where: { id: args.panjarId, villageId: args.villageId }, include: { spj: true } });
      if (!p) return fail(404, "Panjar tidak ditemukan.");
      if (date.getUTCFullYear() !== year) return invalid({ errors: ["Tanggal harus di tahun anggaran panjar."], fieldErrors: { date: "Beda tahun anggaran" } });
      if (date.getTime() < p.givenAt.getTime()) return invalid({ errors: ["Tanggal pengembalian sebelum panjar diberikan."], fieldErrors: { date: "Sebelum panjar diberikan" } });
      const month = date.getUTCMonth() + 1;
      if ((await closedMonths(tx, args.villageId, year)).has(month)) return fail(409, `Buku kas bulan ke-${month} sudah ditutup.`);
      const req = await tx.apbdesPayRequest.findUnique({ where: { id: p.requestId }, include: { lines: true } });
      const paid = (req?.lines ?? []).filter((l) => l.accountCode === accountCode).reduce((a, l) => a + l.amountCents, 0n);
      if (paid === 0n) return invalid({ errors: ["Rekening ini bukan bagian dari SPP panjar tersebut."], fieldErrors: { accountCode: "Bukan rekening SPP ini" } });
      const entries = await tx.apbdesEntry.findMany({ where: { villageId: args.villageId, panjarId: p.id, type: "PANJAR_KEMBALI" } });
      const returnedAll = entries.reduce((a, e) => a + e.amountCents, 0n);
      const returnedAcc = entries.filter((e) => e.accountCode === accountCode).reduce((a, e) => a + e.amountCents, 0n);
      const spent = p.spj.reduce((a, s) => a + s.amountCents, 0n) + ((await moduleSpentBySpp(tx, [p.requestId])).get(p.requestId) ?? 0n);
      const balance = p.givenCents - spent - returnedAll;
      if (amount > balance) return invalid({ errors: [`Pengembalian melebihi saldo panjar (Rp${fromCents(balance)}).`], fieldErrors: { amount: "Melebihi saldo panjar" } });
      if (returnedAcc + amount > paid) return invalid({ errors: [`Pengembalian melebihi yang dibayarkan untuk rekening ini (Rp${fromCents(paid)}).`], fieldErrors: { amount: "Melebihi pembayaran rekening" } });
      const row = await tx.apbdesEntry.create({ data: { villageId: args.villageId, year, entryDate: date, voucherNo: voucher.value!, type: "PANJAR_KEMBALI", channel, activityCode: p.activityCode, accountCode, description: `Pengembalian sisa panjar ${p.holderName}`, amountCents: amount, panjarId: p.id, createdById: args.userId } });
      void toLedger;
      return ok({ id: row.id, balance: fromCents(balance - amount) });
    })
    .catch(rollbackToResult);
}
