import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getTenant } from "@/lib/tenant";
import { resolveEffectiveStructure } from "@/lib/website-engine/normalize";
import { getMainSiteOrigin, hostToOrigin, joinUrl } from "@/lib/seo/url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") === "https" ? "https" : "http";
  const requestOrigin = hostToOrigin(host, proto);
  const mainOrigin = getMainSiteOrigin();

  const now = new Date();
  const urls: MetadataRoute.Sitemap = [
    { url: joinUrl(mainOrigin, "/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: joinUrl(mainOrigin, "/fitur"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: joinUrl(mainOrigin, "/harga"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: joinUrl(mainOrigin, "/karir"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: joinUrl(mainOrigin, "/mitra"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: joinUrl(mainOrigin, "/demo"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
  ];

  const tenant = await getTenant();
  if (!tenant?.template || !tenant?.subscription || !requestOrigin) return urls;

  const resolved = resolveEffectiveStructure({
    templateStructure: tenant.template.structure,
    customization: tenant.subscription.customization,
  });
  const base = requestOrigin;
  urls.push({
    url: joinUrl(base, "/site"),
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  });

  for (const p of resolved.pages) {
    if (!p.slug) continue;
    urls.push({
      url: joinUrl(base, `/${p.slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  urls.push({
    url: joinUrl(base, "/site/berita"),
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.6,
  });

  return urls;
}
