import Image from "next/image";
import clsx from "clsx";
import { ExternalLink, Globe2 } from "lucide-react";
import type React from "react";
import { REGIONAL_NEWS_DISCLAIMER } from "@/lib/regional-news/config";
import type { RegionalNewsItem } from "@/lib/regional-news/types";
import type {
  WebsiteSection,
  WebsiteSectionStyle,
} from "@/lib/website-engine/types";

const HERO_FALLBACK = "Website resmi desa yang ditenagai oleh Klandesa";

function sectionPaddingClass(style?: WebsiteSectionStyle) {
  const py = style?.paddingY ?? "md";
  if (py === "none") return "py-0";
  if (py === "sm") return "py-6";
  if (py === "lg") return "py-16";
  return "py-10";
}

function sectionBgClass(style?: WebsiteSectionStyle) {
  const bg = style?.background ?? "none";
  if (bg === "surface") return "[background:var(--site-surface,#ffffff)]";
  if (bg === "muted") return "[background:var(--site-surface-muted,#f9fafb)]";
  if (bg === "primaryGradient")
    return "bg-gradient-to-r from-[var(--site-surface-muted,#f9fafb)] to-[var(--site-surface,#ffffff)]";
  return "";
}

function sectionAlignClass(style?: WebsiteSectionStyle) {
  const a = style?.align ?? "left";
  return a === "center" ? "text-center" : "text-left";
}

export function SectionFrame(props: {
  style?: WebsiteSectionStyle;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        sectionPaddingClass(props.style),
        sectionBgClass(props.style),
        props.style?.rounded ? "rounded-2xl" : "",
        props.style?.bordered
          ? "border [border-color:var(--site-border,#e5e7eb)]"
          : "",
        props.className,
      )}
    >
      {props.children}
    </section>
  );
}

export function HeroCenterBlock(props: {
  villageName: string;
  title?: string;
  subtitle?: string;
  className?: string;
  style?: WebsiteSectionStyle;
  imageUrl?: string;
}) {
  const subtitle = props.subtitle?.trim() ? props.subtitle : HERO_FALLBACK;
  return (
    <SectionFrame
      style={props.style}
      className={clsx(
        props.className ?? "py-14",
        sectionAlignClass(props.style),
      )}
    >
      <div className="relative max-w-5xl mx-auto px-4">
        {props.imageUrl?.trim() ? (
          <div className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
            <Image
              src={props.imageUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 1024px"
              className="object-cover opacity-30"
              priority={false}
            />
            <div className="absolute inset-0 [background:var(--site-surface,#ffffff)] opacity-70" />
          </div>
        ) : null}
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight [color:var(--site-primary,#111827)]">
          {props.title?.trim() ? props.title : props.villageName}
        </h1>
        {subtitle ? (
          <p className="mt-4 text-lg [color:var(--site-muted-foreground,#4b5563)]">
            {subtitle}
          </p>
        ) : null}
      </div>
    </SectionFrame>
  );
}

export function HeroSplitBlock(props: {
  villageName: string;
  title?: string;
  subtitle?: string;
  style?: WebsiteSectionStyle;
  imageUrl?: string;
}) {
  const subtitle = props.subtitle?.trim() ? props.subtitle : HERO_FALLBACK;
  return (
    <SectionFrame style={props.style} className="py-12 md:py-16">
      <div className="max-w-6xl mx-auto px-4 grid gap-10 md:grid-cols-2 md:items-center">
        <div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight [color:var(--site-primary,#111827)] [font-family:var(--site-font-heading,var(--site-font-body,inherit))]">
            {props.title?.trim() ? props.title : props.villageName}
          </h1>
          {subtitle ? (
            <p className="mt-4 text-lg [color:var(--site-muted-foreground,#4b5563)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {props.imageUrl?.trim() ? (
          <div className="relative min-h-[220px] overflow-hidden rounded-2xl border [border-color:var(--site-border,#e5e7eb)]">
            <Image
              src={props.imageUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 520px"
              className="object-cover"
              priority={false}
            />
          </div>
        ) : (
          <div
            className="min-h-[200px] rounded-2xl border-2 [border-color:var(--site-accent,#d6d3d1)] [background:var(--site-surface-muted,#f5f5f4)] shadow-inner"
            aria-hidden
          />
        )}
      </div>
    </SectionFrame>
  );
}

export function NewsBlock(props: {
  title: string;
  items: Array<{ id: number; title: string; date: string }>;
  cardClassName?: string;
  newsDetailBasePath?: string;
  style?: WebsiteSectionStyle;
}) {
  const base = props.newsDetailBasePath?.replace(/\/$/, "") ?? "";
  return (
    <SectionFrame style={props.style} className="px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold mb-5 [color:var(--site-accent,#111827)]">
          {props.title}
        </h2>
        {props.items.length === 0 ? (
          <div className="text-sm [color:var(--site-muted-foreground,#6b7280)]">
            Belum ada berita.
          </div>
        ) : (
          <div className="grid gap-3">
            {props.items.map((a) => {
              const href = base ? `${base}/${a.id}` : undefined;
              const inner = (
                <>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{a.title}</div>
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {a.date}
                  </div>
                </>
              );
              const cls =
                props.cardClassName ??
                "flex items-center justify-between gap-4 rounded-xl border p-4 [border-color:var(--site-border,#e5e7eb)] [background:var(--site-surface,#ffffff)]";
              return href ? (
                <a
                  key={a.id}
                  href={href}
                  className={`${cls} hover:opacity-95 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-primary,#0f766e)]`}
                >
                  {inner}
                </a>
              ) : (
                <div key={a.id} className={cls}>
                  {inner}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SectionFrame>
  );
}

function formatNewsDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function RegionalNewsBlock(props: {
  title: string;
  items: RegionalNewsItem[];
  showSource?: boolean;
  style?: WebsiteSectionStyle;
}) {
  return (
    <SectionFrame style={props.style} className="px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Globe2 className="size-5 [color:var(--site-muted-foreground,#6b7280)]" />
          <h2 className="text-2xl font-semibold [color:var(--site-accent,#111827)]">
            {props.title}
          </h2>
        </div>
        {props.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-sm [border-color:var(--site-border,#e5e7eb)] [color:var(--site-muted-foreground,#6b7280)]">
            Belum ada berita regional untuk wilayah ini.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {props.items.map((item) => (
              <a
                key={item.guid}
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-dashed transition-all hover:-translate-y-0.5 hover:shadow-md [border-color:var(--site-border,#e5e7eb)] [background:var(--site-surface,#ffffff)]"
              >
                {item.imageUrl ? (
                  <div className="relative aspect-[16/9] w-full overflow-hidden [background:var(--site-surface-muted,#f9fafb)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-semibold text-slate-600">
                    {item.sourceName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-1 flex-col p-4">
                  {props.showSource !== false ? (
                    <span className="mb-2 inline-flex w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {item.sourceName}
                    </span>
                  ) : null}
                  <h3 className="line-clamp-3 text-sm font-semibold leading-snug [color:var(--site-primary,#111827)] group-hover:opacity-90">
                    {item.title}
                  </h3>
                  {item.excerpt ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed [color:var(--site-muted-foreground,#6b7280)]">
                      {item.excerpt}
                    </p>
                  ) : null}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs [color:var(--site-muted-foreground,#6b7280)]">
                    <span>{formatNewsDate(item.publishedAt)}</span>
                    <span className="inline-flex items-center gap-1 font-medium">
                      Baca
                      <ExternalLink className="size-3.5" />
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
        <p className="mt-4 text-[11px] leading-relaxed [color:var(--site-muted-foreground,#6b7280)]">
          {REGIONAL_NEWS_DISCLAIMER}
        </p>
      </div>
    </SectionFrame>
  );
}

export function RichTextBlock(props: {
  title?: string;
  body: string;
  style?: WebsiteSectionStyle;
}) {
  const chunks = props.body.split(/\n\s*\n/).filter(Boolean);
  return (
    <SectionFrame style={props.style} className="px-4">
      <div
        className={clsx("max-w-3xl mx-auto", sectionAlignClass(props.style))}
      >
        {props.title?.trim() ? (
          <h2 className="text-2xl font-semibold mb-4 [color:var(--site-accent,#111827)]">
            {props.title}
          </h2>
        ) : null}
        <div className="space-y-4 text-base [color:var(--site-muted-foreground,#374151)]">
          {chunks.length === 0 ? (
            <p className="text-sm italic">Konten akan segera diisi.</p>
          ) : (
            chunks.map((para, i) => (
              <p key={i} className="whitespace-pre-wrap">
                {para}
              </p>
            ))
          )}
        </div>
      </div>
    </SectionFrame>
  );
}

export function CTABlock(props: {
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  buttonHref?: string;
  style?: WebsiteSectionStyle;
}) {
  const href = props.buttonHref?.trim() || "/";
  const label = props.buttonLabel?.trim() || "Selengkapnya";
  return (
    <SectionFrame style={props.style} className="px-4">
      <div
        className={clsx(
          "max-w-4xl mx-auto rounded-2xl border p-8 md:p-10 [border-color:var(--site-border,#e5e7eb)] [background:var(--site-surface-muted,#f9fafb)]",
          sectionAlignClass(props.style),
        )}
        style={{ borderRadius: "var(--site-radius-md, 1rem)" }}
      >
        {props.title?.trim() ? (
          <h2 className="text-2xl font-semibold [color:var(--site-accent,#111827)]">
            {props.title}
          </h2>
        ) : null}
        {props.subtitle?.trim() ? (
          <p className="mt-3 text-base [color:var(--site-muted-foreground,#4b5563)]">
            {props.subtitle}
          </p>
        ) : null}
        <div className="mt-6">
          <a
            href={href}
            className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-white [background:var(--site-primary,#0f766e)] hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            {label}
          </a>
        </div>
      </div>
    </SectionFrame>
  );
}

export function ContactBlock(props: {
  title: string;
  address: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  showMap?: boolean;
  style?: WebsiteSectionStyle;
}) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    props.address,
  )}`;
  return (
    <SectionFrame style={props.style} className="px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold mb-5 [color:var(--site-accent,#111827)]">
          {props.title}
        </h2>
        <div
          className="rounded-2xl border p-6 [border-color:var(--site-border,#e5e7eb)] [background:var(--site-surface,#ffffff)]"
          style={{ borderRadius: "var(--site-radius-md, 1rem)" }}
        >
          <div className="text-sm [color:var(--site-muted-foreground,#4b5563)]">
            {props.address}
          </div>
          {props.showMap ? (
            <div className="mt-3 text-sm">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="underline [color:var(--site-primary,#2563eb)]"
              >
                Lihat di peta
              </a>
            </div>
          ) : null}
          <div className="mt-4 grid gap-2 text-sm">
            {props.phone ? <div>Telepon: {props.phone}</div> : null}
            {props.email ? <div>Email: {props.email}</div> : null}
            {props.website ? <div>Website: {props.website}</div> : null}
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}

export function FeaturesBlock(props: {
  title?: string;
  subtitle?: string;
  columns?: 2 | 3;
  items: Array<{ title: string; body: string }>;
  style?: WebsiteSectionStyle;
}) {
  const cols = props.columns === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
  return (
    <SectionFrame style={props.style} className="px-4">
      <div className="max-w-6xl mx-auto">
        {props.title?.trim() ? (
          <h2
            className={clsx(
              "text-2xl md:text-3xl font-semibold [color:var(--site-accent,#111827)]",
              sectionAlignClass(props.style),
            )}
          >
            {props.title}
          </h2>
        ) : null}
        {props.subtitle?.trim() ? (
          <p
            className={clsx(
              "mt-3 text-base [color:var(--site-muted-foreground,#4b5563)]",
              sectionAlignClass(props.style),
            )}
          >
            {props.subtitle}
          </p>
        ) : null}
        <div className={clsx("mt-8 grid gap-4 sm:grid-cols-2", cols)}>
          {props.items.map((it, i) => (
            <div
              key={i}
              className="rounded-2xl border p-5 [border-color:var(--site-border,#e5e7eb)] [background:var(--site-surface,#ffffff)]"
              style={{ borderRadius: "var(--site-radius-md, 1rem)" }}
            >
              <div className="font-semibold [color:var(--site-primary,#111827)]">
                {it.title}
              </div>
              <div className="mt-2 text-sm [color:var(--site-muted-foreground,#4b5563)] whitespace-pre-wrap">
                {it.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}

export function StatsBlock(props: {
  title?: string;
  subtitle?: string;
  stats: Array<{ label: string; value: string }>;
  style?: WebsiteSectionStyle;
}) {
  return (
    <SectionFrame style={props.style} className="px-4">
      <div className="max-w-6xl mx-auto">
        {props.title?.trim() ? (
          <h2
            className={clsx(
              "text-2xl md:text-3xl font-semibold [color:var(--site-accent,#111827)]",
              sectionAlignClass(props.style),
            )}
          >
            {props.title}
          </h2>
        ) : null}
        {props.subtitle?.trim() ? (
          <p
            className={clsx(
              "mt-3 text-base [color:var(--site-muted-foreground,#4b5563)]",
              sectionAlignClass(props.style),
            )}
          >
            {props.subtitle}
          </p>
        ) : null}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {props.stats.map((s, i) => (
            <div
              key={i}
              className="rounded-2xl border p-6 [border-color:var(--site-border,#e5e7eb)] [background:var(--site-surface,#ffffff)]"
              style={{ borderRadius: "var(--site-radius-md, 1rem)" }}
            >
              <div className="text-3xl font-bold [color:var(--site-primary,#0f766e)]">
                {s.value}
              </div>
              <div className="mt-2 text-sm [color:var(--site-muted-foreground,#4b5563)]">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}

export function GalleryBlock(props: {
  title?: string;
  subtitle?: string;
  imageUrls: string[];
  style?: WebsiteSectionStyle;
}) {
  const urls = props.imageUrls.map((u) => u.trim()).filter(Boolean);
  return (
    <SectionFrame style={props.style} className="px-4">
      <div className="max-w-6xl mx-auto">
        {props.title?.trim() ? (
          <h2
            className={clsx(
              "text-2xl md:text-3xl font-semibold [color:var(--site-accent,#111827)]",
              sectionAlignClass(props.style),
            )}
          >
            {props.title}
          </h2>
        ) : null}
        {props.subtitle?.trim() ? (
          <p
            className={clsx(
              "mt-3 text-base [color:var(--site-muted-foreground,#4b5563)]",
              sectionAlignClass(props.style),
            )}
          >
            {props.subtitle}
          </p>
        ) : null}
        {urls.length ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {urls.map((src, i) => (
              <div
                key={i}
                className="relative aspect-[4/3] overflow-hidden rounded-2xl border [border-color:var(--site-border,#e5e7eb)]"
                style={{ borderRadius: "var(--site-radius-md, 1rem)" }}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  className="object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 text-sm italic [color:var(--site-muted-foreground,#6b7280)]">
            Tambahkan gambar dari panel admin.
          </div>
        )}
      </div>
    </SectionFrame>
  );
}

export function FaqBlock(props: {
  title?: string;
  items: Array<{ q: string; a: string }>;
  style?: WebsiteSectionStyle;
}) {
  const items = props.items
    .map((it) => ({ q: it.q.trim(), a: it.a.trim() }))
    .filter((it) => it.q && it.a);
  return (
    <SectionFrame style={props.style} className="px-4">
      <div className="max-w-4xl mx-auto">
        {props.title?.trim() ? (
          <h2
            className={clsx(
              "text-2xl md:text-3xl font-semibold [color:var(--site-accent,#111827)]",
              sectionAlignClass(props.style),
            )}
          >
            {props.title}
          </h2>
        ) : null}
        <div className="mt-6 grid gap-3">
          {items.length ? (
            items.map((it, i) => (
              <details
                key={i}
                className="rounded-2xl border p-5 [border-color:var(--site-border,#e5e7eb)] [background:var(--site-surface,#ffffff)]"
                style={{ borderRadius: "var(--site-radius-md, 1rem)" }}
              >
                <summary className="cursor-pointer font-medium [color:var(--site-primary,#111827)]">
                  {it.q}
                </summary>
                <div className="mt-3 text-sm [color:var(--site-muted-foreground,#4b5563)] whitespace-pre-wrap">
                  {it.a}
                </div>
              </details>
            ))
          ) : (
            <div className="text-sm italic [color:var(--site-muted-foreground,#6b7280)]">
              Tambahkan pertanyaan & jawaban dari panel admin.
            </div>
          )}
        </div>
      </div>
    </SectionFrame>
  );
}

export function TestimonialsBlock(props: {
  title?: string;
  items: Array<{ quote: string; name: string; role?: string }>;
  style?: WebsiteSectionStyle;
}) {
  const items = props.items
    .map((it) => ({
      quote: it.quote.trim(),
      name: it.name.trim(),
      role: it.role?.trim() || "",
    }))
    .filter((it) => it.quote && it.name);
  return (
    <SectionFrame style={props.style} className="px-4">
      <div className="max-w-6xl mx-auto">
        {props.title?.trim() ? (
          <h2
            className={clsx(
              "text-2xl md:text-3xl font-semibold [color:var(--site-accent,#111827)]",
              sectionAlignClass(props.style),
            )}
          >
            {props.title}
          </h2>
        ) : null}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {items.length ? (
            items.map((it, i) => (
              <div
                key={i}
                className="rounded-2xl border p-6 [border-color:var(--site-border,#e5e7eb)] [background:var(--site-surface,#ffffff)]"
                style={{ borderRadius: "var(--site-radius-md, 1rem)" }}
              >
                <div className="text-sm [color:var(--site-muted-foreground,#374151)] whitespace-pre-wrap">
                  “{it.quote}”
                </div>
                <div className="mt-4 font-medium [color:var(--site-primary,#111827)]">
                  {it.name}
                </div>
                {it.role ? (
                  <div className="text-xs [color:var(--site-muted-foreground,#6b7280)]">
                    {it.role}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="text-sm italic [color:var(--site-muted-foreground,#6b7280)]">
              Tambahkan testimoni dari panel admin.
            </div>
          )}
        </div>
      </div>
    </SectionFrame>
  );
}

export function SpacerBlock(props: {
  size?: "sm" | "md" | "lg";
  showDivider?: boolean;
  style?: WebsiteSectionStyle;
}) {
  const h = props.size === "sm" ? "h-6" : props.size === "lg" ? "h-16" : "h-10";
  return (
    <SectionFrame style={props.style} className="px-4">
      <div
        className={clsx(
          h,
          props.showDivider
            ? "border-b [border-color:var(--site-border,#e5e7eb)]"
            : "",
        )}
      />
    </SectionFrame>
  );
}

export function renderHeroFromSection(
  s: Extract<WebsiteSection, { kind: "hero" }>,
  villageName: string,
) {
  const variant = s.variant === "split" ? "split" : "center";
  const subtitle = s.subtitle?.trim() ? s.subtitle : HERO_FALLBACK;
  if (variant === "split") {
    return (
      <HeroSplitBlock
        villageName={villageName}
        title={s.title}
        subtitle={subtitle}
        style={s.style}
        imageUrl={s.image_url}
      />
    );
  }
  return (
    <HeroCenterBlock
      villageName={villageName}
      title={s.title}
      subtitle={subtitle}
      style={s.style}
      imageUrl={s.image_url}
    />
  );
}
