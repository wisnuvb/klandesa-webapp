"use client";

import { useEffect, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { Pill, SELECT_CLASS, rupiah } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import type { Candidate, TabProps } from "./types";

export function WorkersTab({ data, reload }: TabProps) {
  const a = data.activity;
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ q: string; rows: Candidate[] } | null>(null);
  const [picked, setPicked] = useState<Candidate | null>(null);
  const [manual, setManual] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [priority, setPriority] = useState("PENGANGGUR");
  const [err, setErr] = useState<string | null>(null);
  const form = useFormSubmit();
  const canAdd = data.can.create && a.status === "AKTIF";

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2 || manual) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/pktd/${a.id}/warga?q=${encodeURIComponent(term)}`, { signal: ctrl.signal, cache: "no-store" })
        .then((r) => r.json().catch(() => null))
        .then((j) => setRes({ q: term, rows: Array.isArray(j?.residents) ? j.residents : [] }))
        .catch(() => undefined);
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, a.id, manual]);
  const rows = res && res.q === q.trim() ? res.rows : null;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const body = manual ? { name, gender: gender || null, priority } : { residentId: picked?.id, gender: gender || null, priority };
    const r = await form.submit(`/api/pktd/${a.id}/pekerja`, "POST", body);
    if (r) {
      setPicked(null);
      setQ("");
      setName("");
      reload();
    }
  }
  async function remove(id: number) {
    setErr(null);
    const res2 = await fetch(`/api/pktd/${a.id}/pekerja/${id}`, { method: "DELETE" }).catch(() => null);
    if (res2?.ok) return reload();
    const j = await res2?.json().catch(() => null);
    setErr(typeof j?.error === "string" ? j.error : "Gagal menghapus.");
  }

  return (
    <>
      <section aria-labelledby="wk-h" className="space-y-3">
        <h2 id="wk-h" className="text-lg font-semibold">
          Daftar pekerja
        </h2>
        <p className="text-sm text-muted-foreground">Pekerja diprioritaskan dari penganggur, setengah penganggur, perempuan kepala keluarga, anggota keluarga miskin, dan masyarakat marginal; libatkan juga penyandang disabilitas (Lampiran II.F.2–3).</p>
        {err ? (
          <p role="alert" className="text-sm text-destructive">
            {err}
          </p>
        ) : null}
        {a.workers.length ? (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[34rem] text-sm">
              <caption className="sr-only">Pekerja kegiatan</caption>
              <thead className="bg-muted text-left">
                <tr>
                  <th scope="col" className="px-3 py-2">Nama</th>
                  <th scope="col" className="px-3 py-2">Kelompok</th>
                  <th scope="col" className="px-3 py-2 text-right">Hari kerja</th>
                  <th scope="col" className="px-3 py-2 text-right">Upah</th>
                  {data.can.delete ? (
                    <th scope="col" className="px-3 py-2">
                      <span className="sr-only">Aksi</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y">
                {a.workers.map((w) => (
                  <tr key={w.id}>
                    <td className="px-3 py-2">
                      {w.name} {w.gender ? <span className="text-muted-foreground">({w.gender})</span> : null}
                    </td>
                    <td className="px-3 py-2">
                      <Pill tone={w.isPriority ? "done" : "neutral"}>{w.priorityLabel}</Pill>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{w.days}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{rupiah(w.totalWage)}</td>
                    {data.can.delete ? (
                      <td className="px-3 py-1 text-right">
                        {w.days === 0 ? (
                          <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Hapus ${w.name} dari daftar pekerja`} onClick={() => remove(w.id)}>
                            <Trash2 aria-hidden="true" />
                          </Button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada pekerja terdaftar.</p>
        )}
      </section>

      {canAdd ? (
        <form onSubmit={add} className="space-y-3 rounded-lg border p-4" noValidate>
          <h2 className="text-lg font-semibold">Tambah pekerja</h2>
          <FormErrorSummary innerRef={form.summaryRef} errors={form.errors} general={form.general} labels={{ residentId: "Warga", name: "Nama", priority: "Kelompok", gender: "Jenis kelamin" }} />
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="size-5" checked={manual} onChange={(e) => { setManual(e.target.checked); setPicked(null); }} />
            Pekerja belum ada di data warga (isi nama sendiri)
          </label>
          {manual ? (
            <div className="space-y-1.5">
              <Label htmlFor="wk-name">Nama pekerja *</Label>
              <Input id="wk-name" className="h-11" maxLength={255} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(form.errors.name)} />
            </div>
          ) : picked ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/50 p-3 text-sm">
              <div>
                <p className="font-medium">{picked.name}</p>
                <p className="text-muted-foreground">{[picked.address, picked.occupation].filter(Boolean).join(" · ") || "-"}</p>
              </div>
              <button type="button" className="min-h-11 rounded-md px-3 text-sm underline underline-offset-4" onClick={() => setPicked(null)}>
                Ganti warga
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="wk-q">Cari warga (nama) *</Label>
              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
                <Input id="wk-q" className="h-11 pl-9" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
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
                            setGender(c.gender ?? "");
                          }}
                        >
                          <span className="font-medium">{c.name}</span>
                          <span className="text-muted-foreground">{[c.address, c.occupation].filter(Boolean).join(" · ")}</span>
                          {c.alreadyIn ? <span className="text-amber-900">Sudah terdaftar</span> : null}
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
              <Label htmlFor="wk-pr">Kelompok pekerja *</Label>
              <SearchSelect id="wk-pr" className={SELECT_CLASS} value={priority} onChange={(e) => setPriority(e.target.value)}>
                {a.terms.priorities.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </SearchSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wk-g">Jenis kelamin</Label>
              <SearchSelect id="wk-g" className={SELECT_CLASS} value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">— Tidak diisi —</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </SearchSelect>
            </div>
          </div>
          <Button type="submit" className="min-h-11" disabled={form.busy || (!manual && !picked) || (manual && !name.trim())}>
            {form.busy ? "Menyimpan…" : "Tambahkan pekerja"}
          </Button>
        </form>
      ) : a.status === "SELESAI" ? (
        <p className="text-sm text-muted-foreground">Kegiatan sudah selesai; pekerja tidak dapat ditambah.</p>
      ) : null}
    </>
  );
}
