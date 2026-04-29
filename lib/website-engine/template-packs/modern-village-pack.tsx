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

function ModernShell(props: import("@/lib/website-engine/template-packs/types").TenantShellProps) {
  const { children, villageName, hideSiteHeader, templateKey, navItems, currentPath } = props;
  return (
    <div className={`site-root tp-${templateKey}`}>
      <div className="h-1 w-full bg-linear-to-r from-teal-500 via-emerald-500 to-cyan-600" />
      {hideSiteHeader ? null : (
        <header className="border-b border-black/5 backdrop-blur-sm bg-white/80 dark:bg-black/40">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-xl font-semibold tracking-tight [color:var(--site-primary,#0f766e)]">
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

function renderModernSection(
  ctx: import("@/lib/website-engine/template-packs/types").SectionRenderContext,
) {
  const s = ctx.section;
  if (s.kind === "hero") {
    if (s.variant === "split") {
      return renderHeroFromSection(s, ctx.village.name);
    }
    return (
      <div className="px-4">
        <div className="max-w-5xl mx-auto mt-8 rounded-2xl [background:var(--site-surface-muted,#ecfdf5)] p-8 md:p-12 border [border-color:var(--site-border,#d1fae5)]">
          <HeroCenterBlock
            villageName={ctx.village.name}
            title={s.title}
            subtitle={
              s.subtitle?.trim()
                ? s.subtitle
                : "Website resmi desa yang ditenagai oleh Klandesa"
            }
            className="py-4"
          />
        </div>
      </div>
    );
  }
  if (s.kind === "news") {
    const title = s.title ?? "Berita Terbaru";
    return (
      <NewsBlock
        title={title}
        items={ctx.news}
        newsDetailBasePath={ctx.newsDetailBasePath}
        cardClassName="flex items-center justify-between gap-4 rounded-xl p-4 shadow-sm border [border-color:var(--site-border,#e5e7eb)] [background:var(--site-surface,#ffffff)]"
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

export const modernVillagePack: TemplatePack = {
  id: "modern-village",
  defaultThemeTokens: {
    surface: "#ffffff",
    surfaceMuted: "#ecfdf5",
    border: "#d1fae5",
    mutedForeground: "#115e59",
    radiusMd: "0.75rem",
  },
  heroVariants: ["center"] as const,
  Shell: ModernShell,
  renderSection: renderModernSection,
};
