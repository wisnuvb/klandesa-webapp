import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTenant } from "@/lib/tenant";
import { trackPublicPageView } from "@/lib/website-engine/track";
import { resolveEffectiveSiteSeo, resolveTenantFaviconUrl } from "@/lib/website-engine/normalize";
import {
  loadTenantPublicPageContext,
  SitePageBody,
} from "@/lib/website-engine/site-renderer";
import { buildPageMetadata, type TenantSeoContext } from "@/lib/website-engine/seo";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  if (!tenant?.template || !tenant?.subscription) {
    return { title: "Website Desa" };
  }
  const ctx = await loadTenantPublicPageContext(tenant, "");
  if (!ctx) return { title: tenant.village.name };
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") === "https" ? "https" : "http";
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
  const path = "/";
  return buildPageMetadata(seoCtx, ctx.page, path);
}

export default async function TenantWebsiteHome() {
  const tenant = await getTenant();
  if (!tenant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-black">
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold mb-3 text-black dark:text-white">Website tidak ditemukan</h1>
          <p className="text-black dark:text-white">
            Pastikan domain/subdomain sudah terhubung ke Klandesa.
          </p>
        </main>
      </div>
    );
  }

  const ctx = await loadTenantPublicPageContext(tenant, "");
  if (!ctx) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-2">
          {tenant.websiteExpired
            ? "Website sedang tidak aktif"
            : "Website desa belum diaktifkan"}
        </h1>
        <p>
          {tenant.websiteExpired
            ? `Masa aktif website ${tenant.village.name} telah berakhir. Silakan hubungi admin desa.`
            : "Silakan kembali beberapa saat lagi."}
        </p>
      </div>
    );
  }

  await trackPublicPageView(tenant.village.id);

  const { page, announcements, templateKey } = ctx;
  return (
    <SitePageBody
      pageSections={page.sections}
      templateKey={templateKey}
      village={tenant.village}
      announcements={announcements}
      regionalNews={ctx.regionalNews}
      newsDetailBasePath="/site/berita"
      layoutPreset={page.layoutPreset}
    />
  );
}
