import type { WebsiteThemeTokens } from "@/lib/website-engine/types";

const WEIGHT_AXIS = "400;500;600;700";

export type WebsiteGoogleFontOption = {
  label: string;
  /** Nilai token tema `fontBody` / `fontHeading` */
  value: string;
  /** Nama keluarga untuk Google Fonts API (huruf pertama besar) */
  googleFamily: string;
};

/** Pilihan cepat untuk CMS; nilai kosong = biarkan default template/pack. */
export const WEBSITE_GOOGLE_FONT_BODY_OPTIONS: WebsiteGoogleFontOption[] = [
  { label: "Default template", value: "", googleFamily: "" },
  { label: "Inter", value: `"Inter", ui-sans-serif, system-ui, sans-serif`, googleFamily: "Inter" },
  { label: "Roboto", value: `"Roboto", ui-sans-serif, system-ui, sans-serif`, googleFamily: "Roboto" },
  { label: "Open Sans", value: `"Open Sans", ui-sans-serif, system-ui, sans-serif`, googleFamily: "Open Sans" },
  { label: "Lato", value: `"Lato", ui-sans-serif, system-ui, sans-serif`, googleFamily: "Lato" },
  { label: "Montserrat", value: `"Montserrat", ui-sans-serif, system-ui, sans-serif`, googleFamily: "Montserrat" },
  { label: "Poppins", value: `"Poppins", ui-sans-serif, system-ui, sans-serif`, googleFamily: "Poppins" },
  { label: "DM Sans", value: `"DM Sans", ui-sans-serif, system-ui, sans-serif`, googleFamily: "DM Sans" },
  { label: "Nunito", value: `"Nunito", ui-sans-serif, system-ui, sans-serif`, googleFamily: "Nunito" },
  { label: "Source Sans 3", value: `"Source Sans 3", ui-sans-serif, system-ui, sans-serif`, googleFamily: "Source Sans 3" },
];

export const WEBSITE_GOOGLE_FONT_HEADING_OPTIONS: WebsiteGoogleFontOption[] = [
  { label: "Samakan dengan isi", value: "", googleFamily: "" },
  { label: "Inter", value: `"Inter", ui-sans-serif, system-ui, sans-serif`, googleFamily: "Inter" },
  { label: "Montserrat", value: `"Montserrat", ui-sans-serif, system-ui, sans-serif`, googleFamily: "Montserrat" },
  { label: "Poppins", value: `"Poppins", ui-sans-serif, system-ui, sans-serif`, googleFamily: "Poppins" },
  { label: "Playfair Display", value: `"Playfair Display", Georgia, serif`, googleFamily: "Playfair Display" },
  { label: "Merriweather", value: `"Merriweather", Georgia, serif`, googleFamily: "Merriweather" },
  { label: "Lora", value: `"Lora", Georgia, serif`, googleFamily: "Lora" },
];

const GOOGLE_API_NAMES = new Set<string>(
  [...WEBSITE_GOOGLE_FONT_BODY_OPTIONS, ...WEBSITE_GOOGLE_FONT_HEADING_OPTIONS].flatMap((o) =>
    o.googleFamily ? [o.googleFamily] : [],
  ),
);

export function extractLeadingFontNames(stack: string | undefined): string[] {
  if (!stack?.trim()) return [];
  return stack
    .split(",")
    .map((p) => p.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

/** Satu URL stylesheet Google Fonts untuk semua keluarga yang dikenali di token tema. */
export function googleFontStylesheetHref(theme: WebsiteThemeTokens): string | null {
  const wanted = new Set<string>();
  for (const token of [theme.fontBody, theme.fontHeading]) {
    for (const name of extractLeadingFontNames(token)) {
      if (GOOGLE_API_NAMES.has(name)) {
        wanted.add(name.replace(/\s+/g, "+"));
      }
    }
  }
  if (wanted.size === 0) return null;
  const q = [...wanted].map((f) => `family=${f}:wght@${WEIGHT_AXIS}`).join("&");
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}
