"use client";

import { AlertTriangle, Info, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { useFormSubmit } from "@/hooks/useFormSubmit";

/** Rupiah dengan sen hanya bila ada (jurnal dapat memuat pecahan). */
export const rp = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined || v === "") return "-";
  const n = Number(v);
  return `${n < 0 ? "−" : ""}Rp${new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Math.abs(n))}`;
};

export const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-input-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
export const INPUT_CLASS = "h-11";

export type Finding = { level: "ERROR" | "WARN" | "INFO"; message: string; ref?: string };

const LEVELS = {
  ERROR: { title: "Perlu diperbaiki", box: "border-destructive/50 bg-destructive/10 text-destructive", Icon: XCircle, role: "alert" },
  WARN: { title: "Perlu diperiksa", box: "border-amber-600/50 bg-amber-50 text-amber-950", Icon: AlertTriangle, role: "status" },
  INFO: { title: "Catatan", box: "border-sky-600/40 bg-sky-50 text-sky-950", Icon: Info, role: "status" },
} as const;

/** Temuan berkelompok per tingkat; selalu berteks dan berikon (warna bukan satu-satunya penanda). */
export function Findings({ items }: { items: Finding[] }) {
  return (
    <>
      {(["ERROR", "WARN", "INFO"] as const).map((lv) => {
        const list = items.filter((f) => f.level === lv);
        if (!list.length) return null;
        const { title, box, Icon, role } = LEVELS[lv];
        return (
          <div key={lv} role={role} className={`rounded-md border p-3 text-sm ${box}`}>
            <p className="flex items-center gap-2 font-medium">
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {title}
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-6">
              {list.map((f) => (
                <li key={f.message} className="break-words">
                  {f.message}
                  {f.ref ? <span className="block text-xs opacity-80">{f.ref}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}

export function StatusPill({ tone, children }: { tone: "ok" | "off" | "warn"; children: React.ReactNode }) {
  const cls = tone === "ok" ? "border-emerald-600/40 bg-emerald-50 text-emerald-900" : tone === "warn" ? "border-amber-600/50 bg-amber-50 text-amber-900" : "border-border bg-muted text-muted-foreground";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">{children}</p>;
}

export function Busy({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="flex items-center gap-2 text-muted-foreground">
      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
      {children}
    </p>
  );
}

/** Dialog satu isian alasan (wajib) untuk koreksi, pembatalan, dan pembukaan kembali periode. */
export function ReasonDialog({ title, description, confirmLabel, url, method = "POST", extraBody, destructive, onClose, onDone }: { title: string; description: React.ReactNode; confirmLabel: string; url: string; method?: "POST" | "PATCH"; extraBody?: Record<string, unknown>; destructive?: boolean; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (await submit(url, method, { ...extraBody, reason })) onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="break-words">{description}</div>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="min-w-0 space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ reason: "Alasan" }} />
          <div className="space-y-1.5">
            <Label htmlFor="bd-reason">Alasan *</Label>
            <Textarea id="bd-reason" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={Boolean(errors.reason)} aria-describedby="bd-reason-help" />
            <p id="bd-reason-help" className="text-xs text-muted-foreground">
              Minimal 5 karakter. Alasan tersimpan permanen di riwayat.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" variant={destructive ? "destructive" : "default"} className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
