import type { TemplatePack } from "@/lib/website-engine/template-packs/types";
import {
  ContactBlock,
  CTABlock,
  FaqBlock,
  FeaturesBlock,
  GalleryBlock,
  HeroCenterBlock,
  NewsBlock,
  RichTextBlock,
  SpacerBlock,
  StatsBlock,
  TestimonialsBlock,
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
        cardClassName="flex items-center justify-between gap-4 rounded-xl p-4 shadow-sm border [border-color:var(--site-border,#e5e7eb)] [background:var(--site-surface,#ffffff)]"
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
