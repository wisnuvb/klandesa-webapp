/** Pembangun RSS 2.0 untuk blog (murni, tanpa dependensi) — dipakai /blog/feed.xml. */

export type FeedItem = {
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: Date;
  tags?: string[];
};

export type FeedMeta = {
  /** Origin situs tanpa garis miring akhir, mis. "https://klandesa.com". */
  origin: string;
  title: string;
  description: string;
  /** Waktu build; default: tanggal terbit artikel terbaru. */
  lastBuildDate?: Date;
};

// Karakter kontrol yang tidak sah di XML 1.0 (selain tab, LF, CR) dibuang, kalau tidak seluruh feed ditolak pembaca.
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

export function escapeXml(input: string): string {
  return input
    .replace(INVALID_XML_CHARS, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Bungkus CDATA; urutan "]]>" di dalam teks dipecah agar tidak menutup CDATA lebih awal. */
export function cdata(input: string): string {
  return `<![CDATA[${input.replace(INVALID_XML_CHARS, "").replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

/** Tanggal format RFC 822 (UTC) seperti yang diminta RSS 2.0, mis. "Fri, 13 Nov 2026 02:30:00 GMT". */
export function rfc822(date: Date): string {
  return date.toUTCString();
}

const IMAGE_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Tipe MIME gambar dari ekstensi path URL; null bila tak dikenal (media:content dilewati). */
export function imageMimeFromUrl(url: string): string | null {
  try {
    const ext = new URL(url).pathname.split(".").pop()?.toLowerCase() ?? "";
    return IMAGE_MIME[ext] ?? null;
  } catch {
    return null;
  }
}

export function buildBlogFeed(meta: FeedMeta, items: FeedItem[]): string {
  const origin = meta.origin.replace(/\/+$/, "");
  const sorted = [...items].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  const last = meta.lastBuildDate ?? sorted[0]?.publishedAt ?? new Date(0);

  const body = sorted.map((it) => {
    const link = `${origin}/blog/${it.slug}`;
    const parts = [
      `<title>${escapeXml(it.title)}</title>`,
      `<link>${escapeXml(link)}</link>`,
      `<guid isPermaLink="true">${escapeXml(link)}</guid>`,
      `<pubDate>${rfc822(it.publishedAt)}</pubDate>`,
    ];
    if (it.excerpt?.trim()) parts.push(`<description>${cdata(it.excerpt.trim())}</description>`);
    for (const tag of it.tags ?? []) parts.push(`<category>${escapeXml(tag)}</category>`);
    const mime = it.coverImageUrl ? imageMimeFromUrl(it.coverImageUrl) : null;
    if (it.coverImageUrl && mime && /^https?:\/\//i.test(it.coverImageUrl)) {
      parts.push(`<media:content url="${escapeXml(it.coverImageUrl)}" medium="image" type="${mime}"/>`);
    }
    return `    <item>\n      ${parts.join("\n      ")}\n    </item>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">',
    "  <channel>",
    `    <title>${escapeXml(meta.title)}</title>`,
    `    <link>${escapeXml(`${origin}/blog`)}</link>`,
    `    <description>${escapeXml(meta.description)}</description>`,
    "    <language>id-ID</language>",
    `    <lastBuildDate>${rfc822(last)}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(`${origin}/blog/feed.xml`)}" rel="self" type="application/rss+xml"/>`,
    ...body,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
