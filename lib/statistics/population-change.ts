/** Perubahan jumlah penduduk per bulan dari mutasi yang sudah diterapkan (murni, tanpa database). */
import { netPopulationChange, summarizeByMonth, type MutationRow } from "@/lib/kependudukan/report";
import type { PopulationChange, PopulationChangeMonth } from "./types";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Kunci "yyyy-mm" untuk `count` bulan sampai bulan `now` (UTC), terlama lebih dulu. */
export function recentMonthKeys(now: Date, count = 6): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

/** Rentang tanggal [from, to] yang perlu diambil dari tabel mutasi untuk `recentMonthKeys`. */
export function mutationRange(now: Date, count = 6): { from: string; to: string } {
  const keys = recentMonthKeys(now, count);
  // Hari ke-0 bulan berikutnya = hari terakhir bulan ini (tanggal selalu valid, mis. 30 Juni).
  const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { from: `${keys[0]}-01`, to: last.toISOString().slice(0, 10) };
}

export function buildPopulationChange(
  rows: readonly MutationRow[],
  totalPenduduk: number,
  now: Date,
  count = 6,
): PopulationChange {
  const keys = recentMonthKeys(now, count);
  const { from, to } = mutationRange(now, count);
  const byMonth = summarizeByMonth(rows, from, to);

  const perBulan: PopulationChangeMonth[] = keys.map((key) => {
    const s = byMonth.get(key);
    const lahir = s?.BIRTH ?? 0;
    const datang = s?.MOVE_IN ?? 0;
    const meninggal = s?.DEATH ?? 0;
    const pindah = s?.MOVE_OUT ?? 0;
    return {
      key,
      bulan: MONTH_LABELS[Number(key.slice(5, 7)) - 1],
      lahir,
      datang,
      meninggal,
      pindah,
      bertambah: lahir + datang,
      berkurang: meninggal + pindah,
      selisih: s ? netPopulationChange(s) : 0,
    };
  });

  const bulanIni = perBulan[perBulan.length - 1].selisih;
  const awalBulan = totalPenduduk - bulanIni;
  const persenBulanIni = awalBulan > 0 ? Math.round((bulanIni / awalBulan) * 10000) / 100 : 0;

  return { bulanIni, persenBulanIni, perBulan };
}
