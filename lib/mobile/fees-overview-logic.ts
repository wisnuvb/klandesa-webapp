import { cashBalance, summarize, type Summary, type SummaryRow } from "./fees-logic";

/** Logika murni rekap iuran seluruh desa untuk dashboard web (per kelompok: Desa dan tiap RT). */

export type OvSchedule = { id: number; scope: string; rt: string | null; rw: string | null };
export type OvCharge = SummaryRow & { scheduleId: number };
export type OvCash = { scope: string; rt: string | null; rw: string | null; type: string; amount: number; voided: boolean };

export type OvGroup = {
  key: string;
  scope: "desa" | "rt";
  rt: string | null;
  rw: string | null;
  label: string;
  schedules: number;
  summary: Summary;
  balance: { income: number; expense: number; balance: number };
  pendingClaims: number;
};

export function groupKey(scope: string, rt: string | null, rw: string | null): string {
  return scope === "rt" ? `rt:${rt ?? "-"}/${rw ?? "-"}` : "desa";
}

export function groupLabel(scope: string, rt: string | null, rw: string | null): string {
  if (scope !== "rt") return "Desa";
  return `RT ${rt ?? "-"}${rw ? ` / RW ${rw}` : ""}`;
}

const num = (s: string | null) => (s != null && /^\d+$/.test(s) ? Number(s) : Number.MAX_SAFE_INTEGER);

/**
 * Susun rekap per kelompok. `feesConfirmedBySchedule` = total pembayaran terkonfirmasi sepanjang waktu per jadwal
 * (untuk saldo), `pendingBySchedule` = jumlah laporan bayar yang menunggu dicek.
 * Urutan: Desa dulu, lalu RT dengan sisa tagihan terbesar.
 */
export function buildOverview(
  schedules: OvSchedule[],
  charges: OvCharge[],
  cash: OvCash[],
  feesConfirmedBySchedule: Map<number, number>,
  pendingBySchedule: Map<number, number>,
): { groups: OvGroup[]; total: Summary; pendingClaims: number } {
  const byId = new Map(schedules.map((s) => [s.id, s]));
  type Acc = { scope: "desa" | "rt"; rt: string | null; rw: string | null; schedules: number; rows: SummaryRow[]; fees: number; cash: OvCash[]; pending: number };
  const acc = new Map<string, Acc>();
  const get = (scope: string, rt: string | null, rw: string | null): Acc => {
    const key = groupKey(scope, rt, rw);
    let a = acc.get(key);
    if (!a) {
      a = { scope: scope === "rt" ? "rt" : "desa", rt: scope === "rt" ? rt : null, rw: scope === "rt" ? rw : null, schedules: 0, rows: [], fees: 0, cash: [], pending: 0 };
      acc.set(key, a);
    }
    return a;
  };
  for (const s of schedules) {
    const a = get(s.scope, s.rt, s.rw);
    a.schedules += 1;
    a.fees += feesConfirmedBySchedule.get(s.id) ?? 0;
    a.pending += pendingBySchedule.get(s.id) ?? 0;
  }
  for (const c of charges) {
    const s = byId.get(c.scheduleId);
    if (s) get(s.scope, s.rt, s.rw).rows.push({ amount: c.amount, status: c.status, confirmed: c.confirmed });
  }
  for (const e of cash) get(e.scope, e.rt, e.rw).cash.push(e);

  const groups: OvGroup[] = [...acc.entries()].map(([key, a]) => ({
    key, scope: a.scope, rt: a.rt, rw: a.rw, label: groupLabel(a.scope, a.rt, a.rw), schedules: a.schedules,
    summary: summarize(a.rows),
    balance: cashBalance({ feesConfirmed: a.fees, cash: a.cash.map((c) => ({ type: c.type, amount: c.amount, voided: c.voided })) }),
    pendingClaims: a.pending,
  }));
  groups.sort((x, y) => {
    if (x.scope !== y.scope) return x.scope === "desa" ? -1 : 1;
    return y.summary.outstanding - x.summary.outstanding || num(x.rw) - num(y.rw) || num(x.rt) - num(y.rt);
  });
  const total = summarize(charges.map((c) => ({ amount: c.amount, status: c.status, confirmed: c.confirmed })));
  return { groups, total, pendingClaims: groups.reduce((n, g) => n + g.pendingClaims, 0) };
}
