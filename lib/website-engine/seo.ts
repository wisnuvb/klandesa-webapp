import type { Metadata } from "next";
import type { WebsiteSiteSeo } from "@/lib/website-engine/types";
import type { WebsiteCMSPage } from "@/lib/website-engine/types";

export type TenantSeoContext = {
  host: string;
  proto: string;
  villageName: string;
  villageAddress?: string;
  templateName?: string;
  siteSeo?: WebsiteSiteSeo;
  /** Favicon situs (satu URL global) */
  faviconUrl?: string;
};

export function absoluteUrl(proto: string, host: string, pathname: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${proto}://${host.split(":")[0]}${path}`;
}

export function buildSiteMetadata(ctx: TenantSeoContext): Metadata {
  const {
    proto,
    host,
    villageName,
    villageAddress,
    templateName,
    siteSeo,
    faviconUrl,
  } = ctx;
  const title =
    siteSeo?.defaultTitle?.trim() ||
    (templateName ? `${villageName} · ${templateName}` : villageName);
  const description =
    siteSeo?.defaultDescription?.trim() ||
    villageAddress ||
    `Website resmi ${villageName}.`;
  const url = absoluteUrl(proto, host, "/");

  const iconUrl = faviconUrl?.trim();
  const icons = iconUrl
    ? ({
        icon: [{ url: iconUrl }],
        shortcut: iconUrl,
        apple: iconUrl,
      } satisfies Metadata["icons"])
    : undefined;

  return {
    title,
    description: description.slice(0, 320),
    alternates: { canonical: url },
    ...(icons ? { icons } : {}),
    openGraph: {
      title,
      description: description.slice(0, 300),
      url,
      siteName: villageName,
      images: siteSeo?.ogImageUrl
        ? [{ url: siteSeo.ogImageUrl }]
        : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description.slice(0, 200),
    },
    robots: { index: true, follow: true },
  };
}

export function buildPageMetadata(
  ctx: TenantSeoContext,
  page: WebsiteCMSPage | undefined,
  path: string,
): Metadata {
  const base = buildSiteMetadata(ctx);
  if (!page) return base;

  const pageTitle = page.seo?.title?.trim() || page.title;
  const fullTitle = `${pageTitle} · ${ctx.villageName}`;
  const description =
    page.seo?.description?.trim() ||
    (typeof base.description === "string" ? base.description : undefined) ||
    ctx.villageAddress ||
    "";
  const url = absoluteUrl(ctx.proto, ctx.host, path);
  const ogImage =
    page.seo?.ogImageUrl?.trim() || ctx.siteSeo?.ogImageUrl?.trim();
  const baseOg =
    typeof base.openGraph === "object" && base.openGraph
      ? base.openGraph
      : {};

  return {
    ...base,
    title: fullTitle,
    description: description.slice(0, 320),
    alternates: { canonical: url },
    openGraph: {
      ...baseOg,
      title: fullTitle,
      description: description.slice(0, 300),
      url,
      images: ogImage
        ? [{ url: ogImage }]
        : (baseOg as { images?: Metadata["openGraph"] extends { images?: infer I } ? I : never })
            .images,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: description.slice(0, 200),
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}
