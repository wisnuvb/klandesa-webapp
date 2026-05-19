import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getMainSiteOrigin, hostToOrigin, joinUrl } from "@/lib/seo/url";

/**
 * Prefix yang tidak diindeks. Gunakan trailing slash untuk subpath app
 * (mis. `/mitra/` agar `/mitra-klandesa` tetap boleh di-crawl).
 */
const DISALLOW_PREFIXES = [
  "/api/",
  "/auth/",
  "/login",
  "/dashboard",
  "/wilayah",
  "/kiosk",
  "/admin/",
  "/mitra/",
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") === "https" ? "https" : "http";
  const base = hostToOrigin(host, proto) || getMainSiteOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: DISALLOW_PREFIXES,
    },
    sitemap: joinUrl(base, "/sitemap.xml"),
  };
}
