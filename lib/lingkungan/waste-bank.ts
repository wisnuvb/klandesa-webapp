import { Prisma, type PrismaClient } from "@prisma/client";
import { cleanText, fail, future, invalid, isRecord, parseIsoDate, type Parsed, type Result } from "@/lib/form-input";
import { fromCents, mulDivRound, toCents, type Cents } from "@/lib/coop/loan-math";

type Db = Prisma.TransactionClient;

export const LIMITS = { itemsPerBank: 100, accountsPerBank: 5000, maxKgPerTx: 100_000, maxMoneyCents: 9_999_999_999_999n * 100n } as const;

const bad = (status: number, field: string, msg: string): { ok: false; status: number; errors: string[]; fieldErrors: Record<string, string> } => ({ ok: false, status, errors: [msg], fieldErrors: { [field]: msg } });
const dec = (c: Cents) => new Prisma.Decimal(fromCents(c));
const cents = (d: Prisma.Decimal | null | undefined): Cents => (d ? (toCents(d.toFixed(2)) ?? 0n) : 0n);
const money = (raw: unknown): Cents | null => {
  const c = typeof raw === "number" || typeof raw === "string" ? toCents(raw) : null;
  return c !== null && c > 0n && c <= LIMITS.maxMoneyCents ? c : null;
};

/** "12.5" kg → gram (bilangan bulat). Maksimal 3 desimal. */
export function kgToGrams(raw: unknown): bigint | null {
  const s = typeof raw === "number" ? (Number.isFinite(raw) ? String(raw) : "") : typeof raw === "string" ? raw.trim() : "";
  const m = /^(\d{1,7})(?:\.(\d{1,3}))?$/.exec(s);
  if (!m) return null;
  const g = BigInt(m[1]) * 1000n + BigInt((m[2] ?? "").padEnd(3, "0") || "0");
  return g > 0n && g <= BigInt(LIMITS.maxKgPerTx) * 1000n ? g : null;
}
export const gramsToKg = (g: bigint): string => `${g / 1000n}.${String(g % 1000n).padStart(3, "0")}`;

/** Nilai setoran: berat (gram) x harga per kg (sen), dibulatkan ke sen terdekat. */
export const depositAmount = (grams: bigint, pricePerKg: Cents): Cents => mulDivRound(grams, pricePerKg, 1000n);

export interface ItemInput { name: string; pricePerKg: Cents; active: boolean }

export function parseItemInput(body: unknown): Parsed<ItemInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const name = cleanText(body.name, 100);
  if (name.bad || !name.value) fe.name = "Isi nama jenis sampah.";
  else if (name.tooLong) fe.name = "Nama maksimal 100 karakter.";
  const price = money(body.pricePerKg);
  if (price === null) fe.pricePerKg = "Isi harga per kg lebih dari nol.";
  if (body.active !== undefined && typeof body.active !== "boolean") fe.active = "Status tidak valid.";
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { name: name.value as string, pricePerKg: price as Cents, active: body.active !== false } };
}

async function ownBank(tx: Db, villageId: number, bankId: number): Promise<boolean> {
  return (await tx.wasteBank.count({ where: { id: bankId, villageId } })) > 0;
}

export async function saveItem(db: Db, args: { villageId: number; bankId: number; itemId?: number; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parseItemInput(args.input);
  if (!p.ok) return invalid(p);
  if (!(await ownBank(db, args.villageId, args.bankId))) return fail(404, "Bank sampah tidak ditemukan.");
  try {
    if (args.itemId) {
      const done = await db.wasteBankItem.updateMany({ where: { id: args.itemId, wasteBankId: args.bankId }, data: { name: p.value.name, pricePerKg: dec(p.value.pricePerKg), active: p.value.active } });
      return done.count ? { ok: true, data: { id: args.itemId } } : fail(404, "Jenis sampah tidak ditemukan.");
    }
    if ((await db.wasteBankItem.count({ where: { wasteBankId: args.bankId } })) >= LIMITS.itemsPerBank) return fail(409, `Maksimal ${LIMITS.itemsPerBank} jenis sampah.`);
    const row = await db.wasteBankItem.create({ data: { wasteBankId: args.bankId, name: p.value.name, pricePerKg: dec(p.value.pricePerKg), active: p.value.active } });
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return bad(409, "name", "Jenis sampah dengan nama ini sudah ada.");
    throw e;
  }
}

export async function createAccount(db: Db, args: { villageId: number; bankId: number; input: unknown }): Promise<Result<{ id: number }>> {
  const body = isRecord(args.input) ? args.input : null;
  if (!body) return fail(400, "Data tidak valid.");
  if (!(await ownBank(db, args.villageId, args.bankId))) return fail(404, "Bank sampah tidak ditemukan.");
  let residentId: number | null = null;
  let residentName: string | null = null;
  if (body.residentId !== undefined && body.residentId !== null && body.residentId !== "") {
    const n = Number(body.residentId);
    if (!Number.isInteger(n) || n < 1) return bad(400, "residentId", "Warga tidak valid.");
    const r = await db.resident.findFirst({ where: { id: n, villageId: args.villageId }, select: { id: true, name: true } });
    if (!r) return bad(400, "residentId", "Warga tidak ditemukan di desa ini.");
    residentId = r.id;
    residentName = r.name;
  }
  const typed = cleanText(body.name, 150);
  if (typed.bad || typed.tooLong) return bad(400, "name", "Nama maksimal 150 karakter.");
  const name = typed.value ?? residentName;
  if (!name) return bad(400, "name", "Isi nama nasabah atau pilih dari data warga.");
  if ((await db.wasteBankAccount.count({ where: { wasteBankId: args.bankId } })) >= LIMITS.accountsPerBank) return fail(409, "Jumlah nasabah sudah mencapai batas.");
  const row = await db.wasteBankAccount.create({ data: { wasteBankId: args.bankId, residentId, name } });
  return { ok: true, data: { id: row.id } };
}

/**
 * Kunci baris nasabah. HARUS menjadi pernyataan pertama dalam transaksi: MySQL (REPEATABLE READ) mengambil potret data pada bacaan
 * biasa pertama, jadi bacaan apa pun sebelum kunci membuat saldo dibaca dari potret lama dan penarikan serentak bisa lolos semua.
 */
async function lockAccount(tx: Db, bankId: number, accountId: number): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM waste_bank_accounts WHERE id = ${accountId} AND wasteBankId = ${bankId} FOR UPDATE`;
  return rows.length > 0;
}

async function balanceOf(tx: Db, accountId: number): Promise<Cents> {
  const g = await tx.wasteBankTx.groupBy({ by: ["kind"], where: { accountId }, _sum: { amount: true } });
  const sum = (k: string) => cents(g.find((x) => x.kind === k)?._sum.amount);
  return sum("DEPOSIT") - sum("WITHDRAW");
}

/** Setor sampah: { accountId, itemId, weightKg, txDate, note? }. Nilai = berat x harga saat ini; harga disalin ke transaksi. */
export async function deposit(db: PrismaClient, args: { villageId: number; bankId: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<{ id: number; amount: string; balance: string }>> {
  const now = args.now ?? new Date();
  const body = isRecord(args.input) ? args.input : {};
  const fe: Record<string, string> = {};
  const accountId = Number(body.accountId);
  if (!Number.isInteger(accountId) || accountId < 1) fe.accountId = "Pilih nasabah.";
  const itemId = Number(body.itemId);
  if (!Number.isInteger(itemId) || itemId < 1) fe.itemId = "Pilih jenis sampah.";
  const grams = kgToGrams(body.weightKg);
  if (grams === null) fe.weightKg = `Isi berat dalam kg (maksimal 3 desimal, di bawah ${LIMITS.maxKgPerTx.toLocaleString("id-ID")} kg).`;
  const txDate = parseIsoDate(body.txDate);
  if (!txDate) fe.txDate = "Isi tanggal setoran.";
  else if (future(txDate, now)) fe.txDate = "Tanggal tidak boleh di masa depan.";
  const note = cleanText(body.note, 200);
  if (note.bad || note.tooLong) fe.note = "Catatan maksimal 200 karakter.";
  if (Object.keys(fe).length) return { ok: false, status: 400, errors: Object.values(fe), fieldErrors: fe };

  return db.$transaction(async (tx) => {
    if (!(await lockAccount(tx, args.bankId, accountId)) || !(await ownBank(tx, args.villageId, args.bankId))) return bad(404, "accountId", "Nasabah tidak ditemukan.");
    const item = await tx.wasteBankItem.findFirst({ where: { id: itemId, wasteBankId: args.bankId } });
    if (!item) return bad(404, "itemId", "Jenis sampah tidak ditemukan.");
    if (!item.active) return bad(409, "itemId", "Jenis sampah ini sedang tidak diterima.");
    const price = cents(item.pricePerKg);
    const amount = depositAmount(grams as bigint, price);
    if (amount === 0n) return bad(400, "weightKg", "Nilai setoran kurang dari satu sen; tambah beratnya.");
    const row = await tx.wasteBankTx.create({
      data: { wasteBankId: args.bankId, accountId, itemId: item.id, kind: "DEPOSIT", weightKg: new Prisma.Decimal(gramsToKg(grams as bigint)), pricePerKg: item.pricePerKg, amount: dec(amount), itemName: item.name, txDate: txDate as Date, note: note.value, createdById: args.userId },
    });
    return { ok: true, data: { id: row.id, amount: fromCents(amount), balance: fromCents(await balanceOf(tx, accountId)) } };
  });
}

/** Tarik saldo: { accountId, amount, txDate, note? }. Saldo dikunci selama transaksi sehingga penarikan serentak tak bisa melewati saldo. */
export async function withdraw(db: PrismaClient, args: { villageId: number; bankId: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<{ id: number; balance: string }>> {
  const now = args.now ?? new Date();
  const body = isRecord(args.input) ? args.input : {};
  const fe: Record<string, string> = {};
  const accountId = Number(body.accountId);
  if (!Number.isInteger(accountId) || accountId < 1) fe.accountId = "Pilih nasabah.";
  const amount = money(body.amount);
  if (amount === null) fe.amount = "Isi jumlah penarikan lebih dari nol.";
  const txDate = parseIsoDate(body.txDate);
  if (!txDate) fe.txDate = "Isi tanggal penarikan.";
  else if (future(txDate, now)) fe.txDate = "Tanggal tidak boleh di masa depan.";
  const note = cleanText(body.note, 200);
  if (note.bad || note.tooLong) fe.note = "Catatan maksimal 200 karakter.";
  if (Object.keys(fe).length) return { ok: false, status: 400, errors: Object.values(fe), fieldErrors: fe };

  return db.$transaction(async (tx) => {
    if (!(await lockAccount(tx, args.bankId, accountId)) || !(await ownBank(tx, args.villageId, args.bankId))) return bad(404, "accountId", "Nasabah tidak ditemukan.");
    if ((amount as Cents) > (await balanceOf(tx, accountId))) return bad(409, "amount", "Jumlah penarikan melebihi saldo nasabah.");
    const row = await tx.wasteBankTx.create({ data: { wasteBankId: args.bankId, accountId, kind: "WITHDRAW", amount: dec(amount as Cents), txDate: txDate as Date, note: note.value, createdById: args.userId } });
    return { ok: true, data: { id: row.id, balance: fromCents(await balanceOf(tx, accountId)) } };
  });
}

/** Papan bank sampah: harga, nasabah + saldo, transaksi terbaru, dan rekap bulan berjalan. */
export async function ledger(db: Db, villageId: number, bankId: number, now: Date = new Date()): Promise<Result<unknown>> {
  const bank = await db.wasteBank.findFirst({ where: { id: bankId, villageId }, select: { id: true, name: true } });
  if (!bank) return fail(404, "Bank sampah tidak ditemukan.");
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [items, accounts, groups, recent, month] = await Promise.all([
    db.wasteBankItem.findMany({ where: { wasteBankId: bankId }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    db.wasteBankAccount.findMany({ where: { wasteBankId: bankId }, orderBy: [{ name: "asc" }, { id: "asc" }], take: LIMITS.accountsPerBank }),
    db.wasteBankTx.groupBy({ by: ["accountId", "kind"], where: { wasteBankId: bankId }, _sum: { amount: true } }),
    db.wasteBankTx.findMany({ where: { wasteBankId: bankId }, orderBy: [{ txDate: "desc" }, { id: "desc" }], take: 30, include: { account: { select: { name: true } } } }),
    db.wasteBankTx.groupBy({ by: ["itemName"], where: { wasteBankId: bankId, kind: "DEPOSIT", txDate: { gte: monthStart } }, _sum: { weightKg: true, amount: true } }),
  ]);
  const bal = (id: number) => cents(groups.find((g) => g.accountId === id && g.kind === "DEPOSIT")?._sum.amount) - cents(groups.find((g) => g.accountId === id && g.kind === "WITHDRAW")?._sum.amount);
  const totalBalance = accounts.reduce((a, x) => a + bal(x.id), 0n);
  return {
    ok: true,
    data: {
      bank,
      items: items.map((i) => ({ id: i.id, name: i.name, pricePerKg: i.pricePerKg.toFixed(2), active: i.active })),
      accounts: accounts.map((a) => ({ id: a.id, name: a.name, residentId: a.residentId, balance: fromCents(bal(a.id)) })),
      totalBalance: fromCents(totalBalance),
      recent: recent.map((t) => ({ id: t.id, accountName: t.account.name, kind: t.kind, itemName: t.itemName, weightKg: t.weightKg?.toFixed(3) ?? null, amount: t.amount.toFixed(2), txDate: t.txDate.toISOString().slice(0, 10), note: t.note })),
      month: {
        from: monthStart.toISOString().slice(0, 10),
        totalKg: month.reduce((a, m) => a + Number(m._sum.weightKg ?? 0), 0).toFixed(3),
        totalValue: fromCents(month.reduce((a, m) => a + cents(m._sum.amount), 0n)),
        byItem: month.map((m) => ({ itemName: m.itemName ?? "-", kg: Number(m._sum.weightKg ?? 0).toFixed(3), value: m._sum.amount?.toFixed(2) ?? "0.00" })).sort((a, b) => Number(b.kg) - Number(a.kg)),
      },
    },
  };
}
