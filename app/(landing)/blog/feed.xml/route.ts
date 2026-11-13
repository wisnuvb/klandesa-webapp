import { NextResponse } from "next/server";
import { buildBlogFeed } from "@/lib/blog/feed";
import { listPublishedBlogPostsForFeed } from "@/lib/blog/public-posts";
import { getMainSiteOrigin } from "@/lib/seo/url";

/** Feed membaca database: jangan diprerender saat build (deploy lokal tanpa DATABASE_URL prod). */
export const dynamic = "force-dynamic";

/** RSS 2.0 untuk 20 artikel terbit terbaru. */
export async function GET() {
  let posts;
  try {
    posts = await listPublishedBlogPostsForFeed(20);
  } catch {
    // Galat sesaat jangan tersimpan sebagai feed kosong di CDN/pembaca: 503 + Retry-After.
    return new NextResponse("Feed sementara tidak tersedia.", {
      status: 503,
      headers: { "Retry-After": "300", "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const xml = buildBlogFeed(
    {
      origin: getMainSiteOrigin(),
      title: "Blog Klandesa",
      description: "Artikel seputar digitalisasi desa, layanan publik, administrasi pemerintahan desa, dan produk Klandesa.",
    },
    posts.map((p) => ({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      coverImageUrl: p.coverImageUrl,
      publishedAt: p.publishedAt ?? p.createdAt,
      tags: p.tags,
    })),
  );

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
