/** Kunci stabil untuk gating CMS & renderer; dipetakan dari copy marketing seed. */
export const BASE_VILLAGE_WEBSITE_CAPS = [
  "section_hero",
  "section_news",
  "section_contact",
  "section_rich_text",
  "section_cta",
  "content_news",
  "content_profile",
] as const;

export type BaseVillageWebsiteCap = (typeof BASE_VILLAGE_WEBSITE_CAPS)[number];

/** Fitur marketing (string di seed) → capability keys */
export const WEBSITE_FEATURE_TO_CAPABILITIES: Record<string, readonly string[]> = {
  "Responsive Design": ["responsive"],
  "SEO Optimized": ["seo"],
  "Berita & Artikel": ["section_news", "content_news"],
  "Portal Berita": ["section_news", "content_news"],
  "Galeri Foto": ["section_gallery"],
  "Galeri Premium": ["section_gallery"],
  "Profil Desa": ["content_profile"],
  "Layanan Online": ["content_services"],
  "Kontak & Maps": ["section_contact", "map_contact"],
  "Kontak Form": ["section_contact"],
  "Struktur Organisasi": ["content_org_chart"],
  "Data Kependudukan": ["content_population"],
  "Potensi Desa": ["content_potential"],
  "Booking System": ["booking"],
  "Virtual Tour 360°": ["virtual_tour"],
  "Product Catalog": ["product_catalog"],
  "E-Commerce Ready": ["commerce"],
  "Blog & Tips": ["content_news", "blog"],
  "Weather Widget": ["widget_weather"],
  "Harvest Calendar": ["widget_calendar"],
  "Advanced Dashboard": ["app_dashboard"],
  "Multi User Role": ["app_multi_user"],
  "E-Document": ["app_edocument"],
  "Live Chat Support": ["app_chat"],
  "Analytics Dashboard": ["app_analytics"],
  "Custom Domain": ["custom_domain"],
  "Trip Advisor Integration": ["integration_tripadvisor"],
  "Payment Gateway": ["payments"],
  "IoT Integration": ["iot"],
  "Real-time Monitoring": ["monitoring"],
  "Smart Dashboard": ["app_dashboard"],
  "Automation Features": ["automation"],
  "Advanced Security": ["security_hardened"],
};

export function capabilitiesFromFeatureLabels(labels: string[]): string[] {
  const set = new Set<string>();
  for (const label of labels) {
    const caps = WEBSITE_FEATURE_TO_CAPABILITIES[label];
    if (caps) for (const c of caps) set.add(c);
  }
  return [...set];
}

/** Gabungkan capability dasar template desa + turunan dari daftar fitur marketing. */
export function mergeTemplateCapabilities(featureLabels: string[]): string[] {
  const fromFeatures = capabilitiesFromFeatureLabels(featureLabels);
  const set = new Set<string>([...BASE_VILLAGE_WEBSITE_CAPS, ...fromFeatures]);
  return [...set];
}
