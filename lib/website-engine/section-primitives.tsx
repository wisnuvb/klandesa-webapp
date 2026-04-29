import type { WebsiteSection } from "@/lib/website-engine/types";

const HERO_FALLBACK =
  "Website resmi desa yang ditenagai oleh Klandesa";

export function HeroCenterBlock(props: {
  villageName: string;
  title?: string;
  subtitle?: string;
  className?: string;
}) {
  const subtitle = props.subtitle?.trim()
    ? props.subtitle
    : HERO_FALLBACK;
  return (
    <section className={props.className ?? "py-14"}>
      <div className="max-w-4xl mx-auto text-center px-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight [color:var(--site-primary,#111827)]">
          {props.title?.trim() ? props.title : props.villageName}
        </h1>
        {subtitle ? (
          <p className="mt-4 text-lg [color:var(--site-muted-foreground,#4b5563)]">
            {subtitle}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function HeroSplitBlock(props: {
  villageName: string;
  title?: string;
  subtitle?: string;
}) {
  const subtitle = props.subtitle?.trim()
    ? props.subtitle
    : HERO_FALLBACK;
  return (
    <section className="py-12 md:py-16">
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
        <div
          className="min-h-[200px] rounded-2xl border-2 [border-color:var(--site-accent,#d6d3d1)] [background:var(--site-surface-muted,#f5f5f4)] shadow-inner"
          aria-hidden
        />
      </div>
    </section>
  );
}

export function NewsBlock(props: {
  title: string;
  items: Array<{ id: number; title: string; date: string }>;
  cardClassName?: string;
  /** Prefix path detail, mis. `/site/berita` → `/site/berita/12` */
  newsDetailBasePath?: string;
}) {
  const base =
    props.newsDetailBasePath?.replace(/\/$/, "") ?? "";

  return (
    <section className="py-10 px-4">
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
    </section>
  );
}

export function RichTextBlock(props: { title?: string; body: string }) {
  const chunks = props.body.split(/\n\s*\n/).filter(Boolean);
  return (
    <section className="py-10 px-4">
        <div className="max-w-3xl mx-auto">
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
    </section>
  );
}

export function CTABlock(props: {
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  buttonHref?: string;
}) {
  const href = props.buttonHref?.trim() || "/";
  const label = props.buttonLabel?.trim() || "Selengkapnya";
  return (
    <section className="py-10 px-4">
      <div
        className="max-w-4xl mx-auto rounded-2xl border p-8 md:p-10 text-center [border-color:var(--site-border,#e5e7eb)] [background:var(--site-surface-muted,#f9fafb)]"
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
    </section>
  );
}

export function ContactBlock(props: {
  title: string;
  address: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  showMap?: boolean;
}) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    props.address,
  )}`;
  return (
    <section className="py-10 px-4">
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
    </section>
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
      />
    );
  }
  return (
    <HeroCenterBlock
      villageName={villageName}
      title={s.title}
      subtitle={subtitle}
    />
  );
}
