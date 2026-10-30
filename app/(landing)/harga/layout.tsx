import type { Metadata } from "next";
import { LENGKAP_SETUP_FEE } from "@/lib/billing/lengkap";
import { getLandingPageMetadata } from "@/lib/seo/landing-pages";
import { getMainSiteOrigin } from "@/lib/seo/url";

export const metadata: Metadata = getLandingPageMetadata("harga");

export default function HargaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const origin = getMainSiteOrigin();
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Klandesa Paket Lengkap",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android",
    url: `${origin}/harga`,
    inLanguage: "id-ID",
    description:
      "Aplikasi desa terpadu: data warga, surat, keuangan, RPJMDes, SDGs, dan aplikasi seluler warga. Biaya awal sudah termasuk tahun pertama; mulai tahun ke-2 Rp100.000 per bulan. Trial gratis 14 hari.",
    offers: {
      "@type": "Offer",
      price: LENGKAP_SETUP_FEE,
      priceCurrency: "IDR",
      url: `${origin}/harga`,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      {children}
    </>
  );
}
