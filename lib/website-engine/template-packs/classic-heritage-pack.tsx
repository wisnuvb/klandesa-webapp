import type { TemplatePack } from "@/lib/website-engine/template-packs/types";
import {
  ContactBlock,
  CTABlock,
  FaqBlock,
  FeaturesBlock,
  GalleryBlock,
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

function ClassicShell(props: import("@/lib/website-engine/template-packs/types").TenantShellProps) {
  const { children, villageName, logoUrl, hideSiteHeader, templateKey, navItems, currentPath } = props;
  return (
    <div className={`site-root tp-${templateKey}`}>
      {hideSiteHeader ? null : (
        <header className="border-b-4 [border-color:var(--site-accent,#78350f)] bg-stone-50 dark:bg-stone-950">
          <nav className="container mx-auto px-4 py-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="text-center md:text-left flex-1 flex flex-col items-center md:items-start gap-2">
              <SiteLogo url={logoUrl} />
              <div className="text-xs uppercase tracking-[0.2em] [color:var(--site-muted-foreground,#78716c)] mb-1">
                Website Resmi
              </div>
              <div className="text-2xl md:text-3xl font-serif font-semibold [color:var(--site-primary,#78350f)] [font-family:var(--site-font-heading,Georgia,serif)]">
                {villageName}
              </div>
            </div>
            <div className="flex justify-center md:justify-end md:pt-2">
              <TenantNavBar items={navItems} currentPath={currentPath} />
            </div>
          </nav>
        </header>
      )}
      {children}
    </div>
  );
}

function renderClassicSection(
  ctx: import("@/lib/website-engine/template-packs/types").SectionRenderContext,
) {
  const s = ctx.section;
  if (s.kind === "hero") {
    return renderHeroFromSection(s, ctx.village.name);
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
        cardClassName="flex items-center justify-between gap-4 rounded-none p-4 border-l-4 [border-color:var(--site-accent,#92400e)] [background:var(--site-surface,#fffbeb)] [border-top:1px_solid_var(--site-border,#e7e5e4)] [border-right:1px_solid_var(--site-border,#e7e5e4)] [border-bottom:1px_solid_var(--site-border,#e7e5e4)]"
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

export const classicHeritagePack: TemplatePack = {
  id: "classic-heritage",
  defaultThemeTokens: {
    surface: "#fffbeb",
    surfaceMuted: "#fef3c7",
    border: "#e7e5e4",
    mutedForeground: "#57534e",
    radiusMd: "0.25rem",
    fontHeading: "Georgia, 'Times New Roman', serif",
  },
  heroVariants: ["center", "split"] as const,
  Shell: ClassicShell,
  renderSection: renderClassicSection,
};
