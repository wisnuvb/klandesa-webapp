import { NextResponse } from "next/server";
import type { Village } from "@prisma/client";
import { isGpsAddonActive } from "@/lib/attendance/addons";
import { prisma } from "@/lib/prisma";
import {
  getModuleEntitlement,
  resolveModuleAccess,
  type ActiveModuleSub,
} from "@/lib/modules/entitlements";
import {
  isVillageSubscriptionReadable,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

export function moduleNotEntitledResponse(
  moduleId: string,
  access: ReturnType<typeof resolveModuleAccess>,
) {
  const ent = getModuleEntitlement(moduleId);
  return NextResponse.json(
    {
      error: `Modul tidak termasuk paket Anda. Aktifkan paket ${ent?.minPackageTier ?? "yang sesuai"} atau langganan bulanan.`,
      code: "MODULE_NOT_ENTITLED",
      module: moduleId,
      requiredTier: ent?.minPackageTier ?? null,
      addonMonthlyFee: access.addonMonthlyFee,
      billingUrl: `/billing?module=${encodeURIComponent(moduleId)}`,
    },
    { status: 403 },
  );
}

export async function resolveExpiredModuleSubscriptions(
  villageId: number,
): Promise<void> {
  const now = new Date();
  await prisma.villageModuleSubscription.updateMany({
    where: {
      villageId,
      status: "active",
      expiryDate: { lte: now },
    },
    data: { status: "expired" },
  });
}

/**
 * Add-on aktif desa. Dipanggil di jalur panas (setiap request modul berlangganan), jadi cukup SATU baca:
 * penandaan "expired" di DB (tulis) hanya dijalankan bila memang ada baris yang lewat masa berlaku.
 * Hasil yang dikembalikan sama seperti sebelumnya: hanya yang `active` dan belum kedaluwarsa.
 */
export async function loadActiveModuleSubs(
  villageId: number,
): Promise<ActiveModuleSub[]> {
  const now = new Date();
  const rows = await prisma.villageModuleSubscription.findMany({
    where: { villageId, status: "active" },
    select: { moduleCode: true, planCode: true, expiryDate: true },
  });
  if (rows.some((r) => r.expiryDate.getTime() <= now.getTime())) {
    await resolveExpiredModuleSubscriptions(villageId);
  }
  return rows
    .filter((r) => r.expiryDate.getTime() > now.getTime())
    .map((r) => ({
      moduleCode: r.moduleCode,
      planCode: r.planCode,
      expiryDate: r.expiryDate,
    }));
}

export async function requireModuleEntitlement(
  village: Village,
  moduleId: string,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (!isVillageSubscriptionReadable(village)) {
    return { ok: false, response: subscriptionBlockedResponse(village) };
  }

  const [activeAddons, websiteSub] = await Promise.all([
    loadActiveModuleSubs(village.id),
    prisma.websiteSubscription.findUnique({
      where: { villageId: village.id },
      select: { isActive: true, expiryDate: true },
    }),
  ]);

  const websiteActive =
    websiteSub?.isActive === true &&
    websiteSub.expiryDate.getTime() > Date.now();

  const access = resolveModuleAccess(moduleId, {
    subscriptionPlan: village.subscriptionPlan,
    subscriptionStatus: village.subscriptionStatus,
    subscriptionReadable: true,
    activeAddons,
    websiteActive,
    absensiGpsActive: isGpsAddonActive(village),
  });

  if (!access.entitled) {
    return { ok: false, response: moduleNotEntitledResponse(moduleId, access) };
  }

  return { ok: true };
}
