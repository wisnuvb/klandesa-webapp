/** Penyaluran, tenggat laporan, dan capaian keluaran Dana Desa. Murni (tanpa Prisma), aman untuk klien. */
import type { YearRules } from "./rules";

export interface StageRow {
  stage: 1 | 2;
  pct: number;
  cents: bigint;
}

/** Tahap penyaluran Dana Desa reguler: 40/60, atau 60/40 untuk Desa mandiri (PMK 7/2026 Pasal 23). */
export function stagePlan(rules: YearRules, regularCents: bigint | null, mandiri: boolean): StageRow[] | null {
  if (regularCents === null) return null;
  const [a, b] = mandiri ? rules.stages.mandiri : rules.stages.regular;
  const first = (regularCents * BigInt(a)) / 100n;
  return [
    { stage: 1, pct: a, cents: first },
    { stage: 2, pct: b, cents: regularCents - first },
  ];
}

/** Tambah bulan pada tanggal ISO (YYYY-MM-DD); hari dipangkas ke akhir bulan tujuan. */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const idx = (y * 12 + (m - 1)) + months;
  const ty = Math.floor(idx / 12);
  const tm = (idx % 12) + 1;
  const last = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
  return `${String(ty).padStart(4, "0")}-${String(tm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

export type DueState = "done" | "overdue" | "soon" | "upcoming" | "open";
/** Status tenggat: selesai bila sudah dilaporkan; terlambat bila lewat; segera bila ≤14 hari. */
export function dueState(due: string | null, doneOn: string | null, today: string): DueState {
  if (doneOn) return "done";
  if (!due) return "open";
  if (due < today) return "overdue";
  const days = (Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000;
  return days <= 14 ? "soon" : "upcoming";
}

export interface OutputRow {
  activityCode: string;
  outputName: string | null;
  volume: number | null;
  unit: string | null;
  realized: number | null;
  /** Persen capaian; null bila volume atau capaian belum diisi */
  pct: number | null;
}

/** Capaian satu kegiatan = realisasi ÷ volume keluaran (tanpa dibulatkan; nol bila belum diisi dihitung di rata-rata). */
export function outputPct(volume: number | null, realized: number | null): number | null {
  if (volume === null || volume <= 0 || realized === null || realized < 0) return null;
  return (realized / volume) * 100;
}

/**
 * Capaian keluaran Desa = rata-rata persen capaian seluruh kegiatan (PMK 7/2026 Pasal 25 ayat 5).
 * Kegiatan yang belum diisi dihitung 0% agar angka tidak tampak lebih baik dari kenyataan; jumlahnya dilaporkan terpisah.
 */
export function averageOutput(rows: OutputRow[]): { averagePct: number | null; filled: number; missing: number } {
  if (!rows.length) return { averagePct: null, filled: 0, missing: 0 };
  const filled = rows.filter((r) => r.pct !== null).length;
  const sum = rows.reduce((s, r) => s + (r.pct ?? 0), 0);
  return { averagePct: sum / rows.length, filled, missing: rows.length - filled };
}
