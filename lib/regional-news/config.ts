export function isRegionalNewsEnabled(): boolean {
  const raw = process.env.REGIONAL_NEWS_ENABLED;
  if (raw === undefined || raw === "") return true;
  return raw === "1" || raw.toLowerCase() === "true";
}

export function getRegionalNewsTtlHours(): number {
  const raw = Number(process.env.REGIONAL_NEWS_TTL_HOURS ?? 12);
  if (!Number.isFinite(raw) || raw < 1) return 12;
  return Math.min(48, Math.floor(raw));
}

export function getCronSecret(): string | null {
  const secret = process.env.CRON_SECRET?.trim();
  return secret || null;
}

export const REGIONAL_NEWS_READ_CACHE_MS = 60_000;
export const REGIONAL_NEWS_SYNC_SKIP_IF_FRESH_HOURS = 6;
export const REGIONAL_NEWS_SYNC_BATCH_SIZE = 10;
export const REGIONAL_NEWS_SYNC_BATCH_DELAY_MS = 1_000;

export const REGIONAL_NEWS_DISCLAIMER =
  "Berita dari media eksternal. Klandesa menampilkan judul dan tautan; isi artikel menjadi tanggung jawab penerbit.";
