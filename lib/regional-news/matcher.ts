import {
  REGIONAL_NEWS_MAX_EXCERPT,
  REGIONAL_NEWS_MAX_ITEMS,
  type RegionalNewsItem,
} from "@/lib/regional-news/types";

function trimExcerpt(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  if (cleaned.length <= REGIONAL_NEWS_MAX_EXCERPT) return cleaned;
  return `${cleaned.slice(0, REGIONAL_NEWS_MAX_EXCERPT - 1).trim()}…`;
}

function parseSourceName(title: string, creator: string | undefined): string {
  if (creator?.trim()) return creator.trim();
  const dashIdx = title.lastIndexOf(" - ");
  if (dashIdx > 0) {
    const source = title.slice(dashIdx + 3).trim();
    if (source) return source;
  }
  return "Media";
}

function parseTitle(title: string): string {
  const dashIdx = title.lastIndexOf(" - ");
  if (dashIdx > 0) return title.slice(0, dashIdx).trim();
  return title.trim();
}

function itemKey(item: Pick<RegionalNewsItem, "guid" | "sourceUrl">): string {
  return item.guid || item.sourceUrl;
}

export function normalizeFeedItems(
  rawItems: Array<{
    guid?: string;
    title?: string;
    content?: string;
    contentSnippet?: string;
    link?: string;
    isoDate?: string;
    pubDate?: string;
    creator?: string;
    enclosure?: { url?: string };
  }>,
): RegionalNewsItem[] {
  const seen = new Set<string>();
  const out: RegionalNewsItem[] = [];

  for (const raw of rawItems) {
    const link = raw.link?.trim();
    const rawTitle = raw.title?.trim();
    if (!link || !rawTitle) continue;

    const guid = raw.guid?.trim() || link;
    if (seen.has(guid)) continue;

    const publishedAt = raw.isoDate || raw.pubDate || new Date().toISOString();
    const item: RegionalNewsItem = {
      guid,
      title: parseTitle(rawTitle),
      excerpt: trimExcerpt(raw.contentSnippet || raw.content),
      sourceUrl: link,
      sourceName: parseSourceName(rawTitle, raw.creator),
      imageUrl: raw.enclosure?.url?.trim() || null,
      publishedAt: new Date(publishedAt).toISOString(),
    };

    seen.add(itemKey(item));
    out.push(item);
  }

  out.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  return out.slice(0, REGIONAL_NEWS_MAX_ITEMS);
}
