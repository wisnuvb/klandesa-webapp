import { prisma } from "@/lib/prisma";
import {
  normalizeLocationKey,
  regionalCountOnlySubscribedVillages,
} from "@/lib/regional-policy";
import { isVillageSubscriptionActive } from "@/lib/subscription";
import type { RegionalScope } from "@/lib/regional-session";

export type { RegionalScope } from "@/lib/regional-session";
export {
  getRegionalSession,
  isRegionalAccount,
  parseRegionalUserIdFromSessionUserId,
  regionalSessionUserId,
} from "@/lib/regional-session";

export type VillageInScope = {
  id: number;
  code: string;
  name: string;
  district: string;
  regency: string;
  province: string;
  isActive: boolean;
  subscriptionActive: boolean;
};

/**
 * Daftar desa dalam lingkup regional (teks regency/district cocok persis setelah normalisasi).
 */
export async function listVillagesInRegionalScope(
  scope: RegionalScope,
): Promise<VillageInScope[]> {
  const regency = normalizeLocationKey(scope.regency);
  const where: {
    regency: string;
    district?: string;
    isActive?: boolean;
  } = { regency };
  if (scope.level === "DISTRICT" && scope.district) {
    where.district = normalizeLocationKey(scope.district);
  }

  const villages = await prisma.village.findMany({
    where,
    select: {
      id: true,
      code: true,
      name: true,
      district: true,
      regency: true,
      province: true,
      isActive: true,
      subscriptionStatus: true,
      subscriptionExpiry: true,
    },
    orderBy: [{ district: "asc" }, { name: "asc" }],
  });

  return villages.map((v) => ({
    id: v.id,
    code: v.code,
    name: v.name,
    district: v.district,
    regency: v.regency,
    province: v.province,
    isActive: v.isActive,
    subscriptionActive: isVillageSubscriptionActive(v),
  }));
}

export function filterVillageIdsForAggregate(
  villages: VillageInScope[],
): number[] {
  const onlySub = regionalCountOnlySubscribedVillages();
  return villages
    .filter((v) => v.isActive)
    .filter((v) => !onlySub || v.subscriptionActive)
    .map((v) => v.id);
}
