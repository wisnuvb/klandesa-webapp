"use client";

import { useMemo } from "react";
import { MessageSquarePlus, PanelLeftClose, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/components/ui/utils";
import { groupThreadsByRecency } from "@/lib/ai/thread-groups";
import type { ThreadSummary } from "./types";

type HistoryPanelProps = {
  threads: ThreadSummary[];
  loading: boolean;
  activeId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  onDelete: (thread: ThreadSummary) => void;
  /** Hanya ada di desktop: sembunyikan panel. */
  onCollapse?: () => void;
  className?: string;
};

function formatTime(iso: string, withDate: boolean): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      ...(withDate ? { day: "numeric", month: "short" } : {}),
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function HistoryPanel({
  threads,
  loading,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onCollapse,
  className,
}: HistoryPanelProps) {
  const groups = useMemo(() => groupThreadsByRecency(threads), [threads]);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        <h2 className="text-sm font-semibold">Riwayat</h2>
        {onCollapse ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={onCollapse}
            aria-label="Sembunyikan riwayat"
            title="Sembunyikan riwayat"
          >
            <PanelLeftClose className="size-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <div className="px-3 pt-2">
        <Button type="button" variant="outline" size="sm" className="w-full justify-start gap-2" onClick={onNew}>
          <MessageSquarePlus className="size-4" aria-hidden="true" />
          Percakapan baru
        </Button>
      </div>

      <nav aria-label="Riwayat percakapan" className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-1">
        {loading ? (
          <div className="space-y-2 px-1 pt-3" role="status" aria-busy="true">
            <span className="sr-only">Memuat riwayat…</span>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            Belum ada percakapan tersimpan. Pertanyaan yang Anda ajukan akan muncul di sini.
          </p>
        ) : (
          groups.map((g) => (
            <section key={g.key} aria-label={g.label}>
              <h3 className="px-2 pb-1 pt-3 text-xs font-medium text-muted-foreground">{g.label}</h3>
              <ul className="space-y-0.5">
                {g.items.map((t) => {
                  const active = activeId === t.id;
                  return (
                    <li key={t.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => onSelect(t.id)}
                        aria-current={active ? "true" : undefined}
                        className={cn(
                          "w-full rounded-lg border border-transparent px-3 py-2 pr-10 text-left transition-colors",
                          "hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active && "border-primary/30 bg-primary/10",
                        )}
                      >
                        <span className="line-clamp-2 text-sm font-medium leading-snug">{t.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {t.mode === "general" ? "" : `${t.modeLabel} · `}{t.messageCount} pesan · {formatTime(t.updatedAt, g.key !== "today" && g.key !== "yesterday")}
                        </span>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "absolute right-1 top-1.5 size-8 text-muted-foreground hover:text-destructive",
                          // Tersembunyi hanya untuk penunjuk presisi; tetap tampil saat fokus keyboard & di layar sentuh.
                          "opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100",
                        )}
                        onClick={() => onDelete(t)}
                        aria-label={`Hapus percakapan: ${t.title}`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </nav>
    </div>
  );
}
