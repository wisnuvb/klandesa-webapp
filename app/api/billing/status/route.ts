import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { mapDesaTierToAddonTier, type DesaPackageTier } from "@/lib/billing/catalog";
import { effectiveVillageStorageLimitGb } from "@/lib/digitalArchive/quota";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const now = Date.now();
    const subscriptionActive =
      String(village.subscriptionStatus ?? "").toLowerCase() === "active" &&
      (village.subscriptionExpiry ? village.subscriptionExpiry.getTime() > now : true);

    const desaTier = String(village.subscriptionPlan ?? "").toLowerCase() as DesaPackageTier;
    const hasDesaTier =
      desaTier === "starter" || desaTier === "profesional" || desaTier === "enterprise";

    const invoices = await prisma.billingInvoice.findMany({
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
    });

    return NextResponse.json({
      village: {
        id: village.id,
        code: village.code,
        name: village.name,
      },
      subscription: {
        active: subscriptionActive,
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
      entitlements: hasDesaTier && subscriptionActive ? {
        desaTier,
        absensiTier: mapDesaTierToAddonTier(desaTier),
        arsipTier: mapDesaTierToAddonTier(desaTier),
        arsipStorageLimitGb: effectiveVillageStorageLimitGb(
          village.subscriptionPlan,
          village.storageLimit,
        ),
      } : null,
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

