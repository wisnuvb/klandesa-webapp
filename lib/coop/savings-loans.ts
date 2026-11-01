import { Prisma, type PrismaClient } from "@prisma/client";
import { cleanText, fail, future, invalid, isRecord, parseIsoDate, type Parsed, type Result } from "@/lib/form-input";
import { buildSchedule, distributeShu, fromCents, interestPaid, loanPosition, toCents, type Cents, type Installment } from "./loan-math";

type Db = Prisma.TransactionClient;

export const SAVING_KIND_LABEL = { POKOK: "Simpanan pokok", WAJIB: "Simpanan wajib", SUKARELA: "Simpanan sukarela" } as const;
export type SavingKind = keyof typeof SAVING_KIND_LABEL;
export const SAVING_KINDS = Object.keys(SAVING_KIND_LABEL) as SavingKind[];
const isKind = (v: unknown): v is SavingKind => typeof v === "string" && Object.prototype.hasOwnProperty.call(SAVING_KIND_LABEL, v);

export const LIMITS = { maxAmount: 9_999_999_999_999, maxRatePercent: 10, maxTermMonths: 60, maxOpenLoansPerMember: 3 } as const;

const MAX_CENTS = BigInt(LIMITS.maxAmount) * 100n;
const money = (raw: unknown): Cents | null => {
  const c = typeof raw === "number" || typeof raw === "string" ? toCents(raw) : null;
  return c !== null && c > 0n && c <= MAX_CENTS ? c : null;
};

// ---------- Simpanan ----------

export interface SavingInput {
  memberId: number;
  kind: SavingKind;
  direction: "SETOR" | "TARIK";
  amount: Cents;
  txDate: Date;
  note: string | null;
}

export function parseSavingInput(body: unknown, now: Date = new Date()): Parsed<SavingInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const memberId = Number(body.memberId);
  if (!Number.isInteger(memberId) || memberId < 1) fe.memberId = "Pilih anggota.";
  const kind = isKind(body.kind) ? body.kind : null;
  if (!kind) fe.kind = "Pilih jenis simpanan.";
  const direction = body.direction === "SETOR" || body.direction === "TARIK" ? body.direction : null;
  if (!direction) fe.direction = "Pilih setoran atau penarikan.";
  const amount = money(body.amount);
  if (amount === null) fe.amount = "Isi jumlah rupiah lebih dari nol.";
  const txDate = parseIsoDate(body.txDate);
  if (!txDate) fe.txDate = "Isi tanggal transaksi.";
  else if (future(txDate, now)) fe.txDate = "Tanggal tidak boleh di masa depan.";
  const note = cleanText(body.note, 200);
  if (note.bad || note.tooLong) fe.note = "Catatan maksimal 200 karakter.";
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { memberId, kind: kind as SavingKind, direction: direction as "SETOR" | "TARIK", amount: amount as Cents, txDate: txDate as Date, note: note.value } };
}

/** Galat per kolom bertipe Result. */
const bad = (status: number, field: string, msg: string): { ok: false; status: number; errors: string[]; fieldErrors: Record<string, string> } => ({ ok: false, status, errors: [msg], fieldErrors: { [field]: msg } });

const dec = (c: Cents) => new Prisma.Decimal(fromCents(c));
const cents = (d: Prisma.Decimal | null | undefined): Cents => (d ? (toCents(d.toFixed(2)) ?? 0n) : 0n);

async function lockMember(tx: Db, cooperativeId: number, memberId: number): Promise<{ status: string } | null> {
  const rows = await tx.$queryRaw<{ status: string }[]>`SELECT status FROM cooperative_members WHERE id = ${memberId} AND cooperativeId = ${cooperativeId} FOR UPDATE`;
  return rows[0] ?? null;
}

async function balanceOf(tx: Db, memberId: number, kind: SavingKind): Promise<Cents> {
  const g = await tx.cooperativeSaving.groupBy({ by: ["direction"], where: { memberId, kind }, _sum: { amount: true } });
  const sum = (d: string) => cents(g.find((x) => x.direction === d)?._sum.amount);
  return sum("SETOR") - sum("TARIK");
}

/**
 * Catat setoran/penarikan. Baris anggota dikunci selama transaksi sehingga dua penarikan serentak tak bisa melampaui saldo.
 * Simpanan pokok dan wajib tidak dapat ditarik selama orangnya masih anggota aktif; setoran hanya untuk anggota aktif.
 */
export async function addSaving(db: PrismaClient, args: { cooperativeId: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<{ id: number; balance: string }>> {
  const p = parseSavingInput(args.input, args.now);
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db.$transaction(async (tx) => {
    const m = await lockMember(tx, args.cooperativeId, v.memberId);
    if (!m) return bad(404, "memberId", "Anggota tidak ditemukan.");
    const active = m.status === "active";
    if (v.direction === "SETOR" && !active) return fail(409, "Anggota ini tidak aktif; tidak dapat menyetor.");
    if (v.direction === "TARIK" && v.kind !== "SUKARELA" && active) return fail(409, "Simpanan pokok dan wajib tidak dapat ditarik selama masih menjadi anggota aktif.");
    if (v.direction === "TARIK" && v.amount > (await balanceOf(tx, v.memberId, v.kind))) {
      return bad(409, "amount", "Jumlah penarikan melebihi saldo simpanan.");
    }
    const row = await tx.cooperativeSaving.create({ data: { cooperativeId: args.cooperativeId, memberId: v.memberId, kind: v.kind, direction: v.direction, amount: dec(v.amount), txDate: v.txDate, note: v.note, createdById: args.userId } });
    return { ok: true, data: { id: row.id, balance: fromCents(await balanceOf(tx, v.memberId, v.kind)) } };
  });
}

/** Saldo tiap anggota per jenis simpanan. */
export async function memberBalances(db: Db, cooperativeId: number, asOf?: Date) {
  const [members, groups] = await Promise.all([
    db.cooperativeMember.findMany({ where: { cooperativeId }, select: { id: true, name: true, membershipNumber: true, status: true }, orderBy: [{ name: "asc" }, { id: "asc" }] }),
    db.cooperativeSaving.groupBy({ by: ["memberId", "kind", "direction"], where: { cooperativeId, ...(asOf ? { txDate: { lte: asOf } } : {}) }, _sum: { amount: true } }),
  ]);
  return members.map((m) => {
    const bal = (kind: SavingKind) => {
      const g = groups.filter((x) => x.memberId === m.id && x.kind === kind);
      return cents(g.find((x) => x.direction === "SETOR")?._sum.amount) - cents(g.find((x) => x.direction === "TARIK")?._sum.amount);
    };
    const [pokok, wajib, sukarela] = [bal("POKOK"), bal("WAJIB"), bal("SUKARELA")];
    return { id: m.id, name: m.name, membershipNumber: m.membershipNumber, active: m.status === "active", pokok, wajib, sukarela, total: pokok + wajib + sukarela };
  });
}

export async function listSavings(db: Db, cooperativeId: number, f: { memberId?: number; page: number; pageSize: number }) {
  const where: Prisma.CooperativeSavingWhereInput = { cooperativeId, ...(f.memberId ? { memberId: f.memberId } : {}) };
  const [rows, total] = await Promise.all([
    db.cooperativeSaving.findMany({ where, orderBy: [{ txDate: "desc" }, { id: "desc" }], skip: (f.page - 1) * f.pageSize, take: f.pageSize, include: { member: { select: { name: true } } } }),
    db.cooperativeSaving.count({ where }),
  ]);
  return {
    total,
    items: rows.map((r) => ({ id: r.id, memberId: r.memberId, memberName: r.member.name, kind: r.kind, direction: r.direction, amount: r.amount.toFixed(2), txDate: r.txDate.toISOString().slice(0, 10), note: r.note })),
  };
}

// ---------- Pinjaman ----------

export interface LoanInput {
  memberId: number;
  principal: Cents;
  ratePercent: string;
  termMonths: number;
  disbursedAt: Date;
  purpose: string | null;
}

export function parseLoanInput(body: unknown, now: Date = new Date()): Parsed<LoanInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const memberId = Number(body.memberId);
  if (!Number.isInteger(memberId) || memberId < 1) fe.memberId = "Pilih anggota peminjam.";
  const principal = money(body.principal);
  if (principal === null) fe.principal = "Isi jumlah pinjaman lebih dari nol.";
  const rateRaw = body.ratePercent === undefined || body.ratePercent === null || body.ratePercent === "" ? "0" : body.ratePercent;
  const rateC = typeof rateRaw === "number" || typeof rateRaw === "string" ? toCents(rateRaw) : null;
  if (rateC === null || rateC > BigInt(LIMITS.maxRatePercent) * 100n) fe.ratePercent = `Bunga per bulan antara 0 dan ${LIMITS.maxRatePercent}% (maks 2 desimal).`;
  const term = Number(body.termMonths);
  if (!Number.isInteger(term) || term < 1 || term > LIMITS.maxTermMonths) fe.termMonths = `Lama pinjaman 1 sampai ${LIMITS.maxTermMonths} bulan.`;
  const disbursedAt = parseIsoDate(body.disbursedAt);
  if (!disbursedAt) fe.disbursedAt = "Isi tanggal pencairan.";
  else if (future(disbursedAt, now)) fe.disbursedAt = "Tanggal pencairan tidak boleh di masa depan.";
  const purpose = cleanText(body.purpose, 200);
  if (purpose.bad || purpose.tooLong) fe.purpose = "Tujuan maksimal 200 karakter.";
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { memberId, principal: principal as Cents, ratePercent: fromCents(rateC as Cents), termMonths: term, disbursedAt: disbursedAt as Date, purpose: purpose.value } };
}

type LoanRow = Prisma.CooperativeLoanGetPayload<object>;
const scheduleOf = (l: LoanRow): Installment[] => buildSchedule({ principal: cents(l.principal), ratePercent: l.ratePercent.toFixed(2), termMonths: l.termMonths, disbursedAt: l.disbursedAt }) ?? [];

function view(l: LoanRow & { member: { name: string } }, paid: Cents, now: Date) {
  const pos = loanPosition(scheduleOf(l), paid, now);
  return {
    id: l.id,
    memberId: l.memberId,
    memberName: l.member.name,
    principal: l.principal.toFixed(2),
    ratePercent: l.ratePercent.toFixed(2),
    termMonths: l.termMonths,
    disbursedAt: l.disbursedAt.toISOString().slice(0, 10),
    purpose: l.purpose,
    status: l.status,
    totalDue: fromCents(pos.totalDue),
    totalPaid: fromCents(pos.totalPaid),
    outstanding: fromCents(pos.outstanding),
    principalOutstanding: fromCents(pos.principalOutstanding),
    nextDue: pos.nextDue?.toISOString().slice(0, 10) ?? null,
    overdueCount: pos.overdueCount,
    pos,
  };
}

export async function createLoan(db: PrismaClient, args: { cooperativeId: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<{ id: number }>> {
  const p = parseLoanInput(args.input, args.now);
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db.$transaction(async (tx) => {
    const m = await lockMember(tx, args.cooperativeId, v.memberId);
    if (!m) return bad(404, "memberId", "Anggota tidak ditemukan.");
    if (m.status !== "active") return bad(409, "memberId", "Hanya anggota aktif yang dapat meminjam.");
    const open = await tx.cooperativeLoan.count({ where: { cooperativeId: args.cooperativeId, memberId: v.memberId, status: "AKTIF" } });
    if (open >= LIMITS.maxOpenLoansPerMember) return fail(409, `Anggota ini sudah punya ${open} pinjaman aktif (maksimal ${LIMITS.maxOpenLoansPerMember}).`);
    const row = await tx.cooperativeLoan.create({
      data: { cooperativeId: args.cooperativeId, memberId: v.memberId, principal: dec(v.principal), ratePercent: new Prisma.Decimal(v.ratePercent), termMonths: v.termMonths, disbursedAt: v.disbursedAt, purpose: v.purpose, createdById: args.userId },
    });
    return { ok: true, data: { id: row.id } };
  });
}

export async function listLoans(db: Db, cooperativeId: number, f: { status?: string; memberId?: number }, now: Date = new Date()) {
  const where: Prisma.CooperativeLoanWhereInput = { cooperativeId, ...(f.status === "AKTIF" || f.status === "LUNAS" ? { status: f.status } : {}), ...(f.memberId ? { memberId: f.memberId } : {}) };
  const loans = await db.cooperativeLoan.findMany({ where, orderBy: [{ status: "asc" }, { disbursedAt: "desc" }, { id: "desc" }], take: 500, include: { member: { select: { name: true } } } });
  const paid = await db.cooperativeLoanPayment.groupBy({ by: ["loanId"], where: { loanId: { in: loans.map((l) => l.id) } }, _sum: { amount: true } });
  return loans.map((l) => {
    const { pos, ...v } = view(l, cents(paid.find((x) => x.loanId === l.id)?._sum.amount), now);
    void pos;
    return v;
  });
}

export type LoanDetail = Omit<ReturnType<typeof view>, "pos"> & {
  schedule: { no: number; dueDate: string; principal: string; interest: string; total: string; paid: string; remaining: string; state: string }[];
  payments: { id: number; paidAt: string; amount: string; note: string | null }[];
};

export async function getLoan(db: Db, cooperativeId: number, id: number, now: Date = new Date()): Promise<Result<LoanDetail>> {
  const l = await db.cooperativeLoan.findFirst({ where: { id, cooperativeId }, include: { member: { select: { name: true } }, payments: { orderBy: [{ paidAt: "asc" }, { id: "asc" }] } } });
  if (!l) return fail(404, "Pinjaman tidak ditemukan.");
  const paid = l.payments.reduce((a, p) => a + cents(p.amount), 0n);
  const { pos, ...v } = view(l, paid, now);
  return {
    ok: true,
    data: {
      ...v,
      schedule: pos.schedule.map((s) => ({ no: s.no, dueDate: s.dueDate.toISOString().slice(0, 10), principal: fromCents(s.principal), interest: fromCents(s.interest), total: fromCents(s.total), paid: fromCents(s.paid), remaining: fromCents(s.remaining), state: s.state })),
      payments: l.payments.map((p) => ({ id: p.id, paidAt: p.paidAt.toISOString().slice(0, 10), amount: p.amount.toFixed(2), note: p.note })),
    },
  };
}

/** Catat pembayaran angsuran. Baris pinjaman dikunci; jumlah tak boleh melebihi sisa kewajiban. Lunas otomatis bila sisa nol. */
export async function addPayment(db: PrismaClient, args: { cooperativeId: number; userId: number | null; loanId: number; input: unknown; now?: Date }): Promise<Result<{ outstanding: string; status: string }>> {
  const now = args.now ?? new Date();
  const fe: Record<string, string> = {};
  const body = isRecord(args.input) ? args.input : {};
  const amount = money(body.amount);
  if (amount === null) fe.amount = "Isi jumlah pembayaran lebih dari nol.";
  const paidAt = parseIsoDate(body.paidAt);
  if (!paidAt) fe.paidAt = "Isi tanggal pembayaran.";
  else if (future(paidAt, now)) fe.paidAt = "Tanggal tidak boleh di masa depan.";
  const note = cleanText(body.note, 200);
  if (note.bad || note.tooLong) fe.note = "Catatan maksimal 200 karakter.";
  if (Object.keys(fe).length) return { ok: false, status: 400, errors: Object.values(fe), fieldErrors: fe };

  return db.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM cooperative_loans WHERE id = ${args.loanId} AND cooperativeId = ${args.cooperativeId} FOR UPDATE`;
    if (!locked.length) return fail(404, "Pinjaman tidak ditemukan.");
    const l = await tx.cooperativeLoan.findUniqueOrThrow({ where: { id: args.loanId } });
    if (l.status === "LUNAS") return fail(409, "Pinjaman ini sudah lunas.");
    if ((paidAt as Date).getTime() < l.disbursedAt.getTime()) return bad(400, "paidAt", "Tanggal pembayaran sebelum tanggal pencairan.");
    const agg = await tx.cooperativeLoanPayment.aggregate({ where: { loanId: l.id }, _sum: { amount: true } });
    const pos = loanPosition(scheduleOf(l), cents(agg._sum.amount), now);
    if ((amount as Cents) > pos.outstanding) {
      return bad(409, "amount", `Pembayaran melebihi sisa kewajiban (Rp${fromCents(pos.outstanding)}).`);
    }
    await tx.cooperativeLoanPayment.create({ data: { loanId: l.id, paidAt: paidAt as Date, amount: dec(amount as Cents), note: note.value, createdById: args.userId } });
    const left = pos.outstanding - (amount as Cents);
    if (left === 0n) await tx.cooperativeLoan.update({ where: { id: l.id }, data: { status: "LUNAS" } });
    return { ok: true, data: { outstanding: fromCents(left), status: left === 0n ? "LUNAS" : "AKTIF" } };
  });
}

/** Anggota yang punya catatan keuangan tidak boleh dihapus (riwayat harus utuh); nonaktifkan saja. */
export async function memberHasFinancialRecords(db: Db, memberId: number): Promise<boolean> {
  const [s, l] = await Promise.all([db.cooperativeSaving.count({ where: { memberId } }), db.cooperativeLoan.count({ where: { memberId } })]);
  return s + l > 0;
}

/** Kalkulator pembagian SHU tahun `year` (tidak disimpan): saldo simpanan akhir tahun dan bunga pinjaman yang dibayar selama tahun itu. */
export async function shuPreview(db: Db, args: { cooperativeId: number; year: number; total: unknown; savingsSharePercent: unknown }) {
  const total = money(args.total);
  const share = Number(args.savingsSharePercent);
  if (total === null) return fail(400, "Isi total SHU yang dibagikan lebih dari nol.");
  if (!Number.isFinite(share) || share < 0 || share > 100) return fail(400, "Porsi jasa simpanan antara 0 dan 100 persen.");
  const yearEnd = new Date(Date.UTC(args.year, 11, 31));
  const prevEnd = new Date(Date.UTC(args.year - 1, 11, 31));
  const [balances, loans] = await Promise.all([
    memberBalances(db, args.cooperativeId, yearEnd),
    db.cooperativeLoan.findMany({ where: { cooperativeId: args.cooperativeId, disbursedAt: { lte: yearEnd } }, include: { payments: { select: { paidAt: true, amount: true } } } }),
  ]);
  const interest = new Map<number, Cents>();
  for (const l of loans) {
    const sched = scheduleOf(l);
    const through = (d: Date) => l.payments.filter((p) => p.paidAt.getTime() <= d.getTime()).reduce((a, p) => a + cents(p.amount), 0n);
    const inYear = interestPaid(sched, through(yearEnd)) - interestPaid(sched, through(prevEnd));
    interest.set(l.memberId, (interest.get(l.memberId) ?? 0n) + inYear);
  }
  const members = balances.filter((b) => b.active || b.total > 0n || (interest.get(b.id) ?? 0n) > 0n).map((b) => ({ id: b.id, savings: b.total > 0n ? b.total : 0n, loanInterestPaid: interest.get(b.id) ?? 0n }));
  const r = distributeShu({ total, savingsSharePercent: share, members });
  const names = new Map(balances.map((b) => [b.id, b.name]));
  return {
    ok: true as const,
    data: {
      year: args.year,
      total: fromCents(total),
      distributed: fromCents(r.distributed),
      undistributed: fromCents(r.undistributed),
      rows: r.rows.map((x) => ({ memberId: x.id, name: names.get(x.id) ?? "", fromSavings: fromCents(x.fromSavings), fromLoans: fromCents(x.fromLoans), total: fromCents(x.total) })).filter((x) => x.total !== "0.00"),
    },
  };
}
