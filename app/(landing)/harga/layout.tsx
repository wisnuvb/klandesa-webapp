import type { Metadata } from "next";
import { LENGKAP_SETUP_FEE } from "@/lib/billing/lengkap";
import { getLandingPageMetadata } from "@/lib/seo/landing-pages";
import { HARGA_FAQS } from "@/lib/marketing/harga-faqs";
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

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HARGA_FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: origin },
      { "@type": "ListItem", position: 2, name: "Harga", item: `${origin}/harga` },
    ],
  };

  return (
    <>
      {[productJsonLd, faqJsonLd, breadcrumbJsonLd].map((ld) => (
        <script
          key={ld["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}
      {children}
    </>
  );
}
