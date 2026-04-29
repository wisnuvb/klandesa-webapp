import type { TemplatePack } from "@/lib/website-engine/template-packs/types";
import {
  ContactBlock,
  CTABlock,
  HeroCenterBlock,
  NewsBlock,
  RichTextBlock,
  renderHeroFromSection,
} from "@/lib/website-engine/section-primitives";
import { TenantNavBar } from "@/lib/website-engine/template-packs/shell-nav";

function DefaultShell(props: import("@/lib/website-engine/template-packs/types").TenantShellProps) {
  const { children, villageName, hideSiteHeader, templateKey, navItems, currentPath } = props;
  return (
    <div className={`site-root tp-${templateKey}`}>
      {hideSiteHeader ? null : (
        <header className="border-b [border-color:var(--site-border,#e5e7eb)]">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-xl font-bold [color:var(--site-primary,#111827)]">
              {villageName}
            </div>
            <TenantNavBar items={navItems} currentPath={currentPath} />
          </nav>
        </header>
      )}
      {children}
    </div>
  );
}

function renderDefaultSection(
  ctx: import("@/lib/website-engine/template-packs/types").SectionRenderContext,
) {
  const s = ctx.section;
  if (s.kind === "hero") {
    const variant = s.variant === "split" ? "split" : "center";
    if (variant === "split") {
      return renderHeroFromSection(
        { ...s, variant: "split" },
        ctx.village.name,
      );
    }
    return (
      <HeroCenterBlock
        villageName={ctx.village.name}
        title={s.title}
        subtitle={
          s.subtitle?.trim()
            ? s.subtitle
            : "Website resmi desa yang ditenagai oleh Klandesa"
        }
      />
    );
  }
  if (s.kind === "news") {
    const title = s.title ?? "Berita Terbaru";
    return (
      <NewsBlock
        title={title}
        items={ctx.news}
        newsDetailBasePath={ctx.newsDetailBasePath}
      />
    );
  }
  if (s.kind === "rich_text") {
    return <RichTextBlock title={s.title} body={s.body} />;
  }
  if (s.kind === "cta") {
    return (
      <CTABlock
        title={s.title}
        subtitle={s.subtitle}
        buttonLabel={s.button_label}
        buttonHref={s.button_href}
      />
    );
  }
  return (
    <ContactBlock
      title={s.title ?? "Kontak Desa"}
      address={ctx.village.address}
      phone={ctx.village.phone ?? null}
      email={ctx.village.email ?? null}
      website={ctx.village.website ?? null}
      showMap={Boolean(s.show_map)}
    />
  );
}

export const defaultTemplatePack: TemplatePack = {
  id: "default",
  defaultThemeTokens: {
    surface: "#ffffff",
    surfaceMuted: "#f9fafb",
    border: "#e5e7eb",
    mutedForeground: "#6b7280",
    radiusMd: "1rem",
  },
  heroVariants: ["center"] as const,
  Shell: DefaultShell,
  renderSection: renderDefaultSection,
};
