import { cache } from "react";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isWebsiteSubscriptionLive } from "@/lib/website-engine/subscription-state";

export type TenantContext = {
  hostname: string;
  village: {
    id: number;
    code: string;
    name: string;
    address: string;
    district: string;
    regency: string;
    province: string;
    postalCode: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    logoUrl: string | null;
    settings: unknown | null;
  };
  subscription: {
    id: number;
    templateId: number;
    startDate: Date;
    expiryDate: Date;
    customization: unknown | null;
    customDomain: string | null;
    isActive: boolean;
  } | null;
  template: {
    id: number;
    name: string;
    description: string;
    category: string;
    previewImage: string;
    thumbnailUrl: string;
    demoUrl: string | null;
    structure: unknown;
    price: number;
    subscriptionType: string;
    isActive: boolean;
    isFeatured: boolean;
  } | null;
  /** true bila desa pernah berlangganan tetapi masa aktif website sudah habis */
  websiteExpired?: boolean;
};

function villageCodeLookupVariants(subdomain: string): string[] {
  const s = subdomain.trim();
  return [...new Set([s, s.toLowerCase(), s.toUpperCase()])];
}

async function resolveTenant(): Promise<TenantContext | null> {
  const headersList = await headers();
  const subdomain =
    headersList.get("x-tenant-subdomain")?.trim().toLowerCase() || null;
  const forcedHostname =
    headersList.get("x-tenant-hostname")?.trim().toLowerCase() || null;
  const hostHeader = headersList.get("host")?.trim().toLowerCase() || "";
  const hostname = forcedHostname || hostHeader.split(":")[0] || "";

  const bySubdomain = async () => {
    if (!subdomain) return null;
    const village = await prisma.village.findFirst({
      where: { code: { in: villageCodeLookupVariants(subdomain) } },
      select: {
        id: true,
        code: true,
        name: true,
        address: true,
        district: true,
        regency: true,
        province: true,
        postalCode: true,
        phone: true,
        email: true,
        website: true,
        logoUrl: true,
        settings: true,
      },
    });
    if (!village) return null;

    const subscription = await prisma.websiteSubscription.findUnique({
      where: { villageId: village.id },
      include: { template: true },
    });

    if (!subscription?.template) {
      return {
        hostname,
        village: {
          id: village.id,
          code: village.code,
          name: village.name,
          address: village.address,
          district: village.district,
          regency: village.regency,
          province: village.province,
          postalCode: village.postalCode ?? null,
          phone: village.phone ?? null,
          email: village.email ?? null,
          website: village.website,
          logoUrl: village.logoUrl,
          settings: village.settings ?? null,
        },
        subscription: null,
        template: null,
      } satisfies TenantContext;
    }

    return {
      hostname,
      village: {
        id: village.id,
        code: village.code,
        name: village.name,
        address: village.address,
        district: village.district,
        regency: village.regency,
        province: village.province,
        postalCode: village.postalCode ?? null,
        phone: village.phone ?? null,
        email: village.email ?? null,
        website: village.website,
        logoUrl: village.logoUrl,
        settings: village.settings ?? null,
      },
      subscription: {
        id: subscription.id,
        templateId: subscription.templateId,
        startDate: subscription.startDate,
        expiryDate: subscription.expiryDate,
        customization: subscription.customization ?? null,
        customDomain: subscription.customDomain ?? null,
        isActive: subscription.isActive,
      },
      template: {
        id: subscription.template.id,
        name: subscription.template.name,
        description: subscription.template.description,
        category: subscription.template.category,
        previewImage: subscription.template.previewImage,
        thumbnailUrl: subscription.template.thumbnailUrl,
        demoUrl: subscription.template.demoUrl ?? null,
        structure: subscription.template.structure,
        price: Number(subscription.template.price),
        subscriptionType: subscription.template.subscriptionType,
        isActive: subscription.template.isActive,
        isFeatured: subscription.template.isFeatured,
      },
    } satisfies TenantContext;
  };

  const byCustomDomain = async () => {
    if (!hostname) return null;
    const domain = await prisma.websiteDomain.findUnique({
      where: { hostname },
      include: {
        village: {
          select: {
            id: true,
            code: true,
            name: true,
            address: true,
            district: true,
            regency: true,
            province: true,
            postalCode: true,
            phone: true,
            email: true,
            website: true,
            logoUrl: true,
            settings: true,
          },
        },
      },
    });
    if (!domain || domain.status !== "active") return null;

    const subscription = await prisma.websiteSubscription.findUnique({
      where: { villageId: domain.villageId },
      include: { template: true },
    });

    if (!subscription?.template) {
      return {
        hostname,
        village: {
          id: domain.village.id,
          code: domain.village.code,
          name: domain.village.name,
          address: domain.village.address,
          district: domain.village.district,
          regency: domain.village.regency,
          province: domain.village.province,
          postalCode: domain.village.postalCode ?? null,
          phone: domain.village.phone ?? null,
          email: domain.village.email ?? null,
          website: domain.village.website,
          logoUrl: domain.village.logoUrl,
          settings: domain.village.settings ?? null,
        },
        subscription: null,
        template: null,
      } satisfies TenantContext;
    }

    return {
      hostname,
      village: {
        id: domain.village.id,
        code: domain.village.code,
        name: domain.village.name,
        address: domain.village.address,
        district: domain.village.district,
        regency: domain.village.regency,
        province: domain.village.province,
        postalCode: domain.village.postalCode ?? null,
        phone: domain.village.phone ?? null,
        email: domain.village.email ?? null,
        website: domain.village.website,
        logoUrl: domain.village.logoUrl,
        settings: domain.village.settings ?? null,
      },
      subscription: {
        id: subscription.id,
        templateId: subscription.templateId,
        startDate: subscription.startDate,
        expiryDate: subscription.expiryDate,
        customization: subscription.customization ?? null,
        customDomain: subscription.customDomain ?? null,
        isActive: subscription.isActive,
      },
      template: {
        id: subscription.template.id,
        name: subscription.template.name,
        description: subscription.template.description,
        category: subscription.template.category,
        previewImage: subscription.template.previewImage,
        thumbnailUrl: subscription.template.thumbnailUrl,
        demoUrl: subscription.template.demoUrl ?? null,
        structure: subscription.template.structure,
        price: Number(subscription.template.price),
        subscriptionType: subscription.template.subscriptionType,
        isActive: subscription.template.isActive,
        isFeatured: subscription.template.isFeatured,
      },
    } satisfies TenantContext;
  };

  if (subdomain) {
    const ctx = await bySubdomain();
    if (ctx) return ctx;
  }
  if (forcedHostname) {
    const ctx = await byCustomDomain();
    if (ctx) return ctx;
  }
  if (!subdomain && hostname) {
    const ctx = await byCustomDomain();
    if (ctx) return ctx;
  }

  return null;
}

/** Langganan kedaluwarsa diperlakukan seperti belum aktif agar seluruh rute publik berhenti menayangkan situs. */
function gateExpiredWebsite(ctx: TenantContext): TenantContext {
  if (!ctx.subscription) return ctx;
  if (isWebsiteSubscriptionLive(ctx.subscription)) return ctx;
  return { ...ctx, subscription: null, template: null, websiteExpired: true };
}

/** Dibungkus `cache` agar layout, metadata, dan halaman dalam satu request hanya memicu satu set query. */
export const getTenant = cache(async (): Promise<TenantContext | null> => {
  const ctx = await resolveTenant();
  return ctx ? gateExpiredWebsite(ctx) : null;
});
