"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, FileUp, Loader2, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { Pill, SELECT_CLASS, fmtDate } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { ImportDialog } from "./ImportDialog";
import { fmtScore, type Resp } from "./types";

export function IdmView() {
  const [year, setYear] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const { data, loading, error, reload } = useApiGet<Resp>(`/api/idm${year ? `?year=${year}` : ""}`);
  const cur = data?.years.find((y) => y.year === data.selectedYear) ?? null;
  const rec = data?.recommendation ?? null;

  return (
    <div className="space-y-6 pb-24">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Indeks Desa Membangun</h1>
        <p className="max-w-3xl text-muted-foreground">Impor berkas IDM desa Anda untuk melihat skor, status, perkembangan antar tahun, dan indikator terendah sebagai bahan Musyawarah Desa Penyusunan RKP Desa. Fokus penggunaan Dana Desa diutamakan berdasarkan rekomendasi Indeks Desa.</p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        {data && data.years.length ? (
          <div className="space-y-1.5">
            <Label htmlFor="idm-year-filter">Tahun</Label>
            <SearchSelect id="idm-year-filter" className={`${SELECT_CLASS} w-32`} value={String(data.selectedYear ?? "")} onChange={(e) => setYear(Number(e.target.value))}>
              {data.years.map((y) => (
                <option key={y.year} value={y.year}>
                  {y.year}
                </option>
              ))}
            </SearchSelect>
          </div>
        ) : null}
        {data?.can.create ? (
          <Button type="button" className="min-h-11" onClick={() => setImporting(true)}>
            <FileUp aria-hidden="true" />
            Impor berkas IDM
          </Button>
        ) : null}
        {data?.can.delete && cur ? <ConfirmDelete label={`Hapus data IDM ${cur.year}`} title={`Hapus data IDM ${cur.year}?`} description="Skor dan seluruh indikator tahun ini dihapus dari Klandesa. Berkas aslinya tidak terpengaruh dan dapat diimpor lagi." url={`/api/idm/${cur.year}`} onDone={() => { setYear(null); reload(); }} buttonText={`Hapus data ${cur.year}`} /> : null}
      </div>

      {loading && !data ? (
        <p role="status" className="flex items-center gap-2 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Memuat data IDM…
        </p>
      ) : null}
      {error ? (
        <div role="alert" className="rounded-md border border-destructive p-4 text-destructive">
          {error}
        </div>
      ) : null}

      {data && !data.years.length ? (
        <section className="space-y-2 rounded-lg border border-dashed p-6 text-sm">
          <p className="font-medium">Belum ada data IDM.</p>
          <p className="text-muted-foreground">Unduh berkas IDM dari Dinas PMD kabupaten, portal data pemerintah daerah, atau portal IDM Kemendesa, lalu impor di sini. Berkas berisi satu baris per desa (kolom IKS, IKE, IKL, nilai IDM, status) atau satu baris per indikator; pemetaan kolomnya dapat Anda atur sendiri.</p>
        </section>
      ) : null}

      {data && cur ? (
        <>
          <section aria-labelledby="idm-score-h" className="space-y-3">
            <h2 id="idm-score-h" className="text-lg font-semibold">
              Skor {cur.year}
            </h2>
            <dl className="grid grid-cols-2 gap-2 lg:grid-cols-5">
              {[
                ["Nilai IDM", fmtScore(cur.idm)],
                ["Ketahanan Sosial (IKS)", fmtScore(cur.iks)],
                ["Ketahanan Ekonomi (IKE)", fmtScore(cur.ike)],
                ["Ketahanan Lingkungan (IKL)", fmtScore(cur.ikl)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="text-lg font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd className="pt-1">{cur.status ? <Pill tone="info">{cur.status}</Pill> : <span className="text-sm text-muted-foreground">Tidak ada di berkas</span>}</dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">
              Angka ditampilkan apa adanya dari berkas{cur.sourceName ? ` "${cur.sourceName}"` : ""}
              {cur.importedAt ? `, diimpor ${fmtDate(cur.importedAt)}` : ""}. Skala skor berbeda antar sumber (ada yang 0-1, ada yang jumlah poin); status tidak dihitung ulang.
            </p>
            {data.deltas.length ? (
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">Perubahan dari tahun sebelumnya</p>
                <ul className="mt-1 flex flex-wrap gap-x-6 gap-y-1">
                  {data.deltas.map((d) => (
                    <li key={d.dimension} className="inline-flex items-center gap-1 tabular-nums">
                      {d.diff > 0 ? <ArrowUp aria-hidden="true" className="size-4" /> : d.diff < 0 ? <ArrowDown aria-hidden="true" className="size-4" /> : <Minus aria-hidden="true" className="size-4" />}
                      {d.dimension}: {fmtScore(d.from)} menjadi {fmtScore(d.to)} ({d.diff > 0 ? "naik" : d.diff < 0 ? "turun" : "tetap"} {fmtScore(Math.abs(d.diff))})
                    </li>
                  ))}
                </ul>
                {data.scalesDiffer ? <p className="mt-1 text-amber-900">Skala skor kedua tahun tampak berbeda (satu tahun berskala 0-1, yang lain berupa poin); jangan membandingkan angkanya langsung.</p> : null}
              </div>
            ) : null}
          </section>

          <section aria-labelledby="idm-rec-h" className="space-y-3 rounded-lg border p-4">
            <h2 id="idm-rec-h" className="text-lg font-semibold">
              Rekomendasi fokus
            </h2>
            {rec && rec.basis === "TIDAK_ADA" ? <p className="text-sm text-muted-foreground">Belum cukup data. Impor berkas per indikator, atau skor IKS, IKE, dan IKL, untuk mendapatkan rekomendasi.</p> : null}
            {rec?.weakestDimension ? (
              <p className="text-sm">
                Dimensi dengan skor terendah: <strong>{data.catalog.dimensions[rec.weakestDimension.dimension]}</strong> ({fmtScore(rec.weakestDimension.value)}).
              </p>
            ) : null}
            {rec && rec.overall.length ? (
              <>
                <p className="text-sm text-muted-foreground">Indikator terendah {rec.basis === "RASIO" ? "(skor dibanding skor maksimal)" : "(skor mentah: skor maksimal tidak ada di berkas, jadi hanya angka dalam berkas ini yang dibandingkan)"}:</p>
                <ol className="space-y-2">
                  {rec.overall.map((i, n) => (
                    <li key={i.id} className="min-w-0 rounded-md border p-3 text-sm">
                      <p className="break-words font-medium">
                        {n + 1}. {i.name}
                      </p>
                      <p className="text-muted-foreground">
                        {data.catalog.dimensions[i.dimension] ?? i.dimension} · skor {fmtScore(i.score)}
                        {i.maxScore ? ` dari ${fmtScore(i.maxScore)}` : ""}
                      </p>
                      {i.suggestion ? <p className="break-words">Kegiatan yang dapat dilakukan: {i.suggestion}</p> : null}
                      {i.note ? <p className="break-words text-muted-foreground">Keterangan: {i.note}</p> : null}
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
            <p className="text-xs text-muted-foreground">{data.catalog.focusRef}.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="min-h-11">
                <Link href="/musdes">Musyawarah Desa</Link>
              </Button>
              <Button asChild variant="outline" className="min-h-11">
                <Link href="/rkpdes">Siklus RKP Desa</Link>
              </Button>
              <Button asChild variant="outline" className="min-h-11">
                <Link href="/dana-desa">Dana Desa</Link>
              </Button>
            </div>
          </section>

          {data.indicators.length ? (
            <section aria-labelledby="idm-ind-h" className="space-y-2">
              <h2 id="idm-ind-h" className="text-lg font-semibold">
                Seluruh indikator ({data.indicators.length})
              </h2>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[40rem] text-sm">
                  <caption className="sr-only">Skor tiap indikator IDM {cur.year}</caption>
                  <thead className="bg-muted text-left">
                    <tr>
                      <th scope="col" className="px-3 py-2">Dimensi</th>
                      <th scope="col" className="px-3 py-2">Indikator</th>
                      <th scope="col" className="px-3 py-2 text-right">Skor</th>
                      <th scope="col" className="px-3 py-2">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.indicators.map((i) => (
                      <tr key={i.id} className="align-top">
                        <td className="px-3 py-2 whitespace-nowrap">{i.dimension}</td>
                        <td className="break-words px-3 py-2">
                          {i.code ? <span className="text-muted-foreground">{i.code}. </span> : null}
                          {i.name}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {fmtScore(i.score)}
                          {i.maxScore ? <span className="text-muted-foreground"> / {fmtScore(i.maxScore)}</span> : null}
                        </td>
                        <td className="break-words px-3 py-2 text-xs">{[i.note, i.suggestion].filter(Boolean).join(" · ") || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {data.years.length > 1 ? (
            <section aria-labelledby="idm-trend-h" className="space-y-2">
              <h2 id="idm-trend-h" className="text-lg font-semibold">
                Perkembangan antar tahun
              </h2>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[34rem] text-sm">
                  <caption className="sr-only">Skor IDM per tahun</caption>
                  <thead className="bg-muted text-left">
                    <tr>
                      <th scope="col" className="px-3 py-2">Tahun</th>
                      <th scope="col" className="px-3 py-2 text-right">IKS</th>
                      <th scope="col" className="px-3 py-2 text-right">IKE</th>
                      <th scope="col" className="px-3 py-2 text-right">IKL</th>
                      <th scope="col" className="px-3 py-2 text-right">IDM</th>
                      <th scope="col" className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.years.map((y) => (
                      <tr key={y.year}>
                        <th scope="row" className="px-3 py-2 text-left">{y.year}</th>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtScore(y.iks)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtScore(y.ike)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtScore(y.ikl)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtScore(y.idm)}</td>
                        <td className="px-3 py-2">{y.status ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {data ? (
        <details className="rounded-lg border p-3 text-sm">
          <summary className="min-h-11 cursor-pointer py-2 font-medium">Dasar dan batas impor</summary>
          <ul className="mt-2 space-y-1">
            {data.catalog.sources.map((s) => (
              <li key={s.ref} className="break-words">
                <strong>{s.ref}</strong> ({s.status === "V" ? "diverifikasi" : "belum diverifikasi"}): {s.note}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {importing && data ? <ImportDialog data={data} onClose={() => setImporting(false)} onDone={(y) => { setImporting(false); setYear(y); reload(); }} /> : null}
    </div>
  );
}
