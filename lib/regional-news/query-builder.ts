import { stripRegencyPrefix } from "@/lib/regional-news/region-key";

export function buildGoogleNewsSearchQuery(province: string, regency: string): string {
  const provinceTrim = province.trim();
  const regencyTrim = regency.trim();
  const regencyShort = stripRegencyPrefix(regencyTrim);
  const parts = [
    `"${regencyTrim}"`,
    regencyShort && regencyShort !== regencyTrim ? `"${regencyShort}"` : null,
    regencyShort ? `"Kabupaten ${regencyShort}"` : null,
    provinceTrim ? `"${provinceTrim}"` : null,
  ].filter(Boolean);
  return parts.join(" OR ");
}

export function buildGoogleNewsRssUrl(province: string, regency: string): string {
  const q = buildGoogleNewsSearchQuery(province, regency);
  const params = new URLSearchParams({
    q,
    hl: "id",
    gl: "ID",
    ceid: "ID:id",
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}
