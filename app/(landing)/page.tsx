import type { Metadata } from "next";
import { LandingHome } from "@/components/features/LandingHome";
import { getCatalogV2 } from "@/lib/letters/catalog";
import { getFlagshipMarketingModules, getMarketingModuleCountLabel } from "@/lib/marketing/modules";
import { getMainSiteOrigin } from "@/lib/seo/url";
import { getLandingPageMetadata } from "@/lib/seo/landing-pages";

export const metadata: Metadata = getLandingPageMetadata("home");

export default function HomePage() {
  const flagshipModules = getFlagshipMarketingModules(8);
  const siteOrigin = getMainSiteOrigin();
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Klandesa",
    url: siteOrigin,
    logo: `${siteOrigin}/brand/klandesa-logo.png`,
    sameAs: [
      "https://www.facebook.com/klandesacom",
      "https://www.linkedin.com/company/klandesa",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+62-823-2033-7777",
      contactType: "customer service",
      areaServed: "ID",
      availableLanguage: "id",
    },
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Klandesa",
    url: siteOrigin,
    inLanguage: "id-ID",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />

      <LandingHome
        flagshipModules={flagshipModules}
        moduleCountLabel={getMarketingModuleCountLabel()}
        letterTypeCount={getCatalogV2().length}
      />
    </>
  );
}
