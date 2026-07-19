import { prisma } from "@/lib/prisma";
import { getRegionalNewsTtlHours } from "@/lib/regional-news/config";
import { buildRegionKey } from "@/lib/regional-news/region-key";
import type { RegionalNewsItem } from "@/lib/regional-news/types";

function parseItemsJson(value: unknown): RegionalNewsItem[] {
  if (!Array.isArray(value)) return [];
  const out: RegionalNewsItem[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.guid !== "string" || typeof r.title !== "string") continue;
    if (typeof r.sourceUrl !== "string" || typeof r.sourceName !== "string") continue;
    if (typeof r.publishedAt !== "string") continue;
    out.push({
      guid: r.guid,
      title: r.title,
      excerpt: typeof r.excerpt === "string" ? r.excerpt : null,
      sourceUrl: r.sourceUrl,
      sourceName: r.sourceName,
      imageUrl: typeof r.imageUrl === "string" ? r.imageUrl : null,
      publishedAt: r.publishedAt,
    });
  }
  return out;
}

export type RegionalNewsSnapshotRecord = {
  regionKey: string;
  province: string;
  regency: string;
  items: RegionalNewsItem[];
  fetchedAt: Date;
  expiresAt: Date;
  lastError: string | null;
};

export async function getRegionalNewsSnapshot(
  province: string,
  regency: string,
): Promise<RegionalNewsSnapshotRecord | null> {
  const regionKey = buildRegionKey(province, regency);
  const row = await prisma.regionalNewsFeedSnapshot.findUnique({
    where: { regionKey },
  });
  if (!row) return null;
  return {
    regionKey: row.regionKey,
    province: row.province,
    regency: row.regency,
    items: parseItemsJson(row.items),
    fetchedAt: row.fetchedAt,
    expiresAt: row.expiresAt,
    lastError: row.lastError,
  };
}

export async function upsertRegionalNewsSnapshot(params: {
  province: string;
  regency: string;
  items: RegionalNewsItem[];
  lastError?: string | null;
}): Promise<RegionalNewsSnapshotRecord> {
  const regionKey = buildRegionKey(params.province, params.regency);
  const ttlHours = getRegionalNewsTtlHours();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

  const row = await prisma.regionalNewsFeedSnapshot.upsert({
    where: { regionKey },
    create: {
      regionKey,
      province: params.province.trim(),
      regency: params.regency.trim(),
      items: params.items,
      fetchedAt: now,
      expiresAt,
      lastError: params.lastError ?? null,
    },
    update: {
      province: params.province.trim(),
      regency: params.regency.trim(),
      items: params.items,
      fetchedAt: now,
      expiresAt,
      lastError: params.lastError ?? null,
    },
  });

  return {
    regionKey: row.regionKey,
    province: row.province,
    regency: row.regency,
    items: parseItemsJson(row.items),
    fetchedAt: row.fetchedAt,
    expiresAt: row.expiresAt,
    lastError: row.lastError,
  };
}

export async function listActiveRegionPairs(): Promise<
  Array<{ province: string; regency: string }>
> {
  const rows = await prisma.village.findMany({
    where: { isActive: true },
    select: { province: true, regency: true },
    distinct: ["province", "regency"],
  });
  return rows.map((r) => ({
    province: r.province.trim(),
    regency: r.regency.trim(),
  }));
}
