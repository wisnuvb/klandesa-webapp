/**
 * Laporan APB Desa: Laporan Pelaksanaan Semester Pertama (Lampiran S), Laporan Realisasi APB Desa (T.2.a) dan
 * rekap per kegiatan. Murni, uang dalam sen. Realisasi dihitung dari Buku Kas Umum; anggaran dari APB Desa
 * terakhir yang ditetapkan (perubahan menggantikan APB Desa awal).
 */
import type { Cents } from "@/lib/coop/loan-math";
import { accountKind, accountName, bidangName, kegiatanName, subBidangName } from "./catalog";
import type { LedgerEntry } from "./ledger";

export interface BudgetLine {
  activityCode: string | null;
  accountCode: string;
  description: string;
  amountCents: Cents;
  fundSource: string | null;
}

export type Section = "PENDAPATAN" | "BELANJA" | "PEMBIAYAAN";

export interface ReportRow {
  /** Kunci unik baris, mis. "B|1.1.01|5.2.1". */
  key: string;
  section: Section;
  level: number;
  /** Kode yang tampil di kolom kode rekening. */
  code: string;
  name: string;
  budget: Cents;
  realized: Cents;
  /** Sumber dana (hanya baris paling rinci). */
  fundSources: string[];
}

interface Node extends ReportRow {
  children: Map<string, Node>;
  sortKey: string;
}

const pad = (code: string): string =>
  code
    .split(".")
    .map((p) => p.padStart(3, "0"))
    .join(".");

function node(map: Map<string, Node>, key: string, init: Omit<Node, "children" | "budget" | "realized" | "fundSources" | "key" | "sortKey"> & { sortKey: string }): Node {
  let n = map.get(key);
  if (!n) {
    n = { ...init, key, budget: 0n, realized: 0n, fundSources: [], children: new Map() };
    map.set(key, n);
  }
  return n;
}

function flatten(map: Map<string, Node>, out: ReportRow[]): void {
  const sorted = [...map.values()].sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0));
  for (const n of sorted) {
    out.push({ key: n.key, section: n.section, level: n.level, code: n.code, name: n.name, budget: n.budget, realized: n.realized, fundSources: n.fundSources });
    flatten(n.children, out);
  }
}

const accName = (code: string): string => accountName(code) ?? (code.length <= 1 ? { "4": "Pendapatan", "5": "Belanja", "6": "Pembiayaan" }[code] ?? code : code);

export interface Realization {
  rows: ReportRow[];
  totals: {
    incomeBudget: Cents;
    incomeRealized: Cents;
    expenseBudget: Cents;
    expenseRealized: Cents;
    financingInBudget: Cents;
    financingInRealized: Cents;
    financingOutBudget: Cents;
    financingOutRealized: Cents;
  };
  /** Surplus/(defisit) = pendapatan - belanja. */
  surplusBudget: Cents;
  surplusRealized: Cents;
  /** Pembiayaan netto = penerimaan - pengeluaran pembiayaan. */
  financingNetBudget: Cents;
  financingNetRealized: Cents;
  /** SiLPA tahun berjalan = surplus/(defisit) + pembiayaan netto. */
  silpaBudget: Cents;
  silpaRealized: Cents;
  /** Realisasi pada rekening/kegiatan yang tidak ada di anggaran. */
  unbudgeted: { activityCode: string | null; accountCode: string; realized: Cents }[];
}

/** Realisasi dari catatan BKU. `untilDate` (YYYY-MM-DD) membatasi, mis. 30 Juni untuk semester pertama. */
export function buildRealization(lines: BudgetLine[], entries: LedgerEntry[], untilDate?: string): Realization {
  const income = new Map<string, Node>();
  const spend = new Map<string, Node>();
  const finance = new Map<string, Node>();
  const budgetKeys = new Set<string>();

  const add = (section: Section, activityCode: string | null, accountCode: string, budget: Cents, realized: Cents, fund: string | null) => {
    const chainParts = accountCode.split(".");
    const chain = chainParts.map((_, i) => chainParts.slice(0, i + 1).join("."));
    if (section === "BELANJA" && activityCode) {
      const [b, s] = [activityCode.split(".")[0]!, activityCode.split(".").slice(0, 2).join(".")];
      const nb = node(spend, `B|${b}`, { section, level: 0, code: b, name: bidangName(b) ?? b, sortKey: pad(b) });
      const ns = node(nb.children, `B|${s}`, { section, level: 1, code: s, name: subBidangName(s) ?? s, sortKey: pad(s) });
      const nk = node(ns.children, `B|${activityCode}`, { section, level: 2, code: activityCode, name: kegiatanName(activityCode) ?? activityCode, sortKey: pad(activityCode) });
      const path = [nb, ns, nk];
      let parent = nk;
      for (const c of chain.slice(1)) {
        parent = node(parent.children, `B|${activityCode}|${c}`, {
          section,
          level: 2 + c.split(".").length - 1,
          code: `${activityCode}.${c}`,
          name: accName(c),
          sortKey: pad(c),
        });
        path.push(parent);
      }
      for (const n of path) {
        n.budget += budget;
        n.realized += realized;
      }
      if (fund && !parent.fundSources.includes(fund)) parent.fundSources.push(fund);
      return;
    }
    const root = section === "PENDAPATAN" ? income : finance;
    let level = 0;
    let siblings = root;
    for (const c of chain) {
      const n = node(siblings, `${section[0]}|${c}`, { section, level, code: c, name: accName(c), sortKey: pad(c) });
      n.budget += budget;
      n.realized += realized;
      if (c === accountCode && fund && !n.fundSources.includes(fund)) n.fundSources.push(fund);
      siblings = n.children;
      level += 1;
    }
  };

  const keyOf = (a: string | null, c: string) => `${a ?? ""}|${c}`;
  const realizedBy = new Map<string, Cents>();
  for (const e of entries) {
    if (untilDate && e.entryDate > untilDate) continue;
    if ((e.type !== "PENERIMAAN" && e.type !== "PENGELUARAN" && e.type !== "PANJAR_KEMBALI") || !e.accountCode) continue;
    const k = keyOf(e.activityCode, e.accountCode);
    // Pengembalian sisa panjar mengurangi realisasi belanja pada rekening yang sama.
    realizedBy.set(k, (realizedBy.get(k) ?? 0n) + (e.type === "PANJAR_KEMBALI" ? -e.amountCents : e.amountCents));
  }

  const budgetBy = new Map<string, { activityCode: string | null; accountCode: string; budget: Cents; funds: string[] }>();
  for (const l of lines) {
    const k = keyOf(l.activityCode, l.accountCode);
    const cur = budgetBy.get(k) ?? { activityCode: l.activityCode, accountCode: l.accountCode, budget: 0n, funds: [] };
    cur.budget += l.amountCents;
    if (l.fundSource && !cur.funds.includes(l.fundSource)) cur.funds.push(l.fundSource);
    budgetBy.set(k, cur);
    budgetKeys.add(k);
  }

  const kindOf = (code: string): Section => accountKind(code) ?? "PENDAPATAN";
  for (const b of budgetBy.values()) {
    const realized = realizedBy.get(keyOf(b.activityCode, b.accountCode)) ?? 0n;
    add(kindOf(b.accountCode), b.activityCode, b.accountCode, b.budget, realized, b.funds[0] ?? null);
  }
  const unbudgeted: Realization["unbudgeted"] = [];
  for (const [k, realized] of realizedBy) {
    if (budgetKeys.has(k)) continue;
    const [activity, account] = k.split("|") as [string, string];
    add(kindOf(account), activity || null, account, 0n, realized, null);
    unbudgeted.push({ activityCode: activity || null, accountCode: account, realized });
  }

  const rows: ReportRow[] = [];
  flatten(income, rows);
  flatten(spend, rows);
  flatten(finance, rows);

  const sum = (section: Section, level: number, filter?: (r: ReportRow) => boolean) => {
    let b = 0n;
    let r = 0n;
    for (const row of rows) {
      if (row.section !== section || row.level !== level || (filter && !filter(row))) continue;
      b += row.budget;
      r += row.realized;
    }
    return { b, r };
  };
  const inc = sum("PENDAPATAN", 0);
  const exp = sum("BELANJA", 0);
  const fin = (c: string) => sum("PEMBIAYAAN", 1, (row) => row.code === c);
  const fi = fin("6.1");
  const fo = fin("6.2");
  const surplusBudget = inc.b - exp.b;
  const surplusRealized = inc.r - exp.r;
  const financingNetBudget = fi.b - fo.b;
  const financingNetRealized = fi.r - fo.r;
  return {
    rows,
    totals: {
      incomeBudget: inc.b,
      incomeRealized: inc.r,
      expenseBudget: exp.b,
      expenseRealized: exp.r,
      financingInBudget: fi.b,
      financingInRealized: fi.r,
      financingOutBudget: fo.b,
      financingOutRealized: fo.r,
    },
    surplusBudget,
    surplusRealized,
    financingNetBudget,
    financingNetRealized,
    silpaBudget: surplusBudget + financingNetBudget,
    silpaRealized: surplusRealized + financingNetRealized,
    unbudgeted,
  };
}

// ---- Laporan Realisasi APB Desa ringkas (T.2.a)

export interface SummaryRow {
  label: string;
  indent: number;
  budget: Cents;
  realized: Cents;
  bold?: boolean;
}

export function buildRealizationSummary(r: Realization): SummaryRow[] {
  const find = (key: string) => r.rows.find((x) => x.key === key);
  const pick = (key: string, label: string, indent: number): SummaryRow => {
    const n = find(key);
    return { label, indent, budget: n?.budget ?? 0n, realized: n?.realized ?? 0n };
  };
  const out: SummaryRow[] = [{ label: "PENDAPATAN", indent: 0, budget: 0n, realized: 0n, bold: true }];
  out.push(pick("P|4.1", "Pendapatan Asli Desa", 1));
  out.push({ label: "Pendapatan Transfer", indent: 1, budget: find("P|4.2")?.budget ?? 0n, realized: find("P|4.2")?.realized ?? 0n });
  for (const j of ["4.2.1", "4.2.2", "4.2.3", "4.2.4", "4.2.5"]) out.push(pick(`P|${j}`, accountName(j) ?? j, 2));
  out.push(pick("P|4.3", "Pendapatan Lain-lain", 1));
  out.push({ label: "JUMLAH PENDAPATAN", indent: 0, budget: r.totals.incomeBudget, realized: r.totals.incomeRealized, bold: true });
  out.push({ label: "BELANJA", indent: 0, budget: 0n, realized: 0n, bold: true });
  for (const b of ["1", "2", "3", "4", "5"]) out.push(pick(`B|${b}`, `Bidang ${bidangName(b) ?? b}`, 1));
  out.push({ label: "JUMLAH BELANJA", indent: 0, budget: r.totals.expenseBudget, realized: r.totals.expenseRealized, bold: true });
  out.push({ label: "SURPLUS/(DEFISIT)", indent: 0, budget: r.surplusBudget, realized: r.surplusRealized, bold: true });
  out.push({ label: "PEMBIAYAAN", indent: 0, budget: 0n, realized: 0n, bold: true });
  out.push({ label: "Penerimaan Pembiayaan", indent: 1, budget: r.totals.financingInBudget, realized: r.totals.financingInRealized });
  out.push({ label: "Pengeluaran Pembiayaan", indent: 1, budget: r.totals.financingOutBudget, realized: r.totals.financingOutRealized });
  out.push({ label: "PEMBIAYAAN NETTO", indent: 0, budget: r.financingNetBudget, realized: r.financingNetRealized, bold: true });
  out.push({ label: "SILPA TAHUN BERJALAN", indent: 0, budget: r.silpaBudget, realized: r.silpaRealized, bold: true });
  return out;
}

// ---- Rekap per kegiatan (pengganti ringkas Laporan Realisasi Kegiatan)

export interface ActivityRecap {
  activityCode: string;
  name: string;
  budget: Cents;
  realized: Cents;
  remaining: Cents;
  /** Realisasi per jenis belanja (5.1 pegawai, 5.2 barang/jasa, 5.3 modal, 5.4 tak terduga). */
  byType: { personnel: Cents; goods: Cents; capital: Cents; unexpected: Cents };
  percent: number;
}

export function buildActivityRecap(lines: BudgetLine[], entries: LedgerEntry[], untilDate?: string): ActivityRecap[] {
  const m = new Map<string, ActivityRecap>();
  const get = (code: string): ActivityRecap => {
    let r = m.get(code);
    if (!r) {
      r = { activityCode: code, name: kegiatanName(code) ?? code, budget: 0n, realized: 0n, remaining: 0n, byType: { personnel: 0n, goods: 0n, capital: 0n, unexpected: 0n }, percent: 0 };
      m.set(code, r);
    }
    return r;
  };
  for (const l of lines) if (l.activityCode && accountKind(l.accountCode) === "BELANJA") get(l.activityCode).budget += l.amountCents;
  for (const e of entries) {
    if ((e.type !== "PENGELUARAN" && e.type !== "PANJAR_KEMBALI") || !e.activityCode || !e.accountCode || (untilDate && e.entryDate > untilDate)) continue;
    const r = get(e.activityCode);
    const amt = e.type === "PANJAR_KEMBALI" ? -e.amountCents : e.amountCents;
    r.realized += amt;
    if (e.accountCode.startsWith("5.1.")) r.byType.personnel += amt;
    else if (e.accountCode.startsWith("5.2.")) r.byType.goods += amt;
    else if (e.accountCode.startsWith("5.3.")) r.byType.capital += amt;
    else r.byType.unexpected += amt;
  }
  const list = [...m.values()].sort((a, b) => (pad(a.activityCode) < pad(b.activityCode) ? -1 : 1));
  for (const r of list) {
    r.remaining = r.budget - r.realized;
    r.percent = r.budget > 0n ? Number((r.realized * 10000n) / r.budget) / 100 : 0;
  }
  return list;
}

/** Keseimbangan APB Desa: surplus/(defisit) + pembiayaan netto. Normalnya nol (defisit ditutup pembiayaan). */
export function budgetBalance(lines: BudgetLine[]): { income: Cents; expense: Cents; financingIn: Cents; financingOut: Cents; difference: Cents } {
  let income = 0n;
  let expense = 0n;
  let financingIn = 0n;
  let financingOut = 0n;
  for (const l of lines) {
    const k = accountKind(l.accountCode);
    if (k === "PENDAPATAN") income += l.amountCents;
    else if (k === "BELANJA") expense += l.amountCents;
    else if (l.accountCode.startsWith("6.1.")) financingIn += l.amountCents;
    else financingOut += l.amountCents;
  }
  return { income, expense, financingIn, financingOut, difference: income - expense + financingIn - financingOut };
}
