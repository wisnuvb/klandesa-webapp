import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { listStaticMarketingSitemapRoutes } from "@/lib/seo/landing-pages";
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
  // /blog baru masuk sitemap bila sudah ada artikel terbit (halaman kosong = konten tipis).
  const urls: MetadataRoute.Sitemap = listStaticMarketingSitemapRoutes()
    .filter((route) => route.pathname !== "/blog")
    .map(
    (route) => ({
      url: joinUrl(mainOrigin, route.pathname),
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }),
  );

  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: "published" },
      select: {
        slug: true,
        updatedAt: true,
        publishedAt: true,
      },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    });

    if (posts.length > 0) {
      urls.push({
        url: joinUrl(mainOrigin, "/blog"),
        lastModified: posts[0].updatedAt ?? posts[0].publishedAt ?? now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    for (const post of posts) {
      urls.push({
        url: joinUrl(mainOrigin, `/blog/${post.slug}`),
        lastModified: post.updatedAt ?? post.publishedAt ?? now,
        changeFrequency: "weekly",
        priority: 0.65,
      });
    }
  } catch {
    // DB tidak tersedia saat build — sitemap statis tetap valid
  }

  const tenant = await getTenant();
  if (!tenant?.template || !tenant?.subscription || !requestOrigin) {
    return urls;
  }

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
