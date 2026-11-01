"use client";

import { useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Textarea } from "@/components/ui/textarea";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { SELECT_CLASS } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { SearchPick } from "@/components/app/incident/common";
import type { Finding } from "./types";

/** Tanggal "2026-11-01" → "1 Nov 2026" tanpa pergeseran zona (kolom DATE). */
export function fmtDay(iso: string | null | undefined): string {
  if (!iso) return "-";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
/** "2026-11-01" → "Sen, 1 Nov". */
export function fmtDayShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export const where = (r: { rw: string | null; rt: string | null; hamlet?: string | null }) => [r.hamlet ? `Dusun ${r.hamlet}` : null, r.rw ? `RW ${r.rw}${r.rt ? `/RT ${r.rt}` : ""}` : null].filter(Boolean).join(", ");
export const s = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));

/** Daftar temuan: ikon + teks (status tidak hanya warna). */
export function Findings({ items, label }: { items: Finding[]; label: string }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-1.5" aria-label={label}>
      {items.map((f, i) => (
        <li key={`${f.code}-${i}`} className={`flex items-start gap-2 rounded-md border p-2.5 text-sm ${f.level === "WARN" ? "border-amber-600/50 bg-amber-50 text-amber-950" : "border-sky-600/40 bg-sky-50 text-sky-950"}`}>
          {f.level === "WARN" ? <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
          <span className="min-w-0 break-words">
            <span className="sr-only">{f.level === "WARN" ? "Perlu diperiksa: " : "Catatan: "}</span>
            {f.message}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Item({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="break-words">{v}</dd>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">{children}</p>;
}

/** Menjalankan aksi (POST/PATCH tanpa formulir) dan menampilkan galat server di dekat tombolnya. */
export function useAction(onDone: () => void) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function run(key: string, url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<Record<string, unknown> | null> {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof j?.error === "string" ? j.error : "Gagal menyimpan. Coba lagi.");
        return null;
      }
      onDone();
      return (j ?? {}) as Record<string, unknown>;
    } catch {
      setError("Tidak bisa terhubung. Periksa koneksi lalu coba lagi.");
      return null;
    } finally {
      setBusy(null);
    }
  }
  return { busy, error, run, clear: () => setError(null) };
}

export function ActionError({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

export interface ResidentHit {
  id: number;
  name: string;
  rt: string | null;
  rw: string | null;
}

/** Pemilih warga (cari nama minimal 3 huruf): tanpa NIK/KK/telepon. Menampilkan pilihan dengan tombol Ganti. */
export function ResidentField({ id, label, value, onChange, hint }: { id: string; label: string; value: ResidentHit | null; onChange: (r: ResidentHit | null) => void; hint?: string }) {
  if (value) {
    return (
      <div className="min-w-0 space-y-1.5">
        <p className="text-sm font-medium">{label}</p>
        <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 p-3">
          <p className="min-w-0 break-words text-sm">
            <span className="font-medium">{value.name}</span>
            {value.rw ? ` · RW ${value.rw}${value.rt ? `/RT ${value.rt}` : ""}` : ""}
          </p>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => onChange(null)}>
            Ganti
          </Button>
        </div>
      </div>
    );
  }
  return <SearchPick<ResidentHit> id={id} label={label} hint={hint ?? "Ketik minimal 3 huruf nama warga."} url={(q) => `/api/keamanan/warga?q=${encodeURIComponent(q)}`} render={(r) => <>{r.name}{r.rw ? ` · RW ${r.rw}${r.rt ? `/RT ${r.rt}` : ""}` : ""}</>} onPick={onChange} />;
}

export const STATUS_TONE: Record<string, string> = { OPEN: "info", RESPONDING: "soon", RESOLVED: "done", CLOSED: "neutral", CANCELLED: "neutral" };

/**
 * Cangkang dialog formulir untuk isian yang butuh pemilih khusus (warga, dsb.). Keadaan isian ada di pemanggil; `body` dikirim apa adanya.
 * `children` menerima galat per kolom agar pesan bisa ditaruh di dekat kolomnya (ringkasan galat tetap di atas).
 */
export function FormShell({ title, description, labels, url, method = "POST", body, onClose, onDone, submitText = "Simpan", children }: { title: string; description?: string; labels: Record<string, string>; url: string; method?: "POST" | "PATCH"; body: () => unknown; onClose: () => void; onDone: (r: Record<string, unknown>) => void; submitText?: string; children: (errors: Record<string, string>) => React.ReactNode }) {
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit<Record<string, unknown>>(url, method, body());
    if (r) onDone(r);
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form onSubmit={go} className="min-w-0 space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={labels} />
          {children(errors)}
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {submitText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Kolom teks/area/tanggal/angka dengan label terlihat, petunjuk, dan galat di bawahnya. */
export function Field({ id, label, value, onChange, error, hint, type = "text", required, max, rows, inputMode }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string; type?: "text" | "date" | "datetime-local" | "textarea"; required?: boolean; max?: number; rows?: number; inputMode?: "numeric" | "decimal" }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>
      {type === "textarea" ? (
        <Textarea id={id} rows={rows ?? 3} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={hint ? `${id}-h` : undefined} />
      ) : (
        <Input id={id} className="h-11" type={type} inputMode={inputMode} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={hint ? `${id}-h` : undefined} />
      )}
      {hint ? (
        <p id={`${id}-h`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

/** Pilihan dari daftar tertutup (dapat dicari) lewat SearchSelect. */
export function Pick({ id, label, value, onChange, options, error, required, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; options: [string, string][]; error?: string; required?: boolean; hint?: string }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>
      <SearchSelect id={id} className={SELECT_CLASS} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error)}>
        {options.map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </SearchSelect>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

/** Kotak centang dengan target sentuh 44px. */
export function Check({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input id={id} type="checkbox" className="size-5" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <Label htmlFor={id} className="min-h-11 flex-1 content-center">
        {label}
      </Label>
    </div>
  );
}

export const opt = (rec: Record<string, string>): [string, string][] => Object.entries(rec);
