import Parser from "rss-parser";
import { buildGoogleNewsRssUrl } from "@/lib/regional-news/query-builder";
import { normalizeFeedItems } from "@/lib/regional-news/matcher";
import type { RegionalNewsItem } from "@/lib/regional-news/types";

const parser = new Parser({
  timeout: 15_000,
  headers: {
    "User-Agent": "KlandesaRegionalNews/1.0 (+https://klandesa.com)",
    Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
  },
});

export async function fetchRegionalNewsFromGoogle(
  province: string,
  regency: string,
): Promise<{ items: RegionalNewsItem[]; feedTitle?: string }> {
  const url = buildGoogleNewsRssUrl(province, regency);
  const feed = await parser.parseURL(url);
  const items = normalizeFeedItems(feed.items ?? []);
  return { items, feedTitle: feed.title };
}
