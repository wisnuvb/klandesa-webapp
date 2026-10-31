"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  KIND_META,
  isApplicable,
  roleLabel,
  suggestionTitle,
  targetSummary,
  type PersonView,
  type SuggestionView,
  type WorkItemView,
} from "@/lib/kependudukan/labels";
import { ConfidenceBadge } from "./ConfidenceBadge";

function age(birthDate: string): number {
  const b = new Date(`${birthDate}T00:00:00Z`);
  const n = new Date();
  let a = n.getUTCFullYear() - b.getUTCFullYear();
  if (n.getUTCMonth() < b.getUTCMonth() || (n.getUTCMonth() === b.getUTCMonth() && n.getUTCDate() < b.getUTCDate())) a -= 1;
  return Math.max(0, a);
}

function PersonLine({ p, highlight }: { p: PersonView; highlight?: boolean }) {
  const area = [p.rw && `RW ${p.rw}`, p.rt && `RT ${p.rt}`].filter(Boolean).join(" · ");
  return (
    <li className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-1.5 ${highlight ? "font-medium" : ""}`}>
      <span className="text-foreground [overflow-wrap:anywhere]">{p.name}</span>
      <span className="text-sm text-muted-foreground">
        {roleLabel(p.familyRole)} · {age(p.birthDate)} th{area ? ` · ${area}` : ""}
      </span>
      {p.status !== "aktif" ? (
        <span className="rounded border border-slate-300 bg-slate-100 px-1.5 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
          {p.status === "meninggal" ? "Meninggal" : "Sudah pindah"}
        </span>
      ) : null}
    </li>
  );
}

export function WorkItemCard({
  item,
  busy,
  disabled,
  onApply,
  onSkip,
}: {
  item: WorkItemView;
  busy: ReadonlySet<string>;
  /** true saat penerapan massal berjalan: semua tombol dinonaktifkan. */
  disabled: boolean;
  onApply: (item: WorkItemView, s: SuggestionView) => void;
  onSkip: (id: string) => void;
}) {
  const meta = KIND_META[item.kind];
  const people = item.kk && item.members?.length ? item.members : item.residents;
  const headingId = `item-${item.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const hasApplicable = item.suggestions.some(isApplicable);

  return (
    <Card aria-labelledby={headingId}>
      <CardHeader className="pb-2">
        <CardTitle id={headingId} className="text-base">
          {meta.title}
          {item.kk ? <span className="ml-2 text-sm font-normal text-muted-foreground">KK berakhiran {item.kk.slice(-4)}</span> : null}
        </CardTitle>
        <p className="max-w-prose text-sm text-muted-foreground">{meta.help}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        <ul aria-label={item.kk ? "Anggota keluarga" : "Warga terkait"} className="divide-y rounded-md border px-3">
          {people.map((p) => (
            <PersonLine key={p.id} p={p} highlight={item.residents.some((r) => r.id === p.id)} />
          ))}
        </ul>

        {item.suggestions.length > 0 ? (
          <ul aria-label="Saran perbaikan" className="space-y-3">
            {item.suggestions.map((s, idx) => {
              const key = `${item.id}:${s.type}:${s.residentId}`;
              const working = busy.has(key);
              const target = s.type === "SET_KK" ? targetSummary(s.targetKk) : null;
              const members = s.type === "SET_KK" ? s.targetKk?.memberNames.join(", ") : null;
              return (
                <li key={key} className="rounded-md border bg-muted/30 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <ConfidenceBadge confidence={s.confidence} />
                    <span className="font-medium [overflow-wrap:anywhere]">{suggestionTitle(s)}</span>
                  </div>
                  {s.type !== "SET_HEAD" ? (
                    <p className="mt-1 text-sm text-muted-foreground">Untuk: {s.person.name}</p>
                  ) : null}
                  {target ? <p className="text-sm text-muted-foreground">{target}</p> : null}
                  {members ? <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">Anggota: {members}</p> : null}
                  <p className="mt-1 text-sm">Alasan: {s.reason}.</p>

                  {isApplicable(s) ? (
                    <div className="mt-3">
                      <Button
                        type="button"
                        size="lg"
                        variant={idx === 0 ? "default" : "outline"}
                        className="min-h-11 w-full sm:w-auto"
                        disabled={disabled || working}
                        aria-label={`${suggestionTitle(s)}, untuk ${s.person.name}`}
                        onClick={() => onApply(item, s)}
                      >
                        {working ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                        {working ? "Menyimpan…" : "Terapkan saran ini"}
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Ini hanya petunjuk. Ubah hubungan keluarga yang lain lewat{" "}
                      <Link href="/data-warga" className="underline underline-offset-2">
                        Data Warga
                      </Link>
                      .
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Belum ada saran untuk temuan ini. Cocokkan dengan kartu keluarga asli, lalu ubah lewat{" "}
            <Link href="/data-warga" className="underline underline-offset-2">
              Data Warga
            </Link>
            .
          </p>
        )}

        <div className="flex justify-end">
          <Button type="button" variant="ghost" className="min-h-11" disabled={disabled} onClick={() => onSkip(item.id)} aria-label={`Lewati dulu: ${meta.title}`}>
            {hasApplicable ? "Lewati dulu" : "Sembunyikan dulu"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
