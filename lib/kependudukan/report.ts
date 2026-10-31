/** Rekap mutasi penduduk per periode dan wilayah (murni). Dasar laporan bulanan ke kecamatan/kabupaten. */
import type { MutationType } from "./mutation";

export interface MutationRow {
  type: MutationType;
  /** yyyy-mm-dd */
  effectiveDate: string;
  rw: string | null;
  rt: string | null;
}

export interface MutationSummary {
  BIRTH: number;
  DEATH: number;
  MOVE_OUT: number;
  MOVE_IN: number;
  KK_CHANGE: number;
}

const empty = (): MutationSummary => ({ BIRTH: 0, DEATH: 0, MOVE_OUT: 0, MOVE_IN: 0, KK_CHANGE: 0 });

/** Selisih jumlah penduduk dari mutasi: lahir + datang − meninggal − pindah. KK_CHANGE tidak memengaruhi jumlah. */
export function netPopulationChange(s: MutationSummary): number {
  return s.BIRTH + s.MOVE_IN - s.DEATH - s.MOVE_OUT;
}

/** Rekap per bulan "yyyy-mm" dalam rentang [from, to] inklusif (yyyy-mm-dd). */
export function summarizeByMonth(rows: readonly MutationRow[], from: string, to: string): Map<string, MutationSummary> {
  const out = new Map<string, MutationSummary>();
  for (const r of rows) {
    if (r.effectiveDate < from || r.effectiveDate > to) continue;
    const key = r.effectiveDate.slice(0, 7);
    const s = out.get(key) ?? empty();
    s[r.type] += 1;
    out.set(key, s);
  }
  return new Map([...out.entries()].sort(([a], [b]) => (a < b ? -1 : 1)));
}

/** Rekap per "RW/RT" dalam rentang; wilayah kosong dikelompokkan ke "-". */
export function summarizeByRtRw(rows: readonly MutationRow[], from: string, to: string): Map<string, MutationSummary> {
  const out = new Map<string, MutationSummary>();
  for (const r of rows) {
    if (r.effectiveDate < from || r.effectiveDate > to) continue;
    const key = r.rw || r.rt ? `RW ${r.rw?.trim() || "-"} / RT ${r.rt?.trim() || "-"}` : "-";
    const s = out.get(key) ?? empty();
    s[r.type] += 1;
    out.set(key, s);
  }
  return new Map([...out.entries()].sort(([a], [b]) => (a < b ? -1 : 1)));
}
