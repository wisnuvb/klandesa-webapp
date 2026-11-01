/** Resource modul yang bisa di-guard permission. */
export const PERMISSION_RESOURCES = [
  "residents",
  "officials",
  "potentials",
  "anggaran",
  "finance",
  "mail",
  "statistics",
  "announcements",
  "forum",
  "citizen_reports",
  "social_benefits",
  "attendance",
  "archive",
  "ukm",
  "cooperative",
  "website",
  "settings",
  "billing",
  "bumdes",
  "pkk",
  "sdgs",
  "rpjmdes",
  "pertanian",
  "rtrw",
  "integrations",
  "gis",
  "lingkungan",
  "ai_assistant",
  "custom_data",
  "aset_desa",
  "produk_hukum",
  "register_surat",
  "lembaga_desa",
  "dtsen_usulan",
  "polls",
  "apbdes",
  "perencanaan",
  "blt",
] as const;

export type PermissionResource = (typeof PERMISSION_RESOURCES)[number];

export function isPermissionResource(
  value: string,
): value is PermissionResource {
  return (PERMISSION_RESOURCES as readonly string[]).includes(value);
}
