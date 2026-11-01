import { FIELDS, FIELD_KEYS, type FieldCode } from "./catalog";

/** Hitungan anggaran indikatif RPJM Desa. Murni; uang dalam sen (BigInt). */

export interface BudgetRow {
  year: number;
  fieldCode: string;
  budgetCents: bigint | null;
}

export interface BudgetMatrix {
  years: number[];
  fields: { code: FieldCode; label: string; perYear: bigint[]; total: bigint; count: number }[];
  yearTotals: bigint[];
  total: bigint;
  /** Program yang tahunnya di luar periode: tidak masuk matriks tetapi dihitung agar tidak hilang diam-diam. */
  outside: { count: number; total: bigint };
}

export function budgetMatrix(rows: readonly BudgetRow[], periodStart: number, periodEnd: number): BudgetMatrix {
  const years: number[] = [];
  for (let y = periodStart; y <= periodEnd && years.length < 20; y++) years.push(y);
  const idx = new Map(years.map((y, i) => [y, i]));
  const fields = FIELD_KEYS.map((code) => ({ code, label: FIELDS[code], perYear: years.map(() => 0n), total: 0n, count: 0 }));
  const yearTotals = years.map(() => 0n);
  let total = 0n;
  const outside = { count: 0, total: 0n };
  for (const r of rows) {
    const c = r.budgetCents ?? 0n;
    const yi = idx.get(r.year);
    const f = fields.find((x) => x.code === r.fieldCode);
    if (yi === undefined || !f) {
      outside.count += 1;
      outside.total += c;
      continue;
    }
    f.perYear[yi] += c;
    f.total += c;
    f.count += 1;
    yearTotals[yi] += c;
    total += c;
  }
  return { years, fields, yearTotals, total, outside };
}
