import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getTenant } from "@/lib/tenant";
import { resolveEffectiveStructure } from "@/lib/website-engine/normalize";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  const host = (h.get("x-forwarded-host") || h.get("host") || "").split(":")[0];
  if (!host) return [];

  const tenant = await getTenant();
  if (!tenant?.template || !tenant?.subscription) return [];

  const base = `https://${host}`;
  const now = new Date();

  const resolved = resolveEffectiveStructure({
    templateStructure: tenant.template.structure,
    customization: tenant.subscription.customization,
  });

  const urls: MetadataRoute.Sitemap = [{ url: `${base}/`, lastModified: now }];

  for (const p of resolved.pages) {
    if (!p.slug) continue;
    urls.push({
      url: `${base}/${p.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  urls.push({
    url: `${base}/site/berita`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.6,
  });

  return urls;
}
