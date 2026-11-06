/** Agregasi murni untuk dasbor owner (tanpa DB). */
import type { Bucket } from "./period";
import { DAY_MS } from "./period";

export type SeriesPoint = { key: string; label: string; amount: number; count: number };

/** Isi bucket yang tak punya baris dengan 0 agar grafik tidak berlubang; baris di luar bucket diabaikan. */
export function fillSeries(buckets: Bucket[], rows: Iterable<{ key: string; amount: number; count: number }>): SeriesPoint[] {
  const map = new Map<string, { amount: number; count: number }>();
  for (const r of rows) {
    const cur = map.get(r.key) ?? { amount: 0, count: 0 };
    map.set(r.key, { amount: cur.amount + r.amount, count: cur.count + r.count });
  }
  return buckets.map((b) => ({ key: b.key, label: b.label, amount: map.get(b.key)?.amount ?? 0, count: map.get(b.key)?.count ?? 0 }));
}

/** Perubahan relatif (0.1 = +10%). null bila pembanding 0/tidak valid (tidak bisa dihitung, bukan 0%). */
export function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return (current - previous) / previous;
}

/** n/d; null bila penyebut 0 (tidak ada data, bukan 0%). */
export function ratio(n: number, d: number): number | null {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return null;
  return n / d;
}

export const sum = (xs: Iterable<number>) => {
  let t = 0;
  for (const x of xs) t += x;
  return t;
};

/** Hasil agregat MySQL (BigInt/Decimal/string) -> number aman. */
export function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "bigint") return Number(v);
  const n = Number(String(v));
  return Number.isFinite(n) ? n : 0;
}

export type VillageStatusClass = "aktif" | "trial" | "tenggang" | "kedaluwarsa" | "nonaktif";
export const VILLAGE_STATUS_CLASSES: readonly VillageStatusClass[] = ["aktif", "trial", "tenggang", "kedaluwarsa", "nonaktif"];
export const VILLAGE_STATUS_LABEL: Record<VillageStatusClass, string> = {
  aktif: "Berlangganan aktif",
  trial: "Trial berjalan",
  tenggang: "Masa tenggang",
  kedaluwarsa: "Kedaluwarsa",
  nonaktif: "Nonaktif",
};
export const GRACE_DAYS_FOR_METRICS = 7;

/**
 * Klasifikasi status langganan desa untuk statistik. Cermin dari ekspresi CASE di SQL (villages.ts) DAN selaras dengan
 * `resolveSubscriptionPhase` (lib/subscription.ts): trial yang lewat masa -> tenggang (7 hari), lalu kedaluwarsa. Karena transisi di
 * database terjadi malas (saat desa mengakses), kelas dihitung dari status + tanggal, bukan status mentah.
 * - nonaktif: desa dimatikan admin (isActive=false) atau status "cancelled".
 * - kedaluwarsa: sisanya yang tidak hidup (status inactive, langganan lewat masa, trial lewat tenggang).
 */
export function classifyVillageStatus(
  v: { isActive: boolean; subscriptionStatus: string | null; subscriptionExpiry: Date | null },
  now: Date,
): VillageStatusClass {
  const status = String(v.subscriptionStatus ?? "").toLowerCase();
  const nowMs = now.getTime();
  const exp = v.subscriptionExpiry?.getTime() ?? null;
  const notPast = exp == null || exp > nowMs;
  if (!v.isActive || status === "cancelled") return "nonaktif";
  if (status === "active" && notPast) return "aktif";
  if (status === "trial" && notPast) return "trial";
  if (status === "grace" && notPast) return "tenggang";
  if (status === "trial" && exp != null && exp > nowMs - GRACE_DAYS_FOR_METRICS * DAY_MS) return "tenggang";
  return "kedaluwarsa";
}

/** Sisa hari (dibulatkan ke atas, min 0) sampai `expiry`. */
export function daysUntil(expiry: Date, now: Date): number {
  const diff = expiry.getTime() - now.getTime();
  return diff <= 0 ? 0 : Math.ceil(diff / DAY_MS);
}
