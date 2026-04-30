import { getMainSiteOrigin, joinUrl } from "@/lib/seo/url";

export type LandingSeo = {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
};

export function buildLandingSeo(pathname: string, title: string, description: string): LandingSeo {
  const origin = getMainSiteOrigin();
  return {
    title,
    description,
    canonical: joinUrl(origin, pathname),
    ogImage: joinUrl(origin, "/images/og-klandesa.png"),
  };
}
