import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { getTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { resolveEffectiveSiteSeo, resolveTenantFaviconUrl } from "@/lib/website-engine/normalize";
import { buildPageMetadata, type TenantSeoContext } from "@/lib/website-engine/seo";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id: raw } = await props.params;
  const id = Number(raw);
  const tenant = await getTenant();
  if (!tenant?.template || !tenant?.subscription || !Number.isFinite(id)) {
    return { title: "Berita" };
  }

  const row = await prisma.announcement.findFirst({
    where: { id, villageId: tenant.village.id, isActive: true },
    select: { title: true },
  });
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") === "https" ? "https" : "http";
  const path = `/site/berita/${id}`;
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
  const fakePage = {
    id: "news-detail",
    slug: `berita/${id}`,
    title: row?.title ?? "Berita",
    sections: [],
    seo: row ? { title: row.title, description: undefined } : undefined,
  };
  return buildPageMetadata(seoCtx, fakePage, path);
}

export default async function AnnouncementDetailPage(props: Props) {
  const { id: raw } = await props.params;
  const id = Number(raw);
  const tenant = await getTenant();
  if (!tenant?.template || !tenant?.subscription || !Number.isFinite(id)) notFound();

  const row = await prisma.announcement.findFirst({
    where: { id, villageId: tenant.village.id, isActive: true },
    select: {
      title: true,
      content: true,
      category: true,
      createdAt: true,
      imageUrl: true,
    },
  });
  if (!row) notFound();

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <nav className="mb-6 text-sm">
        <Link
          href="/site"
          className="[color:var(--site-primary,#0f766e)] hover:underline"
        >
          Beranda
        </Link>
        <span className="mx-2 text-muted-foreground">/</span>
        <Link
          href="/site"
          className="[color:var(--site-muted-foreground,#6b7280)] hover:underline"
        >
          Berita
        </Link>
      </nav>
      <article className="space-y-4">
        <p className="text-xs uppercase tracking-wide [color:var(--site-muted-foreground,#6b7280)]">
          {row.category} · {row.createdAt.toLocaleDateString("id-ID")}
        </p>
        <h1 className="text-3xl font-bold [color:var(--site-accent,#111827)]">
          {row.title}
        </h1>
        {row.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.imageUrl}
            alt=""
            className="w-full rounded-xl border [border-color:var(--site-border,#e5e7eb)]"
          />
        ) : null}
        <div className="max-w-none whitespace-pre-wrap text-base leading-relaxed [color:var(--site-muted-foreground,#374151)]">
          {row.content}
        </div>
      </article>
    </div>
  );
}
