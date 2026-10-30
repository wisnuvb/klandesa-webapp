export type SubTotals = { anggaran: number; realisasi: number };
export type Group = { anggaran: number; realisasi: number; subs: Map<string, SubTotals> };
export type TxGroups = Map<string, { sum: number; subs: Map<string, number> }>;

/** Cari kunci yang sudah ada tanpa membedakan huruf besar/kecil & spasi pinggir. */
export function findKey<V>(map: Map<string, V>, name: string): string | undefined {
  const lower = name.trim().toLowerCase();
  for (const k of map.keys()) if (k.toLowerCase() === lower) return k;
  return undefined;
}

export function budgetsToGroups(
  items: Array<{
    category: string;
    subCategory: string | null;
    budgetAmount: unknown;
    realizedAmount: unknown;
  }>,
  fallbackCategory: string,
): Map<string, Group> {
  const map = new Map<string, Group>();
  for (const b of items) {
    const cat = (b.category || fallbackCategory).trim();
    const sub = (b.subCategory || "Lainnya").trim();
    const key = findKey(map, cat) ?? cat;
    const entry = map.get(key) ?? { anggaran: 0, realisasi: 0, subs: new Map() };
    const budget = Number(b.budgetAmount ?? 0);
    const realized = Number(b.realizedAmount ?? 0);
    entry.anggaran += budget;
    entry.realisasi += realized;
    const subKey = findKey(entry.subs, sub) ?? sub;
    const prev = entry.subs.get(subKey) ?? { anggaran: 0, realisasi: 0 };
    entry.subs.set(subKey, {
      anggaran: prev.anggaran + budget,
      realisasi: prev.realisasi + realized,
    });
    map.set(key, entry);
  }
  return map;
}

export function groupTransactions(
  rows: Array<{ amount: unknown; group: string; sub: string }>,
): TxGroups {
  const out: TxGroups = new Map();
  for (const r of rows) {
    const amount = Number(r.amount ?? 0);
    const key = findKey(out, r.group) ?? r.group;
    const entry = out.get(key) ?? { sum: 0, subs: new Map<string, number>() };
    entry.sum += amount;
    const subKey = findKey(entry.subs, r.sub) ?? r.sub;
    entry.subs.set(subKey, (entry.subs.get(subKey) ?? 0) + amount);
    out.set(key, entry);
  }
  return out;
}

/**
 * Realisasi mengikuti transaksi kas (Budget.realizedAmount tidak pernah diperbarui oleh transaksi).
 * Kategori/sub yang belum dianggarkan tetap ditampilkan: anggaran 0 bila desa punya anggaran,
 * atau = realisasi bila belum ada anggaran sama sekali (tampilan awal tanpa APBDes).
 */
export function mergeRealisasi(map: Map<string, Group>, tx: TxGroups, hasBudget: boolean) {
  for (const [cat, g] of tx) {
    const key = findKey(map, cat) ?? cat;
    const existing = map.get(key);
    const entry: Group = existing ?? {
      anggaran: hasBudget ? 0 : g.sum,
      realisasi: g.sum,
      subs: new Map(),
    };
    if (existing) entry.realisasi = Math.max(entry.realisasi, g.sum);
    for (const [sub, amount] of g.subs) {
      const subKey = findKey(entry.subs, sub) ?? sub;
      const prev = entry.subs.get(subKey);
      entry.subs.set(subKey, {
        anggaran: prev ? prev.anggaran : hasBudget ? 0 : amount,
        realisasi: Math.max(prev?.realisasi ?? 0, amount),
      });
    }
    map.set(key, entry);
  }
}
