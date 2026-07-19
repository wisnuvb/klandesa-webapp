"use client";

import { memo, useEffect, useMemo, useState } from "react";
import type {
  WebsiteCMSPage,
  WebsiteNavItem,
  WebsiteThemeTokens,
} from "@/lib/website-engine/types";
import { getTemplatePack } from "@/lib/website-engine/template-packs/registry";
import { themeToCssVars } from "@/lib/website-engine/theme";
import { renderWebsiteSection } from "@/lib/website-engine/site-sections";
import type { RegionalNewsItem } from "@/lib/regional-news/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type VillageLite = {
  name: string;
  address: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
};

type Props = {
  templateKey: string;
  theme: WebsiteThemeTokens;
  hideSiteHeader: boolean;
  navItems: WebsiteNavItem[];
  page: WebsiteCMSPage | undefined;
  village: VillageLite | null;
};

export const CmsLivePreviewCard = memo(function CmsLivePreviewCard({
  templateKey,
  theme,
  hideSiteHeader,
  navItems,
  page,
  village,
}: Props) {
  function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
  }

  const [news, setNews] = useState<
    Array<{ id: number; title: string; date: string }>
  >([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [regionalNews, setRegionalNews] = useState<RegionalNewsItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/announcements?category=ALL&search=")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const rows = Array.isArray(j?.rows) ? (j.rows as unknown[]) : [];
        const mapped = rows
          .map((a) => {
            if (!isRecord(a)) return null;
            const id =
              typeof a.id === "number" && Number.isFinite(a.id) ? a.id : null;
            const title = typeof a.title === "string" ? a.title : "";
            const createdAt =
              typeof a.createdAt === "string" ? a.createdAt : "";
            const date = createdAt
              ? new Date(createdAt).toLocaleDateString("id-ID")
              : "";
            if (id === null || !title) return null;
            return { id, title, date };
          })
          .filter((x): x is NonNullable<typeof x> => Boolean(x))
          .slice(0, 12);
        setNews(mapped);
      })
      .catch(() => {
        if (cancelled) return;
        setNews([]);
      })
      .finally(() => {
        if (cancelled) return;
        setNewsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/regional-news?limit=6")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j || !Array.isArray(j.items)) return;
        setRegionalNews(j.items as RegionalNewsItem[]);
      })
      .catch(() => {
        if (cancelled) return;
        setRegionalNews([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cssVars = useMemo(() => themeToCssVars(theme), [theme]);
  const pack = useMemo(() => getTemplatePack(templateKey), [templateKey]);
  const PackShell = pack.Shell;

  const wrapClass =
    page?.layoutPreset === "fullBleed" ? "w-full" : "container mx-auto px-4";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview real-time</CardTitle>
        <CardDescription>
          Perubahan pada blok, tema, dan layout langsung terlihat di sini (tanpa
          perlu simpan).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="rounded-xl border"
          style={{
            ...cssVars,
            backgroundColor: "var(--site-surface, #ffffff)",
            ...(theme.fontBody ? { fontFamily: "var(--site-font-body)" } : {}),
          }}
        >
          <PackShell
            villageName={village?.name ?? "Preview Desa"}
            hideSiteHeader={hideSiteHeader}
            templateKey={templateKey}
            currentPath="/site"
            navItems={navItems}
          >
            <div className={wrapClass}>
              <main>
                {page?.sections?.map((section, idx) => (
                  <div key={`${section.kind}-${idx}`}>
                    {renderWebsiteSection({
                      templateKey,
                      section,
                      village: {
                        name: village?.name ?? "Preview Desa",
                        address: village?.address ?? "Alamat desa",
                        phone: village?.phone ?? null,
                        email: village?.email ?? null,
                        website: village?.website ?? null,
                      },
                      news,
                      regionalNews,
                      newsDetailBasePath: "/site/berita",
                    })}
                  </div>
                ))}
                {!page?.sections?.length ? (
                  <div className="py-10 text-sm text-muted-foreground">
                    Belum ada blok pada halaman ini. Tambahkan blok dari panel
                    editor.
                  </div>
                ) : null}
                {newsLoading ? (
                  <div className="pb-10 text-xs text-muted-foreground">
                    Memuat data berita...
                  </div>
                ) : null}
              </main>
            </div>
          </PackShell>
        </div>
      </CardContent>
    </Card>
  );
});
