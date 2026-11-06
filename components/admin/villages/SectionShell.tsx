"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Kerangka state muat/galat/kosong yang seragam untuk tab Inspektur. */
export function SectionShell({
  loading, error, onRetry, empty, emptyText, children,
}: {
  loading: boolean; error: string | null; onRetry: () => void; empty?: boolean; emptyText?: string; children: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Memuat">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle aria-hidden="true" className="h-4 w-4" />
          {error}
        </div>
        <Button size="sm" variant="outline" onClick={onRetry} className="min-h-10">Coba lagi</Button>
      </div>
    );
  }
  if (empty) return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{emptyText ?? "Belum ada data."}</p>;
  return <>{children}</>;
}
