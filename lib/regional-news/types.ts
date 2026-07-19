export type RegionalNewsItem = {
  guid: string;
  title: string;
  excerpt: string | null;
  sourceUrl: string;
  sourceName: string;
  imageUrl: string | null;
  publishedAt: string;
};

export type RegionalNewsRegion = {
  province: string;
  regency: string;
  regionKey: string;
};

export type RegionalNewsFeedResponse = {
  items: RegionalNewsItem[];
  fetchedAt: string | null;
  stale: boolean;
  region: RegionalNewsRegion;
  lastError: string | null;
};

export const REGIONAL_NEWS_MAX_ITEMS = 12;
export const REGIONAL_NEWS_MAX_EXCERPT = 280;
