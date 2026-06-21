import { prisma } from "@/lib/prisma";
import {
  normalizeLocationKey,
  regionalCountOnlySubscribedVillages,
} from "@/lib/regional-policy";
import { isVillageSubscriptionActive } from "@/lib/subscription";
import type { RegionalScope } from "@/lib/regional-session";
import { parseWilayahSettings } from "@/lib/village/wilayah-settings";

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

function villageMatchesScope(
  v: {
    province: string;
    regency: string;
    district: string;
    settings: unknown;
  },
  scope: RegionalScope,
): boolean {
  const kodeProv = scope.kodeProvinsi?.trim();
  const kodeKab = scope.kodeKabKota?.trim();
  if (kodeProv || kodeKab) {
    const codes = parseWilayahSettings(v.settings);
    if (kodeProv && codes.kode_provinsi !== kodeProv) return false;
    if (kodeKab && codes.kode_kab_kota !== kodeKab) return false;
    if (scope.level === "PROVINCE") return true;
    if (scope.level === "REGENCY") {
      return normalizeLocationKey(v.regency) === normalizeLocationKey(scope.regency);
    }
    if (scope.level === "DISTRICT" && scope.district) {
      return (
        normalizeLocationKey(v.regency) === normalizeLocationKey(scope.regency) &&
        normalizeLocationKey(v.district) === normalizeLocationKey(scope.district)
      );
    }
    return true;
  }

  if (scope.level === "PROVINCE" && scope.province) {
    return normalizeLocationKey(v.province) === normalizeLocationKey(scope.province);
  }
  if (scope.level === "REGENCY") {
    return normalizeLocationKey(v.regency) === normalizeLocationKey(scope.regency);
  }
  if (scope.level === "DISTRICT" && scope.district) {
    return (
      normalizeLocationKey(v.regency) === normalizeLocationKey(scope.regency) &&
      normalizeLocationKey(v.district) === normalizeLocationKey(scope.district)
    );
  }
  return false;
}

/**
 * Daftar desa dalam lingkup regional (teks wilayah + opsional kode BPS).
 */
export async function listVillagesInRegionalScope(
  scope: RegionalScope,
): Promise<VillageInScope[]> {
  const where: { isActive?: boolean } = {};

  const villages = await prisma.village.findMany({
    where,
    select: {
      id: true,
      code: true,
      name: true,
      district: true,
      regency: true,
      province: true,
      settings: true,
      isActive: true,
      subscriptionStatus: true,
      subscriptionExpiry: true,
    },
    orderBy: [{ district: "asc" }, { name: "asc" }],
  });

  return villages
    .filter((v) => villageMatchesScope(v, scope))
    .map((v) => ({
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
