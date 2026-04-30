import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";

type WebsiteTemplateDto = {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  features: string[];
  preview_images: string[];
  badge?: "Popular" | "Recommended" | "Best Seller";
  demo_url?: string;
  is_premium?: boolean;
};

type ActiveWebsiteDto = {
  id: number;
  template_id: number;
  template_name: string;
  domain: string;
  custom_domain?: string;
  is_active: boolean;
  activated_at: string;
  expires_at: string;
  total_visitors: number;
  visitors_today: number;
  visitors_month: number;
  total_posts: number;
  preview_image: string;
  subscription_status: "active" | "expiring_soon" | "expired";
};

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function computeSubscriptionStatus(expiryDate: Date): "active" | "expiring_soon" | "expired" {
  const now = new Date();
  if (expiryDate.getTime() <= now.getTime()) return "expired";
  const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 30 ? "expiring_soon" : "active";
}

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    await prisma.$queryRaw`SELECT 1`;

    const [templates, subscription, announcementCount] = await Promise.all([
      prisma.websiteTemplate.findMany({
        where: { isActive: true },
        orderBy: [{ isFeatured: "desc" }, { usageCount: "desc" }, { createdAt: "desc" }],
      }),
      prisma.websiteSubscription.findUnique({
        where: { villageId: village.id },
        include: { template: true },
      }),
      prisma.announcement.count({ where: { villageId: village.id, isActive: true } }),
    ]);

    const templateDtos: WebsiteTemplateDto[] = templates.map((t) => {
      const structure = (t.structure ?? {}) as unknown as Record<string, unknown>;
      const features = Array.isArray(structure.features)
        ? (structure.features as string[]).filter((x) => typeof x === "string")
        : [];
      const badge =
        structure.badge === "Popular" ||
        structure.badge === "Recommended" ||
        structure.badge === "Best Seller"
          ? (structure.badge as WebsiteTemplateDto["badge"])
          : undefined;

      return {
        id: t.id,
        name: t.name,
        slug: typeof structure.slug === "string" ? structure.slug : slugify(t.name),
        description: t.description,
        price: Number(t.price),
        features,
        preview_images: [t.previewImage, t.thumbnailUrl].filter(Boolean),
        badge: badge ?? (t.isFeatured ? "Popular" : undefined),
        demo_url: t.demoUrl ?? undefined,
        is_premium: Boolean(structure.isPremium),
      };
    });

    let activeWebsite: ActiveWebsiteDto | null = null;
    if (subscription?.template) {
      const isActive = subscription.isActive && subscription.expiryDate.getTime() > Date.now();
      const status = computeSubscriptionStatus(subscription.expiryDate);
      const domain =
        (village.website && village.website.trim().length > 0 ? village.website : null) ??
        `${village.code.toLowerCase()}.klandesa.id`;

      activeWebsite = {
        id: subscription.id,
        template_id: subscription.templateId,
        template_name: subscription.template.name,
        domain,
        custom_domain: subscription.customDomain ?? undefined,
        is_active: isActive,
        activated_at: subscription.startDate.toISOString(),
        expires_at: subscription.expiryDate.toISOString(),
        total_visitors: 0,
        visitors_today: 0,
        visitors_month: 0,
        total_posts: announcementCount,
        preview_image: subscription.template.previewImage,
        subscription_status: status,
      };

      if (!isActive) activeWebsite = null;
    }

    return NextResponse.json({
      db: { ok: true },
      village: { id: village.id, code: village.code, name: village.name },
      templates: templateDtos,
      activeWebsite,
    });
  } catch (err) {
    console.error("GET /api/website/overview error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
