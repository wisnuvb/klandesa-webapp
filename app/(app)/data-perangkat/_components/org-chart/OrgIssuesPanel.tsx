"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Info, TriangleAlert } from "lucide-react";
import type { OrgAnomaly } from "@/lib/officials/org";

type Props = {
  anomalies: OrgAnomaly[];
  canEdit: boolean;
  /** Buka Edit Perangkat untuk perangkat pertama pada temuan. */
  onFix: (officialId: number) => void;
};

/** Temuan kerapian data struktur. Tidak memblokir apa pun: hanya memberi tahu admin apa yang janggal. */
export function OrgIssuesPanel({ anomalies, canEdit, onFix }: Props) {
  const [open, setOpen] = useState(true);
  if (anomalies.length === 0) return null;
  const warns = anomalies.filter((a) => a.severity === "warn").length;
  return (
    <section aria-labelledby="org-issues-title" className="rounded-lg border border-amber-500/50 bg-amber-50 text-amber-950">
      <h3 id="org-issues-title" className="m-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-semibold focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {open ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
          Perlu dirapikan ({anomalies.length})
          {warns === 0 && <span className="text-xs font-normal">hanya saran</span>}
        </button>
      </h3>
      {open && (
        <ul className="space-y-2 px-3 pb-3">
          {anomalies.map((a) => (
            <li key={a.id} className="flex items-start gap-2 text-sm">
              {a.severity === "warn" ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-label="Peringatan" /> : <Info className="mt-0.5 h-4 w-4 shrink-0" aria-label="Saran" />}
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{a.message}</span>
              {canEdit && a.officialIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => onFix(a.officialIds[0])}
                  className="min-h-8 shrink-0 rounded-md px-2 text-xs font-medium underline underline-offset-2 hover:bg-amber-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  Perbaiki
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
