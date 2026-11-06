"use client";

import { AlertOctagon, AlertTriangle, CheckCircle2, Info, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionShell } from "./SectionShell";
import { useInspectSection } from "./use-section";
import { fmtDateTime } from "./types";
import type { HealthFinding, HealthSeverity } from "@/lib/platform/villages/health";

type HealthResp = { findings: HealthFinding[]; checked: number; passed: number; generatedAt: string };

const SEV: Record<HealthSeverity, { label: string; cls: string; Icon: typeof Info }> = {
  critical: { label: "Kritis", cls: "border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950 dark:text-red-50", Icon: AlertOctagon },
  warning: { label: "Perlu perhatian", cls: "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50", Icon: AlertTriangle },
  info: { label: "Info", cls: "border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-50", Icon: Info },
};

export function HealthTab({ villageId }: { villageId: number }) {
  const s = useInspectSection<HealthResp>(villageId, "health");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {s.data ? `${s.data.passed} dari ${s.data.checked} pemeriksaan lolos · diperbarui ${fmtDateTime(s.data.generatedAt)}` : "Pemeriksaan otomatis dari angka agregat (tanpa data pribadi)."}
        </p>
        <Button variant="outline" onClick={s.reload} disabled={s.loading} className="min-h-10"><RefreshCw aria-hidden="true" /> Periksa ulang</Button>
      </div>
      <SectionShell loading={s.loading} error={s.error} onRetry={s.reload}>
        {s.data && s.data.findings.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-50">
            <CheckCircle2 aria-hidden="true" className="h-5 w-5" /> Semua pemeriksaan lolos. Tidak ada temuan.
          </div>
        ) : (
          <ul className="space-y-3">
            {s.data?.findings.map((f) => {
              const v = SEV[f.severity];
              return (
                <li key={f.id} className={`rounded-lg border p-3 ${v.cls}`}>
                  <div className="flex items-start gap-2">
                    <v.Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0 space-y-1">
                      <h3 className="text-sm font-semibold"><span className="sr-only">{v.label}: </span>{f.title}</h3>
                      <p className="text-sm">{f.detail}</p>
                      <p className="text-sm"><span className="font-medium">Saran: </span>{f.hint}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionShell>
    </div>
  );
}
