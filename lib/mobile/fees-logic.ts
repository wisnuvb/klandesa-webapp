/**
 * Iuran, retribusi, dan kas (versi A: pencatatan). Klandesa tidak memegang dana: warga membayar ke rekening/QRIS
 * RT atau desa, lalu bendahara (Ketua RT) mencatat dan mengonfirmasi. Logika murni, tanpa DB.
 */

export const FEE_CATEGORIES = ["iuran_rt", "keamanan", "kebersihan", "sosial", "pbb", "retribusi", "lainnya"] as const;
export type FeeCategory = (typeof FEE_CATEGORIES)[number];
export const FEE_CATEGORY_LABEL: Record<FeeCategory, string> = {
  iuran_rt: "Iuran RT", keamanan: "Keamanan/ronda", kebersihan: "Kebersihan/sampah", sosial: "Dana sosial",
  pbb: "PBB (pencatatan)", retribusi: "Retribusi desa", lainnya: "Lainnya",
};
export const PAY_METHODS = ["cash", "transfer", "qris"] as const;
export type PayMethod = (typeof PAY_METHODS)[number];
export const CASH_CATEGORIES = ["kegiatan", "keamanan", "kebersihan", "sosial", "perlengkapan", "honor", "lainnya"] as const;

export const MIN_FEE = 1_000;
export const MAX_FEE = 10_000_000;
export const MAX_PAYMENT = 100_000_000;
const DAY = 24 * 3600 * 1000;
const WIB_OFFSET_MS = 7 * 3600 * 1000;

// ── Periode (YYYY-MM, zona WIB) ─────────────────────────────────────────────
export function currentPeriod(now: Date): string {
  const d = new Date(now.getTime() + WIB_OFFSET_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
export function isPeriod(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(v)) return false;
  const y = Number(v.slice(0, 4));
  return y >= 2020 && y <= 2100;
}
function periodIndex(p: string): number { return Number(p.slice(0, 4)) * 12 + Number(p.slice(5, 7)) - 1; }
function fromIndex(i: number): string { return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`; }
export function addPeriods(p: string, n: number): string { return fromIndex(periodIndex(p) + n); }
export function comparePeriods(a: string, b: string): number { return periodIndex(a) - periodIndex(b); }

/** Tanggal jatuh tempo (akhir hari WIB) untuk periode; hari dibatasi panjang bulan. */
export function dueDateOf(period: string, dueDay: number): Date {
  const y = Number(period.slice(0, 4));
  const m = Number(period.slice(5, 7));
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const day = Math.min(Math.max(1, Math.floor(dueDay)), last);
  return new Date(Date.UTC(y, m - 1, day, 23, 59, 59) - WIB_OFFSET_MS);
}

export const MAX_BACKFILL_MONTHS = 12;

/** Periode yang harus punya tagihan sampai sekarang. "once": hanya periode awal. Mundur maksimal 12 bulan agar tidak membanjiri tagihan lama. */
export function periodsToGenerate(s: { recurrence: string; startPeriod: string; endPeriod: string | null }, now: Date): string[] {
  const cur = currentPeriod(now);
  if (s.recurrence === "once") return comparePeriods(s.startPeriod, cur) <= 0 ? [s.startPeriod] : [];
  const earliest = addPeriods(cur, -(MAX_BACKFILL_MONTHS - 1));
  let from = comparePeriods(s.startPeriod, earliest) < 0 ? earliest : s.startPeriod;
  const to = s.endPeriod && comparePeriods(s.endPeriod, cur) < 0 ? s.endPeriod : cur;
  const out: string[] = [];
  while (comparePeriods(from, to) <= 0 && out.length < 24) { out.push(from); from = addPeriods(from, 1); }
  return out;
}

// ── Validasi jadwal dan pembayaran ──────────────────────────────────────────
export type ScheduleInput = {
  name: string; category: FeeCategory; amount: number; recurrence: "monthly" | "once";
  startPeriod: string; endPeriod: string | null; dueDay: number; payInfo: string | null;
};

export function validateSchedule(raw: unknown, now: Date): { ok: true; value: ScheduleInput } | { ok: false; message: string } {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const name = typeof r.name === "string" ? r.name.trim().replace(/\s+/g, " ") : "";
  if (name.length < 3 || name.length > 80) return { ok: false, message: "Nama iuran 3–80 huruf." };
  if (!FEE_CATEGORIES.includes(r.category as FeeCategory)) return { ok: false, message: "Pilih jenis iuran." };
  const amount = Number(r.amount);
  if (!Number.isInteger(amount) || amount < MIN_FEE || amount > MAX_FEE) return { ok: false, message: `Nominal harus bilangan bulat Rp${MIN_FEE.toLocaleString("id-ID")}–Rp${MAX_FEE.toLocaleString("id-ID")}.` };
  if (r.recurrence !== "monthly" && r.recurrence !== "once") return { ok: false, message: "Pilih bulanan atau sekali." };
  const startPeriod = r.startPeriod === undefined ? currentPeriod(now) : r.startPeriod;
  if (!isPeriod(startPeriod)) return { ok: false, message: "Periode mulai tidak valid." };
  if (comparePeriods(startPeriod, addPeriods(currentPeriod(now), 12)) > 0) return { ok: false, message: "Periode mulai terlalu jauh di depan." };
  let endPeriod: string | null = null;
  if (r.endPeriod != null && r.endPeriod !== "") {
    if (!isPeriod(r.endPeriod) || comparePeriods(r.endPeriod, startPeriod) < 0) return { ok: false, message: "Periode akhir tidak valid." };
    endPeriod = r.endPeriod;
  }
  const dueDay = r.dueDay === undefined ? 10 : Number(r.dueDay);
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) return { ok: false, message: "Tanggal jatuh tempo 1–28." };
  const payInfo = typeof r.payInfo === "string" ? r.payInfo.trim().slice(0, 500) || null : null;
  return { ok: true, value: { name, category: r.category as FeeCategory, amount, recurrence: r.recurrence, startPeriod, endPeriod, dueDay, payInfo } };
}

export function validatePayment(raw: unknown, outstanding: number): { ok: true; amount: number; method: PayMethod; note: string | null } | { ok: false; message: string } {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const method = r.method as PayMethod;
  if (!PAY_METHODS.includes(method)) return { ok: false, message: "Pilih cara bayar." };
  const amount = r.amount === undefined ? outstanding : Number(r.amount);
  if (!Number.isInteger(amount) || amount < 1) return { ok: false, message: "Nominal harus bilangan bulat." };
  if (outstanding <= 0) return { ok: false, message: "Tagihan ini sudah lunas." };
  if (amount > outstanding) return { ok: false, message: "Nominal melebihi sisa tagihan." };
  const note = typeof r.note === "string" ? r.note.trim().slice(0, 300) || null : null;
  return { ok: true, amount, method, note };
}

export function validateCashEntry(raw: unknown, now: Date): { ok: true; type: "in" | "out"; amount: number; category: string; description: string; entryDate: Date } | { ok: false; message: string } {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  if (r.type !== "in" && r.type !== "out") return { ok: false, message: "Pilih pemasukan atau pengeluaran." };
  const amount = Number(r.amount);
  if (!Number.isInteger(amount) || amount < 1 || amount > MAX_PAYMENT) return { ok: false, message: "Nominal tidak valid." };
  const description = typeof r.description === "string" ? r.description.trim().replace(/\s+/g, " ") : "";
  if (description.length < 3 || description.length > 200) return { ok: false, message: "Keterangan 3–200 huruf." };
  const category = (CASH_CATEGORIES as readonly string[]).includes(r.category as string) ? (r.category as string) : "lainnya";
  const ds = typeof r.entryDate === "string" ? r.entryDate : new Date(now.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ds);
  const d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  if (!d || d.getUTCMonth() !== +m![2] - 1 || d.getTime() > now.getTime() + WIB_OFFSET_MS + DAY) return { ok: false, message: "Tanggal tidak valid." };
  if (d.getTime() < now.getTime() - 3 * 366 * DAY) return { ok: false, message: "Tanggal terlalu lama." };
  return { ok: true, type: r.type, amount, category, description, entryDate: d };
}

// ── Status tagihan ──────────────────────────────────────────────────────────
export type ChargeStatus = "paid" | "partial" | "claimed" | "waived" | "overdue" | "unpaid";

/** `confirmed` = jumlah pembayaran terkonfirmasi, `pending` = jumlah laporan warga yang belum diperiksa. */
export function chargeStatus(c: { amount: number; waived: boolean; confirmed: number; pending: number; dueDate: Date; now: Date }): { status: ChargeStatus; outstanding: number } {
  if (c.waived) return { status: "waived", outstanding: 0 };
  const outstanding = Math.max(0, c.amount - c.confirmed);
  if (outstanding === 0) return { status: "paid", outstanding: 0 };
  if (c.pending > 0) return { status: "claimed", outstanding };
  if (c.dueDate.getTime() < c.now.getTime()) return { status: "overdue", outstanding };
  return { status: c.confirmed > 0 ? "partial" : "unpaid", outstanding };
}

export const CHARGE_STATUS_LABEL: Record<ChargeStatus, string> = {
  paid: "Lunas", partial: "Dicicil", claimed: "Menunggu dicek bendahara", waived: "Dibebaskan", overdue: "Lewat jatuh tempo", unpaid: "Belum dibayar",
};

export type SummaryRow = { amount: number; status: ChargeStatus; confirmed: number };
export type Summary = {
  charges: number; billed: number; collected: number; outstanding: number; waived: number;
  paid: number; partial: number; claimed: number; overdue: number; unpaid: number; waivedCount: number; collectionPercent: number | null;
};

/** Rekap penagihan. Yang dibebaskan tidak dihitung sebagai tagihan; terkumpul = pembayaran terkonfirmasi (maks sebesar tagihan). */
export function summarize(rows: SummaryRow[]): Summary {
  const s: Summary = { charges: rows.length, billed: 0, collected: 0, outstanding: 0, waived: 0, paid: 0, partial: 0, claimed: 0, overdue: 0, unpaid: 0, waivedCount: 0, collectionPercent: null };
  for (const r of rows) {
    if (r.status === "waived") { s.waived += r.amount; s.waivedCount += 1; continue; }
    s.billed += r.amount;
    const got = Math.min(r.amount, Math.max(0, r.confirmed));
    s.collected += got;
    s.outstanding += r.amount - got;
    s[r.status] += 1;
  }
  s.collectionPercent = s.billed > 0 ? Math.round((s.collected / s.billed) * 100) : null;
  return s;
}

/** Saldo kas = iuran terkonfirmasi + pemasukan lain − pengeluaran. Entri yang dibatalkan tidak ikut. */
export function cashBalance(opts: { feesConfirmed: number; cash: { type: string; amount: number; voided: boolean }[] }) {
  let income = opts.feesConfirmed;
  let expense = 0;
  for (const e of opts.cash) {
    if (e.voided) continue;
    if (e.type === "in") income += e.amount; else if (e.type === "out") expense += e.amount;
  }
  return { income, expense, balance: income - expense };
}

// ── Pengingat dan kepala KK ─────────────────────────────────────────────────
/** Ingatkan 3 hari setelah jatuh tempo, lalu paling sering seminggu sekali; tidak untuk yang menunggu dicek atau dibebaskan. */
export function needsReminder(opts: { status: ChargeStatus; dueDate: Date; lastRemindedAt: Date | null; now: Date }): boolean {
  if (opts.status !== "overdue" && opts.status !== "partial") return false;
  if (opts.now.getTime() < opts.dueDate.getTime() + 3 * DAY) return false;
  return !opts.lastRemindedAt || opts.now.getTime() - opts.lastRemindedAt.getTime() >= 7 * DAY;
}

/** Kepala KK: yang berstatus "kepala"; bila tidak ada, yang tertua. */
export function pickHead<T extends { familyRole: string | null; birthDate: Date; name: string }>(members: T[]): T | null {
  if (members.length === 0) return null;
  const head = members.find((m) => /kepala/i.test(m.familyRole ?? ""));
  return head ?? [...members].sort((a, b) => a.birthDate.getTime() - b.birthDate.getTime())[0]!;
}

// ── CSV ─────────────────────────────────────────────────────────────────────
/** Sel CSV aman: kutip, dan awalan rumus (= + - @) dinetralkan agar tidak dieksekusi spreadsheet. */
export function csvCell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
