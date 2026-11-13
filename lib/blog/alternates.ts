import type { Metadata } from "next";
import { getMainSiteOrigin, joinUrl } from "@/lib/seo/url";

/**
 * `alternates` untuk halaman blog: canonical + tautan RSS. Next mengganti `alternates` seluruhnya (bukan
 * menggabung) bila halaman anak mendefinisikannya, jadi setiap halaman blog memakai fungsi ini agar
 * `<link rel="alternate" type="application/rss+xml">` tidak hilang.
 */
export function blogAlternates(pathWithQuery: string): NonNullable<Metadata["alternates"]> {
  const origin = getMainSiteOrigin();
  return {
    canonical: joinUrl(origin, pathWithQuery),
    types: { "application/rss+xml": joinUrl(origin, "/blog/feed.xml") },
  };
}
