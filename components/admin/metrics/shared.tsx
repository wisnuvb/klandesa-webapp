"use client";

import type { ReactNode } from "react";
import { AlertCircle, Inbox, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDeltaPercent } from "@/lib/platform/metrics/format";
import { cn } from "@/components/ui/utils";

/** Perubahan relatif dengan ikon + teks (tidak mengandalkan warna saja). `null` = pembanding tidak ada. */
export function DeltaBadge({ change, label }: { change: number | null; label?: string }) {
  if (change == null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3" aria-hidden="true" />
        <span>Belum ada pembanding</span>
      </span>
    );
  }
  const up = change > 0;
  const flat = change === 0;
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium tabular-nums", flat ? "text-muted-foreground" : up ? "text-primary" : "text-destructive")}>
      <Icon className="size-3.5" aria-hidden="true" />
      <span>{formatDeltaPercent(change)}</span>
      <span className="sr-only">{up ? "naik" : flat ? "tetap" : "turun"}</span>
      {label ? <span className="font-normal text-muted-foreground">{label}</span> : null}
    </span>
  );
}

export function KpiCard({
  title, icon, value, footer, badge, loading,
}: { title: string; icon: ReactNode; value: ReactNode; footer?: ReactNode; badge?: ReactNode; loading?: boolean }) {
  return (
    <Card className="gap-2 py-4">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 px-4 pb-0">
        <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <span className="text-muted-foreground" aria-hidden="true">{icon}</span>
          {title}
        </CardTitle>
        {badge}
      </CardHeader>
      <CardContent className="space-y-1 px-4">
        {loading ? (
          <>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-40" />
          </>
        ) : (
          <>
            <div className="text-2xl font-semibold tabular-nums leading-tight break-words">{value}</div>
            {footer ? <div className="text-xs text-muted-foreground tabular-nums">{footer}</div> : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function SectionCard({
  title, description, action, children, className,
}: { title: string; description?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center">
      <AlertCircle className="size-5 shrink-0 text-destructive" aria-hidden="true" />
      <p className="flex-1 text-foreground">{message}</p>
      <Button type="button" variant="outline" size="sm" className="min-h-10" onClick={onRetry}>
        Coba lagi
      </Button>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-6 text-center">
      <Inbox className="size-6 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium">{title}</p>
      {hint ? <p className="max-w-sm text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Batang proporsi dengan label & angka tertulis (bukan hanya warna). */
export function BarList({
  rows, emptyText, format = (n) => String(n),
}: { rows: Array<{ label: string; value: number; hint?: string }>; emptyText: string; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 break-words">{r.label}</span>
            <span className="shrink-0 font-medium tabular-nums">{format(r.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, Math.round((r.value / max) * 100))}%` }} />
          </div>
          {r.hint ? <p className="text-xs text-muted-foreground">{r.hint}</p> : null}
        </li>
      ))}
    </ul>
  );
}
