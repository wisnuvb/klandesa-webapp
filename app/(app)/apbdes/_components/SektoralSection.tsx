"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { MoneyInput } from "./MoneyInput";
import { money, type Overview } from "./shared";

interface Program {
  id: number;
  programName: string;
  activityKind: string;
  location: string | null;
  volume: string;
  unit: string;
  amount: string;
  fundSource: string;
}

const LABELS = { programName: "Program", activityKind: "Jenis kegiatan", location: "Lokasi", volume: "Volume", unit: "Satuan", amount: "Jumlah", fundSource: "Sumber dana" };
const EMPTY = { programName: "", activityKind: "", location: "", volume: "", unit: "", amount: "", fundSource: "" };

/** Daftar program sektoral/daerah/lain yang masuk ke desa (Lampiran T.4). */
export function SektoralSection({ o }: { o: Overview }) {
  const { data, reload } = useApiGet<{ programs: Program[] }>(`/api/apbdes/sektoral?year=${o.year}`);
  const [f, setF] = useState(EMPTY);
  const add = useFormSubmit();
  const del = useFormSubmit();
  const set = (k: keyof typeof EMPTY, v: string) => setF((p) => ({ ...p, [k]: v }));
  return (
    <section aria-labelledby="sk-h" className="space-y-3 rounded-lg border p-4">
      <h2 id="sk-h" className="text-lg font-semibold">Program sektoral, daerah, dan lainnya yang masuk ke desa</h2>
      <FormErrorSummary innerRef={del.summaryRef} errors={{}} general={del.general} labels={{}} />
      {data && data.programs.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada program tercatat untuk {o.year}.</p> : null}
      <ul className="space-y-2">
        {data?.programs.map((p) => (
          <li key={p.id} className="flex items-start justify-between gap-2 rounded-md border p-3 text-sm">
            <p className="min-w-0 break-words">{p.programName} · {p.activityKind}{p.location ? ` · ${p.location}` : ""} · {p.volume.replace(/\.00$/, "")} {p.unit} · {money(p.amount)} · {p.fundSource}</p>
            {o.can.delete ? <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" aria-label={`Hapus ${p.programName}`} disabled={del.busy} onClick={async () => { if (await del.submit(`/api/apbdes/sektoral?id=${p.id}`, "DELETE", undefined, "Gagal menghapus. Coba lagi.")) reload(); }}><Trash2 aria-hidden="true" /></Button> : null}
          </li>
        ))}
      </ul>
      {o.can.create ? (
        <form
          noValidate
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await add.submit("/api/apbdes/sektoral", "POST", { year: o.year, ...f })) {
              setF(EMPTY);
              reload();
            }
          }}
        >
          <div className="sm:col-span-2"><FormErrorSummary innerRef={add.summaryRef} errors={add.errors} general={add.general} labels={LABELS} /></div>
          {(["programName", "activityKind", "location", "fundSource", "unit"] as const).map((k) => (
            <div key={k} className="space-y-1.5">
              <Label htmlFor={`sk-${k}`}>{LABELS[k]}{k === "location" ? "" : " *"}</Label>
              <Input {...fieldA11y(`sk-${k}`, add.errors[k])} className="h-11" maxLength={k === "unit" ? 30 : 200} value={f[k]} onChange={(e) => set(k, e.target.value)} />
              <FieldError id={`sk-${k}`} message={add.errors[k]} />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor="sk-volume">Volume *</Label>
            <Input {...fieldA11y("sk-volume", add.errors.volume)} className="h-11" inputMode="decimal" value={f.volume} onChange={(e) => set("volume", e.target.value.replace(",", "."))} />
            <FieldError id="sk-volume" message={add.errors.volume} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sk-amount">Jumlah *</Label>
            <MoneyInput id="sk-amount" value={f.amount} onChange={(v) => set("amount", v)} invalid={Boolean(add.errors.amount)} describedBy={add.errors.amount ? "sk-amount-err" : undefined} />
            <FieldError id="sk-amount" message={add.errors.amount} />
          </div>
          <div className="sm:col-span-2"><Button type="submit" className="min-h-11" disabled={add.busy}>{add.busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}Tambah program</Button></div>
        </form>
      ) : null}
    </section>
  );
}
