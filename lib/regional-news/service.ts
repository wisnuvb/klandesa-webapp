import {
  isRegionalNewsEnabled,
  REGIONAL_NEWS_READ_CACHE_MS,
  REGIONAL_NEWS_SYNC_SKIP_IF_FRESH_HOURS,
} from "@/lib/regional-news/config";
import { fetchRegionalNewsFromGoogle } from "@/lib/regional-news/fetcher";
import { buildRegionKey } from "@/lib/regional-news/region-key";
import {
  getRegionalNewsSnapshot,
  upsertRegionalNewsSnapshot,
} from "@/lib/regional-news/snapshot-store";
import type {
  RegionalNewsFeedResponse,
  RegionalNewsItem,
} from "@/lib/regional-news/types";
import { REGIONAL_NEWS_MAX_ITEMS } from "@/lib/regional-news/types";

type ReadCacheEntry = {
  timestamp: number;
  value: RegionalNewsFeedResponse;
};

const readCache = new Map<string, ReadCacheEntry>();
const inFlightSync = new Map<string, Promise<RegionalNewsFeedResponse>>();

function buildEmptyResponse(
  province: string,
  regency: string,
  lastError: string | null = null,
): RegionalNewsFeedResponse {
  return {
    items: [],
    fetchedAt: null,
    stale: false,
    region: {
      province,
      regency,
      regionKey: buildRegionKey(province, regency),
    },
    lastError,
  };
}

function toResponse(
  snapshot: Awaited<ReturnType<typeof getRegionalNewsSnapshot>>,
  province: string,
  regency: string,
  limit: number,
): RegionalNewsFeedResponse {
  if (!snapshot) return buildEmptyResponse(province, regency);
  const stale = snapshot.expiresAt.getTime() <= Date.now();
  return {
    items: snapshot.items.slice(0, limit),
    fetchedAt: snapshot.fetchedAt.toISOString(),
    stale,
    region: {
      province: snapshot.province,
      regency: snapshot.regency,
      regionKey: snapshot.regionKey,
    },
    lastError: snapshot.lastError,
  };
}

export async function syncRegionalNewsRegion(
  province: string,
  regency: string,
  options?: { force?: boolean },
): Promise<RegionalNewsFeedResponse> {
  if (!isRegionalNewsEnabled()) {
    return buildEmptyResponse(province, regency, "Regional news disabled");
  }

  const regionKey = buildRegionKey(province, regency);

  if (!options?.force) {
    const existing = await getRegionalNewsSnapshot(province, regency);
    if (existing) {
      const freshUntil =
        existing.expiresAt.getTime() -
        REGIONAL_NEWS_SYNC_SKIP_IF_FRESH_HOURS * 60 * 60 * 1000;
      if (freshUntil > Date.now()) {
        return toResponse(existing, province, regency, REGIONAL_NEWS_MAX_ITEMS);
      }
    }
  }

  try {
    const { items } = await fetchRegionalNewsFromGoogle(province, regency);
    const snapshot = await upsertRegionalNewsSnapshot({
      province,
      regency,
      items,
      lastError: null,
    });
    readCache.delete(regionKey);
    return toResponse(snapshot, province, regency, REGIONAL_NEWS_MAX_ITEMS);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal mengambil berita regional";
    const previous = await getRegionalNewsSnapshot(province, regency);
    if (previous) {
      await upsertRegionalNewsSnapshot({
        province,
        regency,
        items: previous.items,
        lastError: message,
      });
      return toResponse(previous, province, regency, REGIONAL_NEWS_MAX_ITEMS);
    }
    await upsertRegionalNewsSnapshot({
      province,
      regency,
      items: [] as RegionalNewsItem[],
      lastError: message,
    });
    return buildEmptyResponse(province, regency, message);
  }
}

export async function getRegionalNewsForRegion(
  province: string,
  regency: string,
  limit = 6,
): Promise<RegionalNewsFeedResponse> {
  if (!isRegionalNewsEnabled()) {
    return buildEmptyResponse(province, regency, "Regional news disabled");
  }

  const regionKey = buildRegionKey(province, regency);
  const cached = readCache.get(regionKey);
  if (cached && Date.now() - cached.timestamp < REGIONAL_NEWS_READ_CACHE_MS) {
    return {
      ...cached.value,
      items: cached.value.items.slice(0, limit),
    };
  }

  const snapshot = await getRegionalNewsSnapshot(province, regency);
  if (!snapshot) {
    const existing = inFlightSync.get(regionKey);
    const syncPromise =
      existing ??
      syncRegionalNewsRegion(province, regency).finally(() => {
        inFlightSync.delete(regionKey);
      });
    if (!existing) inFlightSync.set(regionKey, syncPromise);
    const synced = await syncPromise;
    readCache.set(regionKey, { timestamp: Date.now(), value: synced });
    return { ...synced, items: synced.items.slice(0, limit) };
  }

  const response = toResponse(snapshot, province, regency, limit);
  readCache.set(regionKey, {
    timestamp: Date.now(),
    value: toResponse(snapshot, province, regency, REGIONAL_NEWS_MAX_ITEMS),
  });
  return response;
}

export async function syncAllActiveRegions(options?: {
  force?: boolean;
}): Promise<{
  total: number;
  synced: number;
  skipped: number;
  failed: number;
}> {
  const { listActiveRegionPairs } = await import(
    "@/lib/regional-news/snapshot-store"
  );
  const {
    REGIONAL_NEWS_SYNC_BATCH_DELAY_MS,
    REGIONAL_NEWS_SYNC_BATCH_SIZE,
  } = await import("@/lib/regional-news/config");

  const regions = await listActiveRegionPairs();
  let synced = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < regions.length; i += REGIONAL_NEWS_SYNC_BATCH_SIZE) {
    const batch = regions.slice(i, i + REGIONAL_NEWS_SYNC_BATCH_SIZE);
    for (const region of batch) {
      try {
        if (!options?.force) {
          const existing = await getRegionalNewsSnapshot(
            region.province,
            region.regency,
          );
          if (existing) {
            const freshUntil =
              existing.expiresAt.getTime() -
              REGIONAL_NEWS_SYNC_SKIP_IF_FRESH_HOURS * 60 * 60 * 1000;
            if (freshUntil > Date.now()) {
              skipped += 1;
              continue;
            }
          }
        }
        await syncRegionalNewsRegion(region.province, region.regency, options);
        synced += 1;
      } catch {
        failed += 1;
      }
    }
    if (i + REGIONAL_NEWS_SYNC_BATCH_SIZE < regions.length) {
      await new Promise((resolve) =>
        setTimeout(resolve, REGIONAL_NEWS_SYNC_BATCH_DELAY_MS),
      );
    }
  }

  return { total: regions.length, synced, skipped, failed };
}
