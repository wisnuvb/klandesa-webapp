import { createTtlCache } from "@/lib/cache/ttl-cache";

/**
 * Cache 60 detik per proses untuk agregasi dasbor owner. Hanya optimasi: data owner boleh basi semenit, dan PM2 menjalankan
 * banyak worker yang tidak berbagi cache (tiap worker menghitung sendiri paling banyak 1x/menit per kunci). Bukan untuk keputusan izin.
 */
export const METRICS_TTL_MS = 60_000;
const cache = createTtlCache<string, unknown>({ ttlMs: METRICS_TTL_MS, maxEntries: 32 });

export function cachedMetric<T>(key: string, loader: () => Promise<T>): Promise<T> {
  return cache.getOrLoad(key, loader) as Promise<T>;
}

/** Untuk tes (dan bila suatu saat ada tombol "muat ulang paksa"). */
export function clearMetricsCache(): void {
  cache.clear();
}
