"use client";

import Link from "next/link";
import { AlertTriangle, CircleAlert, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { rupiah } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { PengaduanCard } from "./PengaduanCard";
import { useState } from "react";
import type { TabProps } from "./types";

const LEVEL = {
  ERROR: { label: "Perlu diperbaiki", Icon: CircleAlert, box: "border-destructive/50 bg-destructive/10 text-destructive" },
  WARN: { label: "Perlu diperiksa", Icon: AlertTriangle, box: "border-amber-600/50 bg-amber-50 text-amber-950" },
  INFO: { label: "Catatan", Icon: Info, box: "border-sky-600/40 bg-sky-50 text-sky-950" },
} as const;

const pct = (bps: number | null) => (bps === null ? "-" : `${(bps / 100).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`);

export function SummaryTab({ data, year, reload }: TabProps) {
  const a = data.analysis;
  const [regular, setRegular] = useState<string | null>(null);
  const [kdmp, setKdmp] = useState<string | null>(null);
  const [mandiri, setMandiri] = useState<boolean | null>(null);
  const form = useFormSubmit();
  const val = (edited: string | null, saved: string | null) => edited ?? (saved ? String(Math.round(Number(saved))) : "");
  const dirty = regular !== null || kdmp !== null || mandiri !== null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = { year };
    if (regular !== null) body.regular = regular;
    if (kdmp !== null) body.kdmp = kdmp;
    if (mandiri !== null) body.isMandiri = mandiri;
    const r = await form.submit("/api/dana-desa", "PUT", body);
    if (r) {
      setRegular(null);
      setKdmp(null);
      setMandiri(null);
      reload();
    }
  }

  return (
    <>
      <section aria-labelledby="dd-pagu-h" className="space-y-3">
        <h2 id="dd-pagu-h" className="text-lg font-semibold">
          Pagu Dana Desa {year}
        </h2>
        <p className="text-sm text-muted-foreground">
          Isi dari keputusan pagu yang berlaku untuk Desa Anda. Pagu reguler menjadi dasar batas operasional Pemerintah Desa ({data.rules.operationalCapPct}%); dukungan KDMP dihitung terpisah (sekitar {data.rules.kdmpSharePct.toLocaleString("id-ID")}% dari pagu Dana Desa semula, sebelum penyesuaian antar-Desa). Penyaluran, angsuran, dan progres gerai KDMP dipantau di{" "}
          <Link href="/kdmp" className="underline underline-offset-4">
            Dukungan KDMP
          </Link>
          .
        </p>
        {data.can.update ? (
          <form onSubmit={save} className="space-y-3 rounded-lg border p-4" noValidate>
            <FormErrorSummary innerRef={form.summaryRef} errors={form.errors} general={form.general} labels={{ regular: "Pagu reguler", kdmp: "Pagu KDMP" }} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="dd-regular">Pagu Dana Desa reguler</Label>
                <CurrencyInput id="dd-regular" inputClassName="h-11" value={val(regular, data.setting.regular)} onValueChange={setRegular} aria-invalid={Boolean(form.errors.regular)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dd-kdmp">Pagu dukungan KDMP</Label>
                <CurrencyInput id="dd-kdmp" inputClassName="h-11" value={val(kdmp, data.setting.kdmp)} onValueChange={setKdmp} aria-invalid={Boolean(form.errors.kdmp)} />
              </div>
            </div>
            <label className="flex min-h-11 w-fit cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="size-5" checked={mandiri ?? data.setting.isMandiri} onChange={(e) => setMandiri(e.target.checked)} />
              Desa berstatus mandiri (Indeks Desa): penyaluran tahap I 60% dan tahap II 40%
            </label>
            <Button type="submit" className="min-h-11" disabled={form.busy || !dirty}>
              {form.busy ? "Menyimpan…" : "Simpan pagu"}
            </Button>
          </form>
        ) : (
          <p className="text-sm">
            Pagu reguler {data.setting.regular ? rupiah(data.setting.regular) : "belum diisi"}; KDMP {data.setting.kdmp ? rupiah(data.setting.kdmp) : "belum diisi"}.
          </p>
        )}
      </section>

      <section aria-labelledby="dd-find-h" className="space-y-3">
        <h2 id="dd-find-h" className="text-lg font-semibold">
          Hasil pemeriksaan
        </h2>
        {!data.apbdes ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada APB Desa untuk tahun {year}. Susun di menu APBDes; kegiatan bersumber Dana Desa (kode sumber DD) tampil di sini.</p> : null}
        {data.apbdes && !a.findings.length ? <p role="status" className="rounded-md border border-emerald-600/40 bg-emerald-50 p-3 text-sm text-emerald-900">Tidak ada temuan pada {data.apbdes.label}.</p> : null}
        {(["ERROR", "WARN", "INFO"] as const).map((lv) => {
          const items = a.findings.filter((f) => f.level === lv);
          if (!items.length) return null;
          const { label, Icon, box } = LEVEL[lv];
          return (
            <div key={lv} role={lv === "ERROR" ? "alert" : "status"} className={`rounded-md border p-3 text-sm ${box}`}>
              <p className="flex items-center gap-2 font-medium">
                <Icon aria-hidden="true" className="size-4" />
                {label} ({items.length})
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-6">
                {items.map((f) => (
                  <li key={f.code}>
                    {f.message}
                    {f.ref ? <span className="block text-xs opacity-80">Dasar: {f.ref}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      {data.apbdes ? (
        <>
          <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[
              ["Dana Desa dianggarkan", rupiah(a.total)],
              ["Operasional Pemerintah Desa", `${rupiah(a.operational)} (${pct(a.operationalBps)})`],
              ["Batas operasional", a.operationalCap ? rupiah(a.operationalCap) : "Isi pagu reguler"],
              ["Dukungan KDMP dianggarkan", rupiah(a.kdmpBudget)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="text-lg font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>

          <section aria-labelledby="dd-focus-h" className="space-y-3">
            <h2 id="dd-focus-h" className="text-lg font-semibold">
              Sebaran per fokus penggunaan
            </h2>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[34rem] text-sm">
                <caption className="sr-only">Anggaran Dana Desa per fokus penggunaan</caption>
                <thead className="bg-muted text-left">
                  <tr>
                    <th scope="col" className="px-3 py-2">Fokus</th>
                    <th scope="col" className="px-3 py-2 text-right">Kegiatan</th>
                    <th scope="col" className="px-3 py-2 text-right">Anggaran</th>
                    <th scope="col" className="px-3 py-2 text-right">Porsi belanja</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {a.byFocus.map((f) => (
                    <tr key={f.focus} className={f.activities ? "" : "text-muted-foreground"}>
                      <td className="px-3 py-2">
                        {f.letter ? <span className="mr-1 font-medium">{f.letter}.</span> : null}
                        {f.label}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{f.activities}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{rupiah(f.budget)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        <span className="inline-flex items-center justify-end gap-2">
                          <span aria-hidden="true" className="hidden h-2 w-20 overflow-hidden rounded-full bg-muted sm:inline-block">
                            <span className="block h-full bg-emerald-600" style={{ width: `${Math.min(100, f.shareBps / 100)}%` }} />
                          </span>
                          {pct(f.shareBps)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.activities.some((x) => !x.focus) ? <p className="text-sm text-muted-foreground">{data.activities.filter((x) => !x.focus).length} kegiatan belum ditandai (lihat tab Fokus kegiatan); anggarannya belum masuk sebaran di atas.</p> : null}
          </section>
        </>
      ) : null}

      <PengaduanCard />
    </>
  );
}
