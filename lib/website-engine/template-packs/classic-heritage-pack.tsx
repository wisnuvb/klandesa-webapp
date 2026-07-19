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
import { TenantNavBar } from "@/lib/website-engine/template-packs/shell-nav";

function ClassicShell(props: import("@/lib/website-engine/template-packs/types").TenantShellProps) {
  const { children, villageName, hideSiteHeader, templateKey, navItems, currentPath } = props;
  return (
    <div className={`site-root tp-${templateKey}`}>
      {hideSiteHeader ? null : (
        <header className="border-b-4 [border-color:var(--site-accent,#78350f)] bg-stone-50 dark:bg-stone-950">
          <nav className="container mx-auto px-4 py-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="text-center md:text-left flex-1">
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
        title={s.title}
        subtitle={s.subtitle}
        columns={s.columns}
        items={[
          { title: s.item1_title ?? "Fitur 1", body: s.item1_body ?? "" },
          { title: s.item2_title ?? "Fitur 2", body: s.item2_body ?? "" },
          { title: s.item3_title ?? "Fitur 3", body: s.item3_body ?? "" },
        ].filter((it) => it.title.trim() || it.body.trim())}
        style={s.style}
      />
    );
  }
  if (s.kind === "stats") {
    return (
      <StatsBlock
        title={s.title}
        subtitle={s.subtitle}
        stats={[
          { label: s.stat1_label ?? "Stat 1", value: s.stat1_value ?? "—" },
          { label: s.stat2_label ?? "Stat 2", value: s.stat2_value ?? "—" },
          { label: s.stat3_label ?? "Stat 3", value: s.stat3_value ?? "—" },
        ]}
        style={s.style}
      />
    );
  }
  if (s.kind === "gallery") {
    return (
      <GalleryBlock
        title={s.title}
        subtitle={s.subtitle}
        imageUrls={[
          s.image1_url ?? "",
          s.image2_url ?? "",
          s.image3_url ?? "",
          s.image4_url ?? "",
          s.image5_url ?? "",
          s.image6_url ?? "",
        ]}
        style={s.style}
      />
    );
  }
  if (s.kind === "faq") {
    return (
      <FaqBlock
        title={s.title}
        items={[
          { q: s.q1 ?? "", a: s.a1 ?? "" },
          { q: s.q2 ?? "", a: s.a2 ?? "" },
          { q: s.q3 ?? "", a: s.a3 ?? "" },
          { q: s.q4 ?? "", a: s.a4 ?? "" },
          { q: s.q5 ?? "", a: s.a5 ?? "" },
        ]}
        style={s.style}
      />
    );
  }
  if (s.kind === "testimonials") {
    return (
      <TestimonialsBlock
        title={s.title}
        items={[
          { quote: s.quote1 ?? "", name: s.name1 ?? "", role: s.role1 },
          { quote: s.quote2 ?? "", name: s.name2 ?? "", role: s.role2 },
          { quote: s.quote3 ?? "", name: s.name3 ?? "", role: s.role3 },
        ]}
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
