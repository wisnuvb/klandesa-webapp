import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { mapDesaTierToAddonTier, type DesaPackageTier } from "@/lib/billing/catalog";
import { effectiveVillageStorageLimitGb } from "@/lib/digitalArchive/quota";
import { listModuleEntitlementsForVillage } from "@/lib/modules/entitlements";
import { loadActiveModuleSubs } from "@/lib/modules/require-module";
import {
  getSubscriptionPhaseInfo,
  isVillagePaidSubscriptionActive,
  isVillageSubscriptionReadable,
  isVillageSubscriptionWritable,
  resolveSubscriptionPhaseWithTransition,
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
      desaTier === "starter" || desaTier === "profesional" || desaTier === "enterprise";

    const [invoices, activeAddons, websiteSub] = await Promise.all([
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
        plan: village.subscriptionPlan,
        status: village.subscriptionStatus,
        startDate: village.subscriptionDate?.toISOString() ?? null,
        expiry: village.subscriptionExpiry?.toISOString() ?? null,
      },
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
              absensiTier: mapDesaTierToAddonTier(
                village.subscriptionStatus === "trial" ? "profesional" : desaTier,
              ),
              arsipTier: mapDesaTierToAddonTier(
                village.subscriptionStatus === "trial" ? "profesional" : desaTier,
              ),
              arsipStorageLimitGb: effectiveVillageStorageLimitGb(
                village.subscriptionPlan,
                village.storageLimit,
              ),
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
