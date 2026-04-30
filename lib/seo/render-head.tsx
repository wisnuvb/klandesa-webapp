import React from "react";
import type { LandingPageSeoKey } from "@/lib/seo/landing-pages";
import { getLandingPageSeo } from "@/lib/seo/landing-pages";

export function renderLandingHead(key: LandingPageSeoKey) {
  const seo = getLandingPageSeo(key);

  return (
    <>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta name="keywords" content={seo.keywords.join(", ")} />
      <link rel="canonical" href={seo.canonical} />
      <meta name="robots" content={seo.robots} />

      <meta property="og:type" content="website" />
      <meta property="og:locale" content="id_ID" />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:url" content={seo.canonical} />
      <meta property="og:image" content={seo.ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={seo.ogImage} />
    </>
  );
}
