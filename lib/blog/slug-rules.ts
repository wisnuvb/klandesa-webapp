/**
 * Slug yang tidak boleh dipakai artikel: bentrok dengan rute tetap di bawah /blog
 * (/blog/topik/[tag], /blog/feed.xml, /blog/rss, /blog/page/N). Murni agar bisa dites.
 */
export const FORBIDDEN_BLOG_SLUGS: ReadonlySet<string> = new Set(["topik", "feed", "rss", "page", "feed.xml", "tag", "tags", "kategori"]);

export function isForbiddenBlogSlug(slug: string): boolean {
  return FORBIDDEN_BLOG_SLUGS.has(slug.trim().toLowerCase());
}

export function forbiddenBlogSlugMessage(slug: string): string {
  return `Slug "${slug}" dicadangkan untuk halaman sistem blog. Pakai slug lain.`;
}
