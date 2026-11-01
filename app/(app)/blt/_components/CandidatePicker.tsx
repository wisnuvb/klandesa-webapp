"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { SELECT_CLASS } from "@/components/app/perencanaan/shared";
import type { Candidate } from "./types";

export interface PickerValue {
  residentId: number | null;
  source: "PEMERINTAH" | "DESA";
  criteria: number[];
  category: string;
}
export const emptyPicker = (): PickerValue => ({ residentId: null, source: "PEMERINTAH", criteria: [], category: "Miskin ekstrem" });

/** Cari warga lalu tetapkan sumber data, kriteria cadangan, dan kategori. Id elemen diberi awalan agar dapat dipakai dua kali. */
export function CandidatePicker({ programId, idPrefix, criteria, value, onChange, errors }: { programId: number; idPrefix: string; criteria: Record<number, string>; value: PickerValue; onChange: (v: PickerValue) => void; errors: Record<string, string> }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ q: string; rows: Candidate[] } | null>(null);
  const [picked, setPicked] = useState<Candidate | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/blt/${programId}/warga?q=${encodeURIComponent(term)}`, { signal: ctrl.signal, cache: "no-store" })
        .then((r) => r.json().catch(() => null))
        .then((j) => setRes({ q: term, rows: Array.isArray(j?.residents) ? j.residents : [] }))
        .catch(() => undefined);
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, programId]);

  const rows = res && res.q === q.trim() ? res.rows : null;

  return (
    <div className="space-y-3">
      {picked ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/50 p-3 text-sm">
          <div>
            <p className="font-medium">{picked.name}</p>
            <p className="text-muted-foreground">
              NIK {picked.nikMasked ?? "-"} · KK {picked.kk ?? "-"} · {picked.address}
            </p>
          </div>
          <button
            type="button"
            className="min-h-11 rounded-md px-3 text-sm underline underline-offset-4"
            onClick={() => {
              setPicked(null);
              onChange({ ...value, residentId: null });
            }}
          >
            Ganti warga
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-q`}>Cari warga (nama, awalan NIK, atau awalan KK) *</Label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
            <Input id={`${idPrefix}-q`} className="h-11 pl-9" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} aria-invalid={Boolean(errors.residentId)} />
          </div>
          {errors.residentId ? <p className="text-sm text-destructive">{errors.residentId}</p> : null}
          {rows ? (
            rows.length ? (
              <ul className="max-h-56 divide-y overflow-y-auto rounded-md border">
                {rows.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      disabled={c.alreadyIn || Boolean(c.blocked)}
                      className="flex min-h-11 w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => {
                        setPicked(c);
                        onChange({ ...value, residentId: c.id });
                      }}
                    >
                      <span className="font-medium">
                        {c.name} <span className="font-normal text-muted-foreground">({c.familyRole})</span>
                      </span>
                      <span className="text-muted-foreground">
                        NIK {c.nikMasked ?? "-"} · {c.address}
                        {c.occupation ? ` · ${c.occupation}` : ""}
                      </span>
                      {c.alreadyIn ? <span className="text-amber-900">Keluarga ini sudah terdaftar</span> : null}
                      {c.blocked ? <span className="text-destructive">{c.blocked}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada warga yang cocok.</p>
            )
          ) : null}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-src`}>Sumber data penerima *</Label>
          <SearchSelect id={`${idPrefix}-src`} className={SELECT_CLASS} value={value.source} onChange={(e) => onChange({ ...value, source: e.target.value as PickerValue["source"], criteria: [] })}>
            <option value="PEMERINTAH">Data Pemerintah sebagai acuan</option>
            <option value="DESA">Kriteria cadangan Kepala Desa</option>
          </SearchSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-cat`}>Kategori penerima (hasil Musyawarah Desa) *</Label>
          <Input id={`${idPrefix}-cat`} className="h-11" maxLength={100} value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value })} aria-invalid={Boolean(errors.category)} />
        </div>
      </div>
      {value.source === "DESA" ? (
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">Kriteria yang berlaku *</legend>
          {Object.entries(criteria).map(([n, label]) => (
            <label key={n} className="flex min-h-11 cursor-pointer items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={value.criteria.includes(Number(n))} onChange={(e) => onChange({ ...value, criteria: e.target.checked ? [...value.criteria, Number(n)] : value.criteria.filter((x) => x !== Number(n)) })} />
              <span>{label}</span>
            </label>
          ))}
          {errors.criteria ? <p className="text-sm text-destructive">{errors.criteria}</p> : null}
        </fieldset>
      ) : null}
    </div>
  );
}
