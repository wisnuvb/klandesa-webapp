import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTenant } from "@/lib/tenant";
import { resolveEffectiveSiteSeo, resolveTenantFaviconUrl } from "@/lib/website-engine/normalize";
import {
  loadTenantPublicPageContext,
  SitePageBody,
} from "@/lib/website-engine/site-renderer";
import { buildPageMetadata, type TenantSeoContext } from "@/lib/website-engine/seo";
import { sanitizePageSlug } from "@/lib/website-engine/resolved-structure";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug: raw } = await props.params;
  const tenant = await getTenant();
  if (!tenant?.template || !tenant?.subscription) return { title: "Website Desa" };
  const slug = sanitizePageSlug(raw);
  if (slug === "site") {
    return { title: tenant.village.name };
  }
  const ctx = await loadTenantPublicPageContext(tenant, slug);
  if (!ctx) return { title: tenant.village.name };

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") === "https" ? "https" : "http";
  const path = `/${slug}`;
  const seoCtx: TenantSeoContext = {
    host,
    proto,
    villageName: tenant.village.name,
    villageAddress: tenant.village.address,
    templateName: tenant.template?.name,
    siteSeo: resolveEffectiveSiteSeo(
      tenant.subscription.customization,
      tenant.template.structure,
    ),
    faviconUrl: resolveTenantFaviconUrl(tenant.subscription.customization),
  };
  return buildPageMetadata(seoCtx, ctx.page, path);
}

export default async function TenantCmsPage(props: Props) {
  const { slug: raw } = await props.params;
  const tenant = await getTenant();
  if (!tenant?.template || !tenant?.subscription) notFound();

  const slug = sanitizePageSlug(raw);
  if (slug === "site") redirect("/");

  const ctx = await loadTenantPublicPageContext(tenant, slug);
  if (!ctx) notFound();

  const { page, announcements, templateKey, regionalNews } = ctx;

  return (
    <SitePageBody
      pageSections={page.sections}
      templateKey={templateKey}
      village={tenant.village}
      announcements={announcements}
      regionalNews={regionalNews}
      newsDetailBasePath="/site/berita"
      layoutPreset={page.layoutPreset}
    />
  );
}
