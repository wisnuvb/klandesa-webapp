import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getMainSiteOrigin, hostToOrigin, joinUrl } from "@/lib/seo/url";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") === "https" ? "https" : "http";
  const base = hostToOrigin(host, proto) || getMainSiteOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/fitur", "/harga", "/karir", "/demo", "/site", "/site/berita"],
      disallow: ["/api/", "/auth/", "/dashboard", "/wilayah", "/kiosk"],
    },
    sitemap: joinUrl(base, "/sitemap.xml"),
  };
}
