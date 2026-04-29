import type { MetadataRoute } from "next";
import { headers } from "next/headers";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const host = (h.get("x-forwarded-host") || h.get("host") || "").split(":")[0];
  const base = host ? `https://${host}` : "";

  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard"] },
    sitemap: base ? `${base}/sitemap.xml` : undefined,
  };
}
