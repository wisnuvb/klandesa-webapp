import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { listStaticMarketingSitemapRoutes } from "@/lib/seo/landing-pages";
import { listTopicPagePaths } from "@/lib/marketing/topic-pages";
import { listIndexableLetterPaths } from "@/lib/letters/public-catalog";
import { listPublishedBlogTags } from "@/lib/blog/public-posts";
import { getTenant } from "@/lib/tenant";
import { resolveEffectiveStructure } from "@/lib/website-engine/normalize";
import { getMainSiteOrigin, hostToOrigin, joinUrl } from "@/lib/seo/url";

type Tenant = NonNullable<Awaited<ReturnType<typeof getTenant>>>;

function lastModifiedOf(date: Date | null | undefined): { lastModified?: Date } {
  return date ? { lastModified: date } : {};
}

function buildTenantSitemap(
  tenant: Tenant,
  requestOrigin: string | null,
): MetadataRoute.Sitemap {
  if (!tenant.template || !tenant.subscription || !requestOrigin) return [];

  const resolved = resolveEffectiveStructure({
    templateStructure: tenant.template.structure,
    customization: tenant.subscription.customization,
  });
  const urls: MetadataRoute.Sitemap = [
    // Beranda desa dikanonikalkan ke "/" (middleware me-rewrite "/" ke /site), bukan /site.
    { url: joinUrl(requestOrigin, "/"), changeFrequency: "daily", priority: 0.8 },
  ];
  for (const p of resolved.pages) {
    if (!p.slug) continue;
    urls.push({
      url: joinUrl(requestOrigin, `/${p.slug}`),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }
  urls.push({
    url: joinUrl(requestOrigin, "/site/berita"),
    changeFrequency: "daily",
    priority: 0.6,
  });
  return urls;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") === "https" ? "https" : "http";
  const requestOrigin = hostToOrigin(host, proto);
  const mainOrigin = getMainSiteOrigin();

  // Host desa (subdomain/domain kustom): sitemap hanya memuat URL host itu sendiri.
  // URL lintas host (klandesa.com) diabaikan Google dan memicu peringatan di Search Console.
  const tenant = await getTenant();
  if (tenant) {
    return buildTenantSitemap(tenant, requestOrigin);
  }

  // `lastModified` sengaja dihilangkan untuk halaman statis: tanggal "sekarang" setiap
  // permintaan membuat Google belajar mengabaikan lastmod di seluruh sitemap. Hanya
  // isi yang tanggalnya benar-benar diketahui (artikel blog) yang menyertakannya.
  // /blog baru masuk sitemap bila sudah ada artikel terbit (halaman kosong = konten tipis).
  const urls: MetadataRoute.Sitemap = listStaticMarketingSitemapRoutes()
    .filter((route) => route.pathname !== "/blog")
    .map(
    (route) => ({
      url: joinUrl(mainOrigin, route.pathname),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }),
  );

  // Halaman topik (/fitur dan /fitur/[slug]): konten statis, selalu terindeks.
  for (const pathname of listTopicPagePaths()) {
    urls.push({
      url: joinUrl(mainOrigin, pathname),
      changeFrequency: "monthly",
      priority: pathname === "/fitur" ? 0.85 : 0.8,
    });
  }

  // Contoh surat: hanya yang sudah ditinjau (REVIEWED_LETTER_KEYS) yang masuk sitemap.
  for (const pathname of listIndexableLetterPaths()) {
    urls.push({
      url: joinUrl(mainOrigin, pathname),
      changeFrequency: "monthly",
      priority: pathname === "/contoh-surat" ? 0.8 : 0.6,
    });
  }

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
        ...lastModifiedOf(posts[0].updatedAt ?? posts[0].publishedAt),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    // Halaman topik hanya diindeks bila ≥2 artikel (selaras dengan robots halaman topik).
    // Dalam try sendiri: gagal membaca topik tidak boleh menghilangkan URL artikel.
    try {
      for (const tag of (await listPublishedBlogTags()).filter((t) => t.count >= 2)) {
        urls.push({
          url: joinUrl(mainOrigin, `/blog/topik/${tag.slug}`),
          changeFrequency: "weekly",
          priority: 0.5,
        });
      }
    } catch {
      // topik dilewati; sitemap tetap valid
    }

    for (const post of posts) {
      urls.push({
        url: joinUrl(mainOrigin, `/blog/${post.slug}`),
        ...lastModifiedOf(post.updatedAt ?? post.publishedAt),
        changeFrequency: "weekly",
        priority: 0.65,
      });
    }
  } catch {
    // DB tidak tersedia saat build — sitemap statis tetap valid
  }

  return urls;
}
