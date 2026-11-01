"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { useFormSubmit } from "@/hooks/useFormSubmit";

/** Pembantu tampilan bersama layar Musyawarah Desa dan Siklus RKP Desa. */

export const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-input-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export const fmtDate = (iso: string | null | undefined): string =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "-";

export const rupiah = (v: string | number | null | undefined): string => (v === null || v === undefined || v === "" ? "-" : `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number(v))}`);

const TONE: Record<string, string> = {
  done: "border-emerald-600/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  overdue: "border-destructive/50 bg-destructive/10 text-destructive",
  soon: "border-amber-600/50 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  upcoming: "border-border bg-muted text-muted-foreground",
  open: "border-border bg-muted text-muted-foreground",
  neutral: "border-border bg-muted text-foreground",
  info: "border-sky-600/40 bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-100",
};

/** Lencana status: selalu berteks (warna bukan satu-satunya penanda). */
export function Pill({ tone = "neutral", children }: { tone?: keyof typeof TONE | string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE[tone] ?? TONE.neutral}`}>{children}</span>;
}

export const STEP_STATE_LABEL: Record<string, string> = { done: "Selesai", overdue: "Terlambat", soon: "Segera jatuh tempo", upcoming: "Belum jatuh tempo", open: "Belum dikerjakan" };

export function WarningList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div role="status" className="rounded-md border border-amber-600/50 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-50">
      <p className="flex items-center gap-2 font-medium">
        <AlertTriangle aria-hidden="true" className="size-4" />
        {title}
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-6">
        {items.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </div>
  );
}

/** Dialog satu isian teks wajib (alasan batal / buka kembali) yang mengirim POST/PATCH dan menutup bila berhasil. */
export function ReasonDialog({
  title,
  description,
  label,
  confirm,
  url,
  method = "POST",
  build,
  onClose,
  onDone,
  multiline = true,
}: {
  title: string;
  description?: string;
  label: string;
  confirm: string;
  url: string;
  method?: "POST" | "PATCH" | "DELETE";
  build: (text: string) => unknown;
  onClose: () => void;
  onDone: () => void;
  multiline?: boolean;
}) {
  const [text, setText] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit(url, method, build(text));
    if (r) onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form onSubmit={go} className="space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{}} />
          <div className="space-y-1.5">
            <Label htmlFor="reason-text">{label} *</Label>
            {multiline ? <Textarea id="reason-text" rows={3} maxLength={300} value={text} onChange={(e) => setText(e.target.value)} /> : <Input id="reason-text" className="h-11" maxLength={300} value={text} onChange={(e) => setText(e.target.value)} />}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {confirm}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export interface PickedResident {
  id: number;
  name: string;
  gender: "L" | "P" | null;
  rt: string | null;
  rw: string | null;
}

/** Pencarian warga (nama saja) untuk dipilih sebagai peserta atau anggota tim. Tanpa setState sinkron di efek. */
export function ResidentPicker({ onPick, disabled }: { onPick: (r: PickedResident) => void; disabled?: boolean }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ q: string; rows: PickedResident[] } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    timer.current = setTimeout(() => {
      fetch(`/api/musdes/warga?q=${encodeURIComponent(term)}`, { signal: ctrl.signal, cache: "no-store" })
        .then((r) => r.json().catch(() => null))
        .then((j) => setRes({ q: term, rows: Array.isArray(j?.residents) ? j.residents : [] }))
        .catch(() => undefined);
    }, 250);
    return () => {
      ctrl.abort();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  const rows = res && res.q === q.trim() ? res.rows : [];
  return (
    <div className="space-y-2">
      <Label htmlFor="resident-picker">Cari dari data warga (nama)</Label>
      <Input id="resident-picker" className="h-11" value={q} disabled={disabled} placeholder="Ketik minimal 2 huruf nama" onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      {q.trim().length >= 2 ? (
        rows.length ? (
          <ul className="max-h-48 divide-y overflow-y-auto rounded-md border" aria-label="Hasil pencarian warga">
            {rows.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  onClick={() => {
                    onPick(r);
                    setQ("");
                  }}
                >
                  <span>{r.name}</span>
                  <span className="text-muted-foreground">
                    {r.gender === "P" ? "Perempuan" : r.gender === "L" ? "Laki-laki" : ""}
                    {r.rt || r.rw ? ` · RT ${r.rt ?? "-"}/RW ${r.rw ?? "-"}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : res && res.q === q.trim() ? (
          <p className="text-sm text-muted-foreground">Tidak ada warga yang cocok. Anda tetap bisa mengetik nama peserta secara manual.</p>
        ) : null
      ) : null}
    </div>
  );
}
