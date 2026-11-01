/** Rekomendasi fokus dari skor IDM (murni). Hanya membandingkan angka dalam satu berkas/tahun: skala antar sumber berbeda. */
import type { Dimension } from "./catalog";

export interface IndicatorFact {
  id: number;
  dimension: Dimension;
  code: string | null;
  name: string;
  score: number;
  maxScore: number | null;
  note: string | null;
  suggestion: string | null;
}
export interface ScoreFact {
  year: number;
  iks: number | null;
  ike: number | null;
  ikl: number | null;
  idm: number | null;
  status: string | null;
}

/** Nilai pembanding: skor/skor maksimal bila SEMUA indikator punya skor maksimal; selain itu skor mentah. */
export function rankIndicators(items: IndicatorFact[]): { ranked: (IndicatorFact & { relative: number | null })[]; basis: "RASIO" | "MENTAH" } {
  const ratio = items.length > 0 && items.every((i) => i.maxScore !== null && i.maxScore > 0);
  const ranked = items
    .map((i) => ({ ...i, relative: i.maxScore && i.maxScore > 0 ? i.score / i.maxScore : null }))
    .sort((a, b) => (ratio ? (a.relative! - b.relative!) : a.score - b.score) || a.name.localeCompare(b.name, "id"));
  return { ranked, basis: ratio ? "RASIO" : "MENTAH" };
}

export interface Recommendation {
  basis: "RASIO" | "MENTAH" | "DIMENSI" | "TIDAK_ADA";
  /** indikator terendah secara keseluruhan */
  overall: (IndicatorFact & { relative: number | null })[];
  /** indikator terendah tiap dimensi (maks. n) */
  byDimension: { dimension: Dimension; items: (IndicatorFact & { relative: number | null })[] }[];
  /** dimensi dengan skor terendah (bila skor dimensi tersedia) */
  weakestDimension: { dimension: "IKS" | "IKE" | "IKL"; value: number } | null;
}

export function recommend(items: IndicatorFact[], score: ScoreFact | null, n = 5): Recommendation {
  const dims = score
    ? (["IKS", "IKE", "IKL"] as const).flatMap((d) => {
        const v = score[d.toLowerCase() as "iks" | "ike" | "ikl"];
        return v === null ? [] : [{ dimension: d, value: v }];
      })
    : [];
  const weakest = dims.length >= 2 ? dims.reduce((m, x) => (x.value < m.value ? x : m)) : null;
  if (!items.length) return { basis: weakest ? "DIMENSI" : "TIDAK_ADA", overall: [], byDimension: [], weakestDimension: weakest };
  const { ranked, basis } = rankIndicators(items);
  const byDim = (["IKS", "IKE", "IKL", "LAIN"] as const)
    .map((d) => ({ dimension: d as Dimension, items: ranked.filter((i) => i.dimension === d).slice(0, 3) }))
    .filter((g) => g.items.length);
  return { basis, overall: ranked.slice(0, n), byDimension: byDim, weakestDimension: weakest };
}

export interface Delta {
  dimension: "IKS" | "IKE" | "IKL" | "IDM";
  from: number;
  to: number;
  diff: number;
}
/** Perubahan skor dari tahun sebelumnya ke tahun ini (hanya bila keduanya ada). Hanya bermakna bila skala kedua tahun sama. */
export function deltas(cur: ScoreFact, prev: ScoreFact | null): Delta[] {
  if (!prev) return [];
  const out: Delta[] = [];
  for (const d of ["IKS", "IKE", "IKL", "IDM"] as const) {
    const k = d.toLowerCase() as "iks" | "ike" | "ikl" | "idm";
    if (cur[k] !== null && prev[k] !== null) out.push({ dimension: d, from: prev[k]!, to: cur[k]!, diff: Math.round((cur[k]! - prev[k]!) * 10_000) / 10_000 });
  }
  return out;
}

/** Skala berbeda antar tahun? Heuristik: satu tahun nilai IDM <= 1 dan tahun lain > 1. */
export function scalesDiffer(a: ScoreFact, b: ScoreFact): boolean {
  const mx = (s: ScoreFact) => Math.max(...[s.iks, s.ike, s.ikl, s.idm].filter((x): x is number => x !== null), 0);
  const [x, y] = [mx(a), mx(b)];
  return (x <= 1 && y > 1) || (y <= 1 && x > 1);
}
