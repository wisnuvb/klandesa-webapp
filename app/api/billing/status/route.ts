import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { mapDesaTierToAddonTier, type DesaPackageTier } from "@/lib/billing/catalog";
import { getActiveArsipAddon, getEffectiveStorageLimitGb } from "@/lib/digitalArchive/quota";
import { arsipGbForPlanCode } from "@/lib/digitalArchive/storage-limit";
import { listModuleEntitlementsForVillage } from "@/lib/modules/entitlements";
import { loadActiveModuleSubs } from "@/lib/modules/require-module";
import { WEBSITE_CUSTOM_MODULE_CODE, isWebsiteCustomActive } from "@/lib/website-service/subscription";
import { hasPurchasedLengkap } from "@/lib/billing/service";
import {
  getSubscriptionPhaseInfo,
  isVillagePaidSubscriptionActive,
  isVillageSubscriptionReadable,
  isVillageSubscriptionWritable,
  resolveSubscriptionPhaseWithTransition,
  SUBSCRIPTION_EXPIRING_SOON_DAYS,
} from "@/lib/subscription";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    let { village } = loaded.ctx;

    await resolveSubscriptionPhaseWithTransition(village.id, village);
    const fresh = await prisma.village.findUnique({ where: { id: village.id } });
    if (fresh) village = fresh;

    const phaseInfo = getSubscriptionPhaseInfo(village);
    const subscriptionActive = phaseInfo.readable;
    const paidActive = isVillagePaidSubscriptionActive(village);

    const desaTier = String(village.subscriptionPlan ?? "").toLowerCase() as DesaPackageTier;
    const hasDesaTier =
      desaTier === "starter" || desaTier === "profesional" || desaTier === "enterprise" || desaTier === "lengkap";

    // Trial desa paket lama dihitung profesional; trial Paket Lengkap tidak (mencoba apa yang dijual).
    const addonBaseTier: DesaPackageTier =
      String(village.subscriptionStatus ?? "").toLowerCase() === "trial" && desaTier !== "lengkap"
        ? "profesional"
        : desaTier;

    const [invoices, activeAddons, websiteSub, purchasedLengkap, arsipAddon, arsipLimitGb, websiteService] = await Promise.all([
      prisma.billingInvoice.findMany({
        where: { villageId: village.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          invoiceNumber: true,
          productType: true,
          planCode: true,
          amount: true,
          status: true,
          paymentMethod: true,
          paymentUrl: true,
          qrContent: true,
          qrImageUrl: true,
          vaNumber: true,
          bankCode: true,
          createdAt: true,
          expiresAt: true,
          paidAt: true,
        },
      }),
      loadActiveModuleSubs(village.id),
      prisma.websiteSubscription.findUnique({
        where: { villageId: village.id },
        select: { isActive: true, expiryDate: true },
      }),
      hasPurchasedLengkap(village.id),
      getActiveArsipAddon(village.id),
      getEffectiveStorageLimitGb(village),
      prisma.villageModuleSubscription.findUnique({
        where: { villageId_moduleCode: { villageId: village.id, moduleCode: WEBSITE_CUSTOM_MODULE_CODE } },
        select: { status: true, startDate: true, expiryDate: true },
      }),
    ]);

    const websiteActive =
      websiteSub?.isActive === true &&
      websiteSub.expiryDate.getTime() > Date.now();

    const modules = listModuleEntitlementsForVillage({
      subscriptionPlan: village.subscriptionPlan,
      subscriptionStatus: village.subscriptionStatus,
      subscriptionReadable: isVillageSubscriptionReadable(village),
      activeAddons,
      websiteActive,
    });

    return NextResponse.json({
      village: {
        id: village.id,
        code: village.code,
        name: village.name,
        onboardingCompletedAt: village.onboardingCompletedAt?.toISOString() ?? null,
      },
      subscription: {
        active: subscriptionActive,
        writable: isVillageSubscriptionWritable(village),
        paid: paidActive,
        phase: phaseInfo.phase,
        daysRemaining: phaseInfo.daysRemaining,
        expiringSoon:
          phaseInfo.phase === "active" &&
          phaseInfo.daysRemaining != null &&
          phaseInfo.daysRemaining <= SUBSCRIPTION_EXPIRING_SOON_DAYS,
        plan: village.subscriptionPlan,
        status: village.subscriptionStatus,
        hasPurchasedLengkap: purchasedLengkap,
        startDate: village.subscriptionDate?.toISOString() ?? null,
        expiry: village.subscriptionExpiry?.toISOString() ?? null,
      },
      arsipAddon: arsipAddon
        ? {
            planCode: arsipAddon.planCode,
            storageGb: arsipGbForPlanCode(arsipAddon.planCode),
            expiry: arsipAddon.expiryDate.toISOString(),
          }
        : null,
      // Layanan Website Desa Kustom: null = belum pernah dipesan. Masa aktif dikendalikan di Klandesa.
      websiteService: websiteService
        ? {
            active: isWebsiteCustomActive(websiteService),
            startDate: websiteService.startDate.toISOString(),
            expiry: websiteService.expiryDate.toISOString(),
            daysRemaining: Math.max(
              0,
              Math.ceil((websiteService.expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
            ),
          }
        : null,
      absensiGpsAddon: {
        active: village.absensiGpsAddonActive,
        officeLat: village.absensiOfficeLat ?? null,
        officeLng: village.absensiOfficeLng ?? null,
        radiusMeters: village.absensiCheckInRadiusMeters,
        officeConfigured:
          village.absensiOfficeLat != null && village.absensiOfficeLng != null,
      },
      entitlements:
        hasDesaTier && subscriptionActive
          ? {
              desaTier,
              absensiTier: mapDesaTierToAddonTier(addonBaseTier),
              arsipTier: mapDesaTierToAddonTier(addonBaseTier),
              arsipStorageLimitGb: arsipLimitGb,
            }
          : null,
      modules: Object.fromEntries(
        Object.entries(modules).map(([id, m]) => [
          id,
          {
            entitled: m.entitled,
            source: m.source,
            minPackageTier: m.minPackageTier,
            addonMonthlyFee: m.addonMonthlyFee,
            locked: m.locked,
            addonExpiry: m.addonExpiry ?? null,
            addonDaysRemaining: m.addonDaysRemaining ?? null,
          },
        ]),
      ),
      invoices: invoices.map((inv) => ({
        id: String(inv.id),
        invoiceNumber: inv.invoiceNumber,
        productType: inv.productType,
        planCode: inv.planCode,
        amount: Number(inv.amount),
        status: inv.status,
        paymentMethod: inv.paymentMethod,
        paymentUrl: inv.paymentUrl,
        qrContent: inv.qrContent,
        qrImageUrl: inv.qrImageUrl,
        vaNumber: inv.vaNumber,
        bankCode: inv.bankCode,
        createdAt: inv.createdAt.toISOString(),
        expiresAt: inv.expiresAt?.toISOString() ?? null,
        paidAt: inv.paidAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
