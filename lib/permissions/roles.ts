/** Role akun desa — sumber kebenaran TypeScript (DB masih String). */
export const VILLAGE_ROLES = [
  "admin",
  "staff",
  "village_head",
  "secretary",
] as const;

export type VillageRole = (typeof VILLAGE_ROLES)[number];

export const PLATFORM_ROLES = ["platform_admin", "platform_support"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const REGIONAL_ROLES = [
  "regional_provinsi",
  "regional_kabupaten",
  "regional_kecamatan",
] as const;
export type RegionalRole = (typeof REGIONAL_ROLES)[number];

export function isVillageRole(value: string | null | undefined): value is VillageRole {
  if (!value) return false;
  return (VILLAGE_ROLES as readonly string[]).includes(value);
}

export function normalizeVillageRole(
  value: string | null | undefined,
): VillageRole {
  if (isVillageRole(value)) return value;
  return "staff";
}

export function isPlatformAdminRole(role: string | null | undefined): boolean {
  return role === "platform_admin";
}
