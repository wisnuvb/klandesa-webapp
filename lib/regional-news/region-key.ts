function slugifyRegion(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildRegionKey(province: string, regency: string): string {
  const key = slugifyRegion(`${province}-${regency}`);
  return key.slice(0, 120) || "unknown-region";
}

export function stripRegencyPrefix(regency: string): string {
  return regency
    .replace(/^kabupaten\s+/i, "")
    .replace(/^kota\s+/i, "")
    .trim();
}
