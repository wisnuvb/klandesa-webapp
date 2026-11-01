"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Textarea } from "@/components/ui/textarea";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { SELECT_CLASS } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";

export interface FieldDef {
  /** kunci di badan PATCH */
  key: string;
  label: string;
  type: "text" | "date" | "money" | "textarea" | "number" | "select" | "bool";
  /** nilai awal; untuk "bool" gunakan "true"/"false" */
  value: string | null;
  options?: { value: string; label: string }[];
  hint?: string;
  max?: number;
}

/** Dialog isian generik untuk PATCH sebagian pada satu entitas: satu dialog per kelompok isian. */
export function PatchFieldsDialog({ url, title, description, fields, onClose, onDone }: { url: string; title: string; description?: string; fields: FieldDef[]; onClose: () => void; onDone: () => void }) {
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.key, f.value ?? ""])));
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const set = (k: string, v: string) => setVals((o) => ({ ...o, [k]: v }));
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const body = Object.fromEntries(fields.map((f) => [f.key, f.type === "bool" ? vals[f.key] === "true" : vals[f.key]]));
    if (await submit(url, "PATCH", body)) onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">Isi lalu simpan.</DialogDescription>}
        </DialogHeader>
        <form onSubmit={go} className="grid min-w-0 gap-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={Object.fromEntries(fields.map((f) => [f.key, f.label]))} />
          {fields.map((f) => {
            const id = `pd-${f.key}`;
            const err = errors[f.key];
            return (
              <div key={f.key} className="min-w-0 space-y-1.5">
                <Label htmlFor={id}>{f.label}</Label>
                {f.type === "bool" ? (
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-normal">
                    <input type="checkbox" id={id} className="size-5" checked={vals[f.key] === "true"} onChange={(e) => set(f.key, String(e.target.checked))} aria-describedby={f.hint ? `${id}-h` : undefined} />
                    {f.hint ?? "Ya"}
                  </label>
                ) : f.type === "select" ? (
                  <SearchSelect id={id} className={SELECT_CLASS} value={vals[f.key]} onChange={(e) => set(f.key, e.target.value)} aria-invalid={Boolean(err)} aria-describedby={f.hint ? `${id}-h` : undefined}>
                    <option value="">Belum dipilih</option>
                    {(f.options ?? []).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </SearchSelect>
                ) : f.type === "money" ? (
                  <CurrencyInput id={id} inputClassName="h-11" value={vals[f.key]} onValueChange={(v) => set(f.key, v)} aria-invalid={Boolean(err)} aria-describedby={f.hint ? `${id}-h` : undefined} />
                ) : f.type === "textarea" ? (
                  <Textarea id={id} rows={3} maxLength={f.max ?? 500} value={vals[f.key]} onChange={(e) => set(f.key, e.target.value)} aria-invalid={Boolean(err)} aria-describedby={f.hint ? `${id}-h` : undefined} />
                ) : (
                  <Input id={id} className="h-11" type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"} inputMode={f.type === "number" ? "numeric" : undefined} min={f.type === "number" ? 0 : undefined} max={f.type === "number" ? 100 : undefined} maxLength={f.type === "text" ? (f.max ?? 150) : undefined} value={vals[f.key]} onChange={(e) => set(f.key, e.target.value)} aria-invalid={Boolean(err)} aria-describedby={f.hint ? `${id}-h` : undefined} />
                )}
                {f.hint && f.type !== "bool" ? (
                  <p id={`${id}-h`} className="text-xs text-muted-foreground">
                    {f.hint}
                  </p>
                ) : null}
                {err ? <p className="text-sm text-destructive">{err}</p> : null}
              </div>
            );
          })}
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
