import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTenant } from "@/lib/tenant";
import { INVOKE_PATHNAME_HEADER } from "@/lib/middleware-headers";
import { parseTemplateStructureManifest } from "@/lib/website-engine/manifest";
import {
  resolveEffectiveLayout,
  resolveEffectiveSiteSeo,
  resolveEffectiveStructure,
  resolveEffectiveTheme,
  resolveTenantFaviconUrl,
} from "@/lib/website-engine/normalize";
import { getTemplatePack } from "@/lib/website-engine/template-packs/registry";
import { themeToCssVars } from "@/lib/website-engine/theme";
import { googleFontStylesheetHref } from "@/lib/website-engine/google-fonts";
import { buildSiteMetadata, type TenantSeoContext } from "@/lib/website-engine/seo";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  if (!tenant?.template || !tenant?.subscription) {
    return { title: "Website Desa" };
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") === "https" ? "https" : "http";
  const ctx: TenantSeoContext = {
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
  return buildSiteMetadata(ctx);
}

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getTenant();
  const title = tenant?.village?.name ?? "Website Desa";

  const templateKey = tenant?.template
    ? parseTemplateStructureManifest(tenant.template.structure).templateKey
    : "default";
  const PackShell = getTemplatePack(templateKey).Shell;

  const theme =
    tenant?.template && tenant?.subscription
      ? resolveEffectiveTheme({
          templateStructure: tenant.template.structure,
          customization: tenant.subscription.customization,
        })
      : getTemplatePack(templateKey).defaultThemeTokens;
  const layoutFlags =
    tenant?.template && tenant?.subscription
      ? resolveEffectiveLayout({
          templateStructure: tenant.template.structure,
          customization: tenant.subscription.customization,
        })
      : {};

  const cssVars = themeToCssVars(theme);
  const fontHref = googleFontStylesheetHref(theme);

  const headersList = await headers();
  const currentPath = headersList.get(INVOKE_PATHNAME_HEADER) || "/site";

  const resolved =
    tenant?.template && tenant?.subscription
      ? resolveEffectiveStructure({
          templateStructure: tenant.template.structure,
          customization: tenant.subscription.customization,
        })
      : null;
  const navItems = resolved?.nav ?? [];

  return (
    <div
      className={`min-h-screen text-gray-900 dark:text-gray-100`}
      style={{
        ...cssVars,
        backgroundColor: "var(--site-surface, #ffffff)",
        ...(theme.fontBody ? { fontFamily: "var(--site-font-body)" } : {}),
      }}
    >
      {fontHref ? (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link rel="stylesheet" href={fontHref} />
        </>
      ) : null}
      <PackShell
        villageName={title}
        hideSiteHeader={Boolean(layoutFlags.hideSiteHeader)}
        templateKey={templateKey}
        currentPath={currentPath}
        navItems={navItems}
      >
        {children}
      </PackShell>
    </div>
  );
}
