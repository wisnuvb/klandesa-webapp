import { prisma } from "@/lib/prisma";
import { getRegionalNewsForRegion } from "@/lib/regional-news/service";
import type { RegionalNewsItem } from "@/lib/regional-news/types";
import { parseTemplateStructureManifest } from "@/lib/website-engine/manifest";
import { resolveEffectiveStructure } from "@/lib/website-engine/normalize";
import { renderSection } from "@/app/(website)/site/sections";
import type { TenantContext } from "@/lib/tenant";
import type { ResolvedEngineStructure } from "@/lib/website-engine/types";
import { findPageBySlug } from "@/lib/website-engine/resolved-structure";

const TENANT_PAGE_CACHE_MS = 60 * 1000;
const tenantPageCache = new Map<
  string,
  { timestamp: number; value: Awaited<ReturnType<typeof loadTenantPublicPageContext>> }
>();

export function invalidateTenantPublicPageCache(villageId: number): void {
  const prefix = `site-${villageId}-`;
  for (const key of [...tenantPageCache.keys()]) {
    if (key.startsWith(prefix)) tenantPageCache.delete(key);
  }
}

export async function loadTenantPublicPageContext(
  tenant: TenantContext,
  slugForPage: string,
): Promise<{
  resolved: ResolvedEngineStructure;
  templateKey: string;
  page: NonNullable<ReturnType<typeof findPageBySlug>>;
  announcements: Array<{ id: number; title: string; date: string }>;
  regionalNews: RegionalNewsItem[];
} | null> {
  if (!tenant.template || !tenant.subscription) return null;

  const cacheKey = `site-${tenant.village.id}-${slugForPage}`;
  const cached = tenantPageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < TENANT_PAGE_CACHE_MS) {
    return cached.value;
  }

  const resolved = resolveEffectiveStructure({
    templateStructure: tenant.template.structure,
    customization: tenant.subscription.customization,
  });
  const templateKey = parseTemplateStructureManifest(
    tenant.template.structure,
  ).templateKey;
  const page = findPageBySlug(resolved, slugForPage);
  if (!page) return null;

  const newsSection = page.sections.find((s) => s.kind === "news");
  const limit =
    newsSection && typeof newsSection.limit === "number"
      ? Math.min(30, Math.max(1, Math.floor(newsSection.limit)))
      : 6;

  const rows = await prisma.announcement.findMany({
    where: { villageId: tenant.village.id, isActive: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, title: true, createdAt: true },
  });

  const announcements = rows.map((a) => ({
    id: a.id,
    title: a.title,
    date: a.createdAt.toLocaleDateString("id-ID"),
  }));

  const regionalNewsSection = page.sections.find((s) => s.kind === "regional_news");
  let regionalNews: RegionalNewsItem[] = [];
  if (regionalNewsSection && regionalNewsSection.kind === "regional_news") {
    const regionalLimit =
      typeof regionalNewsSection.limit === "number"
        ? Math.min(12, Math.max(1, Math.floor(regionalNewsSection.limit)))
        : 6;
    const feed = await getRegionalNewsForRegion(
      tenant.village.province,
      tenant.village.regency,
      regionalLimit,
    );
    regionalNews = feed.items;
  }

  const value = { resolved, templateKey, page, announcements, regionalNews };
  tenantPageCache.set(cacheKey, { timestamp: Date.now(), value });
  return value;
}

type VillageLite = TenantContext["village"];

export function SitePageBody(props: {
  pageSections: ResolvedEngineStructure["pages"][0]["sections"];
  templateKey: string;
  village: VillageLite;
  announcements: Array<{ id: number; title: string; date: string }>;
  regionalNews?: RegionalNewsItem[];
  /** Untuk tautan dari blok berita */
  newsDetailBasePath?: string;
  /** Kelas layout opsional dari CMS */
  layoutPreset?: string;
}) {
  const { pageSections, layoutPreset } = props;
  const wrapClass =
    layoutPreset === "fullBleed"
      ? "w-full"
      : "container mx-auto px-4";

  return (
    <div className={wrapClass}>
      <main>
        {pageSections.map((section, idx) => (
          <div key={`${section.kind}-${idx}`}>
            {renderSection({
              templateKey: props.templateKey,
              section,
              village: {
                name: props.village.name,
                address: props.village.address,
                phone: props.village.phone,
                email: props.village.email,
                website: props.village.website,
              },
              news: props.announcements,
              regionalNews: props.regionalNews ?? [],
              newsDetailBasePath: props.newsDetailBasePath,
            })}
          </div>
        ))}
      </main>
    </div>
  );
}
