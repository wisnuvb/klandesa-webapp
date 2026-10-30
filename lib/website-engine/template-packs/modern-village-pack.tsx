import type { TemplatePack } from "@/lib/website-engine/template-packs/types";
import {
  ContactBlock,
  CTABlock,
  FaqBlock,
  FeaturesBlock,
  GalleryBlock,
  HeroCenterBlock,
  NewsBlock,
  RegionalNewsBlock,
  RichTextBlock,
  SpacerBlock,
  StatsBlock,
  TestimonialsBlock,
  renderHeroFromSection,
} from "@/lib/website-engine/section-primitives";
import { SiteLogo } from "@/lib/website-engine/template-packs/site-logo";
import {
  faqItems,
  featureItems,
  galleryItems,
  statItems,
  testimonialItems,
} from "@/lib/website-engine/section-items";
import { TenantNavBar } from "@/lib/website-engine/template-packs/shell-nav";

function ModernShell(props: import("@/lib/website-engine/template-packs/types").TenantShellProps) {
  const { children, villageName, logoUrl, hideSiteHeader, templateKey, navItems, currentPath } = props;
  return (
    <div className={`site-root tp-${templateKey}`}>
      <div className="h-1 w-full bg-linear-to-r from-teal-500 via-emerald-500 to-cyan-600" />
      {hideSiteHeader ? null : (
        <header className="border-b border-black/5 backdrop-blur-sm bg-white/80 dark:bg-black/40">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <SiteLogo url={logoUrl} />
              <div className="text-xl font-semibold tracking-tight [color:var(--site-primary,#0f766e)]">
                {villageName}
              </div>
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
            style={s.style}
            imageUrl={s.image_url}
          />
        </div>
      </div>
    );
  }
  if (s.kind === "features") {
    return (
      <FeaturesBlock
        variant={s.variant}
        title={s.title}
        subtitle={s.subtitle}
        columns={s.columns}
        items={featureItems(s).map((it) => ({
          title: it.title ?? "",
          body: it.body ?? "",
        }))}
        style={s.style}
      />
    );
  }
  if (s.kind === "stats") {
    return (
      <StatsBlock
        variant={s.variant}
        title={s.title}
        subtitle={s.subtitle}
        stats={statItems(s).map((it) => ({
          label: it.label ?? "",
          value: it.value || "—",
        }))}
        style={s.style}
      />
    );
  }
  if (s.kind === "gallery") {
    return (
      <GalleryBlock
        variant={s.variant}
        title={s.title}
        subtitle={s.subtitle}
        images={galleryItems(s)}
        style={s.style}
      />
    );
  }
  if (s.kind === "faq") {
    return (
      <FaqBlock
        variant={s.variant}
        title={s.title}
        items={faqItems(s).map((it) => ({ q: it.q ?? "", a: it.a ?? "" }))}
        style={s.style}
      />
    );
  }
  if (s.kind === "testimonials") {
    return (
      <TestimonialsBlock
        variant={s.variant}
        title={s.title}
        items={testimonialItems(s).map((it) => ({
          quote: it.quote ?? "",
          name: it.name ?? "",
          role: it.role,
        }))}
        style={s.style}
      />
    );
  }
  if (s.kind === "spacer") {
    return (
      <SpacerBlock
        size={s.size}
        showDivider={Boolean(s.show_divider)}
        style={s.style}
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
        cardClassName="flex items-center justify-between gap-4 rounded-xl p-4 shadow-sm border [border-color:var(--site-border,#e5e7eb)] [background:var(--site-surface,#ffffff)]"
        style={s.style}
      />
    );
  }
  if (s.kind === "regional_news") {
    return (
      <RegionalNewsBlock
        title={s.title ?? "Berita di Sekitar Kami"}
        items={ctx.regionalNews ?? []}
        showSource={s.show_source !== false}
        style={s.style}
      />
    );
  }
  if (s.kind === "rich_text") {
    return <RichTextBlock title={s.title} body={s.body} style={s.style} />;
  }
  if (s.kind === "cta") {
    return (
      <CTABlock
        title={s.title}
        subtitle={s.subtitle}
        buttonLabel={s.button_label}
        buttonHref={s.button_href}
        style={s.style}
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
      style={s.style}
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
