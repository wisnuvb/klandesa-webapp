"use client";

import { AlertTriangle, CheckCircle, Clock, Inbox, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/components/ui/utils";
import type { QueueStats } from "./shared";

export type QuickView = "all" | "siap" | "menunggu_rt" | "lama" | "SELESAI";

type Tile = { key: QuickView; label: string; value: number; hint: string; icon: typeof Inbox; tone: string };

export function StatsStrip({ stats, active, onPick }: { stats: QueueStats | null; active: QuickView; onPick: (v: QuickView) => void }) {
  const tiles: Tile[] = [
    { key: "all", label: "Semua permohonan", value: stats?.total ?? 0, hint: `${stats?.masukHariIni ?? 0} masuk hari ini`, icon: Inbox, tone: "bg-primary/10 text-primary" },
    { key: "siap", label: "Siap diproses", value: stats?.siap ?? 0, hint: `${stats?.pending ?? 0} menunggu seluruhnya`, icon: UserCheck, tone: "bg-green-500/10 text-green-700" },
    { key: "menunggu_rt", label: "Menunggu Ketua RT", value: stats?.menungguRt ?? 0, hint: stats?.ditolakRt ? `${stats.ditolakRt} ditolak RT` : "Tahap pengantar RT", icon: Clock, tone: "bg-amber-500/10 text-amber-700" },
    { key: "lama", label: "Menunggu > 7 hari", value: stats?.lama ?? 0, hint: stats?.oldestPendingDays != null ? `Terlama ${stats.oldestPendingDays} hari` : "Tidak ada antrean", icon: AlertTriangle, tone: "bg-red-500/10 text-red-700" },
    { key: "SELESAI", label: "Selesai", value: stats?.approved ?? 0, hint: stats?.medianJamProses != null ? `Median proses ${formatHours(stats.medianJamProses)}` : "Belum ada data waktu", icon: CheckCircle, tone: "bg-blue-500/10 text-blue-700" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" role="group" aria-label="Ringkasan antrean (klik untuk menyaring)">
      {tiles.map((t) => {
        const Icon = t.icon;
        const on = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(on && t.key !== "all" ? "all" : t.key)}
            className="rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className={cn("h-full transition-colors hover:bg-muted/40", on && "border-primary ring-1 ring-primary")}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", t.tone)}>
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground">{t.label}</p>
                  <p className="text-2xl font-semibold leading-tight tabular-nums">{stats ? t.value : "–"}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.hint}</p>
                </div>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}

function formatHours(h: number): string {
  if (h < 1) return "< 1 jam";
  if (h < 48) return `${Math.round(h)} jam`;
  return `${Math.round(h / 24)} hari`;
}
