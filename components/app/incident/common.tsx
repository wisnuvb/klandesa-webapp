"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Textarea } from "@/components/ui/textarea";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { SELECT_CLASS } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";

/** Waktu ISO → "1 Nov 2026 08.30" menurut zona perangkat. */
export const fmtDateTime = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

/** ISO → nilai <input type="datetime-local"> (waktu setempat). */
export function toLocalInput(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
/** Nilai datetime-local → ISO UTC lengkap (server mewajibkan zona). Kosong/tidak valid → "". */
export function fromLocalInput(v: string): string {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export const STATUS_TONE: Record<string, string> = { OPEN: "info", RESPONDING: "soon", RESOLVED: "done", CLOSED: "neutral", CANCELLED: "neutral" };
export const SEVERITY_TONE: Record<string, string> = { LOW: "neutral", MEDIUM: "info", HIGH: "soon", CRITICAL: "overdue" };

export interface Field {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "datetime" | "select";
  options?: [string, string][];
  required?: boolean;
  max?: number;
  hint?: string;
  /** setengah lebar pada layar lebar */
  half?: boolean;
  inputMode?: "decimal" | "numeric";
}

/** Dialog formulir berbasis daftar kolom: dipakai untuk semua isian sederhana modul ini. */
export function FormDialog({ title, description, fields, initial, url, method, transform, onClose, onDone, submitText = "Simpan", children }: { title: string; description?: string; fields: Field[]; initial: Record<string, string>; url: string; method: "POST" | "PATCH" | "PUT"; transform?: (v: Record<string, string>) => Record<string, unknown>; onClose: () => void; onDone: (r: Record<string, unknown>) => void; submitText?: string; children?: React.ReactNode }) {
  const [v, setV] = useState<Record<string, string>>(initial);
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const set = (k: string, val: string) => setV((s) => ({ ...s, [k]: val }));
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = { ...v };
    for (const f of fields) if (f.type === "datetime") body[f.key] = fromLocalInput(v[f.key] ?? "");
    const r = await submit<Record<string, unknown>>(url, method, transform ? transform(body as Record<string, string>) : body);
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
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={Object.fromEntries(fields.map((f) => [f.key, f.label]))} />
          {children}
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            {fields.map((f) => {
              const id = `bf-${f.key}`;
              const err = errors[f.key];
              const wide = !f.half && f.type !== "date" && f.type !== "number" && f.type !== "select" && f.type !== "datetime";
              return (
                <div key={f.key} className={`min-w-0 space-y-1.5 ${wide || f.type === "textarea" ? "sm:col-span-2" : ""}`}>
                  <Label htmlFor={id}>
                    {f.label}
                    {f.required ? " *" : ""}
                  </Label>
                  {f.type === "textarea" ? (
                    <Textarea id={id} rows={3} maxLength={f.max} value={v[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} aria-invalid={Boolean(err)} aria-describedby={f.hint ? `${id}-h` : undefined} />
                  ) : f.type === "select" ? (
                    <SearchSelect id={id} className={SELECT_CLASS} value={v[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} aria-invalid={Boolean(err)}>
                      {(f.options ?? []).map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </SearchSelect>
                  ) : (
                    <Input id={id} className="h-11" type={f.type === "datetime" ? "datetime-local" : f.type === "date" ? "date" : "text"} inputMode={f.type === "number" ? "numeric" : f.inputMode} maxLength={f.max} value={v[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} aria-invalid={Boolean(err)} aria-describedby={f.hint ? `${id}-h` : undefined} />
                  )}
                  {f.hint ? (
                    <p id={`${id}-h`} className="text-xs text-muted-foreground">
                      {f.hint}
                    </p>
                  ) : null}
                  {err ? <p className="text-sm text-destructive">{err}</p> : null}
                </div>
              );
            })}
          </div>
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

/** Dialog satu catatan (alasan/ringkasan) untuk perpindahan status. `required` hanya menandai bintang; server yang memutuskan. */
export function NoteDialog({ title, description, label, confirm, required, url, build, onClose, onDone }: { title: string; description?: string; label: string; confirm: string; required: boolean; url: string; build: (note: string) => unknown; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (await submit(url, "POST", build(note))) onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form onSubmit={go} className="space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ to: "Status", note: "Catatan" }} />
          <div className="space-y-1.5">
            <Label htmlFor="nd-note">
              {label}
              {required ? " *" : ""}
            </Label>
            <Textarea id="nd-note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
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

/** Kotak pencarian bertahap (debounce) dengan hasil yang dapat dipilih. Hasil hanya memuat data tersamar dari server. */
export function SearchPick<T extends { id: number | string }>({ id, label, url, render, onPick, hint }: { id: string; label: string; url: (q: string) => string; render: (row: T) => React.ReactNode; onPick: (row: T) => void; hint?: string }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ q: string; rows: T[]; failed: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) return;
    const ctrl = new AbortController();
    timer.current = setTimeout(() => {
      fetch(url(term), { signal: ctrl.signal, cache: "no-store" })
        .then(async (r) => ({ ok: r.ok, j: await r.json().catch(() => null) }))
        .then(({ ok, j }) => setRes({ q: term, rows: ok && Array.isArray(j?.rows) ? j.rows : [], failed: !ok }))
        .catch((e) => {
          if ((e as Error).name !== "AbortError") setRes({ q: term, rows: [], failed: true });
        });
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  const shown = res && res.q === q.trim() ? res : null;
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input id={id} className="h-11 pl-9" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} autoComplete="off" aria-describedby={`${id}-h`} />
      </div>
      <p id={`${id}-h`} className="text-xs text-muted-foreground">
        {hint ?? "Ketik minimal 3 huruf."}
      </p>
      {shown?.failed ? (
        <p role="alert" className="text-sm text-destructive">
          Pencarian gagal. Anda mungkin tidak berhak mencari data warga.
        </p>
      ) : null}
      {shown && !shown.failed && !shown.rows.length ? <p className="text-sm text-muted-foreground">Tidak ditemukan.</p> : null}
      {shown?.rows.length ? (
        <ul className="divide-y rounded-md border">
          {shown.rows.map((r) => (
            <li key={r.id}>
              <button type="button" className="min-h-11 w-full break-words px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none" onClick={() => onPick(r)}>
                {render(r)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function Loading({ text }: { text: string }) {
  return (
    <p role="status" className="flex items-center gap-2 text-muted-foreground">
      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
      {text}
    </p>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-md border border-destructive p-4 text-destructive">
      {message}
    </div>
  );
}

export const opt = (rec: Record<string, string>): [string, string][] => Object.entries(rec);
