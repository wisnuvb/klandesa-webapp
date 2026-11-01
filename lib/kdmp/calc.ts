/** Perhitungan dukungan KDMP. Murni (tanpa Prisma). Uang dalam sen (BigInt); rasio dalam basis poin. */
import type { Finding } from "@/lib/dana-desa/compliance";
import type { FacilityStatus } from "./catalog";

/** Selisih (poin persen) angsuran terhadap progres fisik yang masih wajar sebelum diberi tanda. */
export const AHEAD_POINTS = 20;
/** Hari tanpa pembaruan progres sebelum diingatkan. */
export const STALE_DAYS = 60;

const rp = (c: bigint): string => `Rp${new Intl.NumberFormat("id-ID").format(c / 100n)}`;

export const shareBps = (part: bigint, whole: bigint): number => (whole > 0n ? Number((part * 10000n) / whole) : 0);

export function facilityStatus(progressPct: number, operatingOn: string | null): FacilityStatus {
  if (operatingOn) return "BEROPERASI";
  if (progressPct >= 100) return "SELESAI";
  return progressPct > 0 ? "PEMBANGUNAN" : "RENCANA";
}

/** Hari antara dua tanggal ISO (YYYY-MM-DD), b - a. */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export interface FacilityFacts {
  id: number;
  name: string;
  contractCents: bigint | null;
  paidCents: bigint;
  progressPct: number;
  progressOn: string | null;
  operatingOn: string | null;
}

export interface KdmpFacts {
  /** Persen pagu KDMP terhadap total pagu (basis poin) menurut aturan tahun itu, mis. 5803 */
  ruleShareBps: number;
  kdmpPaguCents: bigint | null;
  regularPaguCents: bigint | null;
  receivedCents: bigint;
  paidCents: bigint;
  /** Anggaran KDMP di dokumen APB Desa terbaru tahun itu; null bila belum ada dokumen */
  budgetedCents: bigint | null;
  facilities: FacilityFacts[];
  unassignedPaidCents: bigint;
  today: string;
}

export function kdmpFindings(f: KdmpFacts): Finding[] {
  const out: Finding[] = [];
  if (f.kdmpPaguCents === null) out.push({ code: "PAGU_MISSING", level: "INFO", message: "Pagu KDMP tahun ini belum diisi. Isi dari keputusan pagu yang berlaku di halaman Dana Desa agar penyaluran dapat dibandingkan." });
  if (f.kdmpPaguCents !== null && f.regularPaguCents !== null && f.kdmpPaguCents + f.regularPaguCents > 0n) {
    const share = shareBps(f.kdmpPaguCents, f.kdmpPaguCents + f.regularPaguCents);
    if (Math.abs(share - f.ruleShareBps) > 50) out.push({ code: "SHARE_DIFF", level: "INFO", message: `Pagu KDMP ${(share / 100).toLocaleString("id-ID", { maximumFractionDigits: 2 })}% dari total pagu; acuan aturan ${(f.ruleShareBps / 100).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%. Selisih wajar bila ada penyesuaian pagu; pastikan sesuai keputusan yang berlaku.`, ref: "PMK 7/2026 Pasal 15" });
  }
  if (f.kdmpPaguCents !== null && f.receivedCents > f.kdmpPaguCents) out.push({ code: "OVER_PAGU", level: "ERROR", message: `Penyaluran tercatat (${rp(f.receivedCents)}) melebihi pagu KDMP (${rp(f.kdmpPaguCents)}). Periksa pagu atau catatan penyaluran.`, ref: "PMK 7/2026 Pasal 15 ayat 3" });
  if (f.receivedCents > 0n) {
    const b = f.budgetedCents ?? 0n;
    if (b < f.receivedCents) out.push({ code: "NOT_BUDGETED", level: "WARN", message: f.budgetedCents === null ? `Dana KDMP ${rp(f.receivedCents)} sudah diterima, tetapi belum ada APB Desa tahun ini. Anggarkan melalui perubahan APB Desa.` : `Dana KDMP diterima ${rp(f.receivedCents)}, baru ${rp(b)} yang dianggarkan (kegiatan bertanda fokus KDMP). Sisanya perlu dianggarkan melalui perubahan APB Desa.`, ref: "Permendesa 16/2025 Pasal 2 ayat 2" });
  }
  if (f.paidCents > 0n && f.paidCents > (f.budgetedCents ?? 0n)) out.push({ code: "PAID_OVER_BUDGET", level: "WARN", message: `Angsuran dibayar ${rp(f.paidCents)} melebihi anggaran KDMP di APB Desa (${rp(f.budgetedCents ?? 0n)}). Belanja harus tercantum dalam APB Desa atau perubahannya.`, ref: "Permendesa 16/2025 Pasal 2 ayat 2" });
  if (f.receivedCents > f.paidCents) out.push({ code: "BALANCE", level: "INFO", message: `Saldo dana KDMP yang belum diangsurkan ${rp(f.receivedCents - f.paidCents)}.` });
  if ((f.receivedCents > 0n || f.paidCents > 0n) && !f.facilities.length) out.push({ code: "NO_FACILITY", level: "INFO", message: "Belum ada gerai, gudang, atau kelengkapan yang dicatat. Daftarkan agar angsuran dan progres fisiknya dapat dipantau.", ref: "PMK 7/2026 Pasal 20 ayat 3" });
  if (f.unassignedPaidCents > 0n && f.facilities.length) out.push({ code: "UNASSIGNED", level: "INFO", message: `${rp(f.unassignedPaidCents)} angsuran belum dikaitkan ke gerai, gudang, atau kelengkapan tertentu.` });
  for (const x of f.facilities) {
    if (x.paidCents > 0n && x.contractCents === null) out.push({ code: "NO_CONTRACT", level: "INFO", message: `${x.name}: nilai pekerjaan belum diisi, jadi angsuran belum dapat dibandingkan dengan progres fisik.` });
    if (x.contractCents !== null && x.contractCents > 0n && x.paidCents > 0n) {
      const paid = shareBps(x.paidCents, x.contractCents) / 100;
      if (paid - x.progressPct > AHEAD_POINTS) out.push({ code: "PAY_AHEAD", level: "WARN", message: `${x.name}: angsuran terbayar ${paid.toLocaleString("id-ID", { maximumFractionDigits: 1 })}% dari nilai pekerjaan, progres fisik baru ${x.progressPct}%. Periksa kesesuaian pembayaran dengan kemajuan pekerjaan.` });
    }
    if (!x.operatingOn && x.progressPct > 0 && x.progressPct < 100 && x.progressOn && daysBetween(x.progressOn, f.today) > STALE_DAYS) out.push({ code: "STALE", level: "INFO", message: `${x.name}: progres terakhir dicatat ${x.progressOn}, sudah lebih dari ${STALE_DAYS} hari. Perbarui progres fisiknya.` });
  }
  return out;
}
