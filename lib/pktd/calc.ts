/** Perhitungan upah PKTD. Murni (tanpa Prisma). Uang dalam sen (BigInt); rasio dalam basis poin. */

/** Bagian upah terhadap biaya kegiatan, basis poin (5000 = 50%). Nol bila biaya nol. */
export function shareBps(wageCents: bigint, costCents: bigint): number {
  return costCents > 0n ? Number((wageCents * 10000n) / costCents) : 0;
}

/** Upah paling sedikit `minPct` persen dari biaya kegiatan (Lampiran II.F.5.a). */
export function meetsWageShare(wageCents: bigint, costCents: bigint, minPct: number): boolean {
  return costCents > 0n && wageCents * 100n >= costCents * BigInt(minPct);
}

/** Pesan galat bila upah harian di luar batas bawah/atas kesepakatan; null bila sah. */
export function wageProblem(wageCents: bigint, minCents: bigint | null, maxCents: bigint | null): string | null {
  const rp = (c: bigint) => `Rp${new Intl.NumberFormat("id-ID").format(c / 100n)}`;
  if (wageCents <= 0n) return "Upah harian harus lebih dari nol.";
  if (minCents !== null && wageCents < minCents) return `Upah harian di bawah batas bawah ${rp(minCents)}.`;
  if (maxCents !== null && wageCents > maxCents) return `Upah harian melebihi batas atas ${rp(maxCents)}.`;
  return null;
}

export interface WarnInput {
  minPct: number;
  costCents: bigint;
  plannedWageCents: bigint;
  recordedWageCents: bigint;
  unpaidDays: number;
  wageMinCents: bigint | null;
  wageMaxCents: bigint | null;
  workerCount: number;
  priorityWorkerCount: number;
  done: boolean;
}

export function activityWarnings(w: WarnInput): { level: "ERROR" | "WARN" | "INFO"; message: string }[] {
  const out: { level: "ERROR" | "WARN" | "INFO"; message: string }[] = [];
  const pct = (c: bigint) => (shareBps(c, w.costCents) / 100).toLocaleString("id-ID", { maximumFractionDigits: 1 });
  if (w.costCents <= 0n) out.push({ level: "ERROR", message: "Total biaya kegiatan belum diisi." });
  else if (!meetsWageShare(w.plannedWageCents, w.costCents, w.minPct)) out.push({ level: "ERROR", message: `Rencana upah ${pct(w.plannedWageCents)}% dari biaya kegiatan; paling sedikit ${w.minPct}% agar sah sebagai Padat Karya Tunai Desa (Lampiran II.F.5.a).` });
  if (w.costCents > 0n && w.recordedWageCents > w.costCents) out.push({ level: "ERROR", message: "Upah yang tercatat melebihi total biaya kegiatan." });
  if (w.done && w.costCents > 0n && !meetsWageShare(w.recordedWageCents, w.costCents, w.minPct)) out.push({ level: "ERROR", message: `Kegiatan selesai tetapi upah terealisasi baru ${pct(w.recordedWageCents)}% dari biaya (minimal ${w.minPct}%).` });
  if (w.unpaidDays > 0) out.push({ level: "WARN", message: `${w.unpaidDays} hari kerja belum ditandai dibayar. Upah dibayarkan setiap hari (Lampiran II.F.4).` });
  if (w.wageMinCents === null || w.wageMaxCents === null) out.push({ level: "WARN", message: "Batas bawah dan batas atas upah harian belum ditetapkan. Tetapkan lewat kesepakatan Musyawarah Desa atau Peraturan Bupati; batas atas harus di bawah upah minimum provinsi (Lampiran II.F.5.c)." });
  if (w.workerCount > 0 && w.priorityWorkerCount === 0) out.push({ level: "INFO", message: "Belum ada pekerja dari kelompok prioritas (penganggur, setengah penganggur, perempuan kepala keluarga, keluarga miskin, marginal)." });
  return out;
}
