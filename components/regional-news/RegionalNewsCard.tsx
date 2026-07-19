"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  ChevronDown,
  ExternalLink,
  Globe2,
  Newspaper,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { REGIONAL_NEWS_DISCLAIMER } from "@/lib/regional-news/config";
import { stripRegencyPrefix } from "@/lib/regional-news/region-key";
import type { RegionalNewsFeedResponse } from "@/lib/regional-news/types";
import { cn } from "@/components/ui/utils";

type RegionalNewsCardProps = {
  /** Lipat default agar tidak mendominasi dashboard */
  defaultOpen?: boolean;
  itemLimit?: number;
  className?: string;
};

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true, locale: localeId });
}

function regencyLabel(regency: string): string {
  const short = stripRegencyPrefix(regency);
  if (/^kota\s+/i.test(regency.trim())) return `Kota ${short}`;
  return `Kab. ${short}`;
}

export function RegionalNewsCard({
  defaultOpen = false,
  itemLimit = 3,
  className,
}: RegionalNewsCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [feed, setFeed] = useState<RegionalNewsFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/regional-news?limit=${encodeURIComponent(String(itemLimit))}`,
        );
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(data?.error || "Gagal memuat berita regional");
        }
        const data = (await res.json()) as RegionalNewsFeedResponse;
        if (mounted) setFeed(data);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Gagal memuat berita");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [itemLimit]);

  const regionTitle = feed ? regencyLabel(feed.region.regency) : null;
  const items = feed?.items ?? [];
  const preview = items[0];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={cn("border-border/80", className)}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-start gap-3 rounded-lg text-left transition-colors hover:bg-muted/40 -mx-1 px-1 py-0.5"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Newspaper className="size-4" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base font-semibold">
                    Berita Sekitar
                  </CardTitle>
                  {regionTitle ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                      <Globe2 className="size-3" />
                      {regionTitle}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {loading
                    ? "Memuat berita media regional…"
                    : error
                      ? "Berita regional sementara tidak tersedia"
                      : items.length === 0
                        ? "Belum ada berita untuk wilayah ini"
                        : open
                          ? "Sumber eksternal · ketuk judul untuk baca artikel asli"
                          : preview
                            ? `${items.length} berita · ${preview.title}`
                            : `${items.length} berita terbaru`}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "mt-1 size-4 shrink-0 text-muted-foreground transition-transform",
                  open && "rotate-180",
                )}
              />
            </button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            {loading ? (
              <div className="space-y-2">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded-md bg-muted/60"
                  />
                ))}
              </div>
            ) : null}

            {!loading && error ? (
              <p className="text-xs text-muted-foreground">{error}</p>
            ) : null}

            {!loading && !error && items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Coba lagi nanti atau buat pengumuman resmi desa.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-2 h-8 text-xs">
                  <Link href="/pengumuman-desa">Pengumuman desa</Link>
                </Button>
              </div>
            ) : null}

            {!loading && !error && items.length > 0 ? (
              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item.guid}>
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-primary">
                          {item.title}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span>{item.sourceName}</span>
                          <span aria-hidden>·</span>
                          <span>{formatRelativeTime(item.publishedAt)}</span>
                        </div>
                      </div>
                      <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}

            {feed?.fetchedAt ? (
              <p className="text-[10px] text-muted-foreground">
                Diperbarui {formatRelativeTime(feed.fetchedAt)}
                {feed.stale ? " · data cache" : ""}
              </p>
            ) : null}

            <p className="text-[10px] leading-relaxed text-muted-foreground">
              {REGIONAL_NEWS_DISCLAIMER}
            </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
