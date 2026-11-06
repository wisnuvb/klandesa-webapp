"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, PauseCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PHASE_LABEL, type Phase, type VillageDetail } from "./types";

const PHASE_STYLE: Record<Phase, { cls: string; Icon: typeof CheckCircle2 }> = {
  active: { cls: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100", Icon: CheckCircle2 },
  trial: { cls: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100", Icon: Clock },
  grace: { cls: "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50", Icon: PauseCircle },
  inactive: { cls: "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100", Icon: XCircle },
};

export function remainingLabel(sub: VillageDetail["subscription"]): string {
  if (sub.status === "cancelled") return "Dibatalkan";
  if (sub.expiry == null) return sub.phase === "active" ? "Tanpa batas waktu" : "Tanpa masa berlaku";
  if (sub.daysRemaining === 0) return "Sudah berakhir";
  return `Sisa ${sub.daysRemaining} hari`;
}

export function VillageHeader({ d }: { d: VillageDetail }) {
  const s = PHASE_STYLE[d.subscription.phase];
  const region = [d.village.district, d.village.regency, d.village.province].filter(Boolean).join(" · ");
  return (
    <header className="space-y-3">
      <Link href="/admin/desa" className="inline-flex min-h-10 items-center gap-1 rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Semua desa
      </Link>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-tight [overflow-wrap:anywhere] md:text-2xl">{d.village.name}</h1>
          <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
            <span className="font-mono">{d.village.code}</span>{region ? ` · ${region}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={s.cls}>
            <s.Icon aria-hidden="true" /> {PHASE_LABEL[d.subscription.phase]}
          </Badge>
          <Badge variant="outline" className={d.village.isActive ? "" : "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"}>
            {d.village.isActive ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
            {d.village.isActive ? "Desa aktif" : "Desa dinonaktifkan"}
          </Badge>
          <span className="text-sm font-medium tabular-nums">{remainingLabel(d.subscription)}</span>
        </div>
      </div>
    </header>
  );
}
