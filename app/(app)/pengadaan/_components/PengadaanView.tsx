"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Loader2, Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Pill, SELECT_CLASS, rupiah } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { PackageDialog } from "./PackageDialog";
import { SettingDialog } from "./SettingDialog";
import { STATUS_TONE, type ListResp } from "./types";

export function PengadaanView() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [creating, setCreating] = useState(false);
  const [settings, setSettings] = useState(false);
  const { data, loading, error, reload } = useApiGet<ListResp>(`/api/pengadaan?year=${year}`);

  return (
    <div className="space-y-6 pb-24">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Pengadaan Barang/Jasa</h1>
        <p className="max-w-3xl text-muted-foreground">
          Satu paket untuk tiap pengadaan atas kegiatan APB Desa: tim pelaksana (TPK), penawaran penyedia, berita acara negosiasi, SPK, dan serah terima (BAST). Pembayaran tetap lewat SPP di menu APBDes; di sini hanya terlihat tautan dan peringatannya.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pg-year">Tahun anggaran</Label>
          <SearchSelect id="pg-year" className={`${SELECT_CLASS} w-32`} value={String(year)} onChange={(e) => setYear(Number(e.target.value))}>
            {[thisYear - 2, thisYear - 1, thisYear, thisYear + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </SearchSelect>
        </div>
        {data?.can.create ? (
          <Button type="button" className="min-h-11" onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            Paket baru
          </Button>
        ) : null}
        {data?.can.update ? (
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setSettings(true)}>
            <Settings2 aria-hidden="true" />
            Ambang metode
          </Button>
        ) : null}
      </div>

      {loading && !data ? (
        <p role="status" className="flex items-center gap-2 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Memuat pengadaan…
        </p>
      ) : null}
      {error ? (
        <div role="alert" className="rounded-md border border-destructive p-4 text-destructive">
          {error}
        </div>
      ) : null}

      {data ? (
        <>
          <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[
              ["Jumlah paket", String(data.totals.count)],
              ["Nilai paket (tidak termasuk batal)", rupiah(data.totals.value)],
              ["Dalam pelaksanaan", String(data.totals.byStatus.PELAKSANAAN ?? 0)],
              ["Selesai (BAST)", String(data.totals.byStatus.SELESAI ?? 0)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="break-words text-lg font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>

          <p className="text-sm text-muted-foreground">
            Anggaran dibaca dari {data.budgetDoc ? `${data.budgetDoc} (ditetapkan)` : "APB Desa yang ditetapkan (belum ada untuk tahun ini)"}.{" "}
            {data.limits.direct || data.limits.offer ? (
              <>
                Ambang metode desa: pembelian langsung sampai {data.limits.direct ? rupiah(data.limits.direct) : "(belum diisi)"}, permintaan penawaran sampai {data.limits.offer ? rupiah(data.limits.offer) : "(belum diisi)"}
                {data.limits.basisNote ? ` (${data.limits.basisNote})` : ""}.
              </>
            ) : (
              <>Ambang nilai antar-metode ditetapkan Perbup kabupaten dan belum diisi, jadi aplikasi tidak menyarankan metode.</>
            )}
          </p>

          {data.packages.length ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[46rem] text-sm">
                <caption className="sr-only">Daftar paket pengadaan tahun {year}</caption>
                <thead className="bg-muted text-left">
                  <tr>
                    <th scope="col" className="px-3 py-2">No</th>
                    <th scope="col" className="px-3 py-2">Paket</th>
                    <th scope="col" className="px-3 py-2">Cara</th>
                    <th scope="col" className="px-3 py-2 text-right">Nilai</th>
                    <th scope="col" className="px-3 py-2">Tahap</th>
                    <th scope="col" className="px-3 py-2">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.packages.map((p) => (
                    <tr key={p.id} className="align-top">
                      <td className="px-3 py-2 tabular-nums">{p.number}</td>
                      <td className="max-w-xs break-words px-3 py-2">
                        <Link href={`/pengadaan/${p.id}`} className="inline-flex min-h-11 items-center font-medium underline underline-offset-4">
                          {p.title}
                        </Link>
                        <span className="block text-xs text-muted-foreground">
                          {p.activityCode} {p.activityName}
                        </span>
                        {p.providerName ? <span className="block text-xs text-muted-foreground">Penyedia: {p.providerName}</span> : null}
                      </td>
                      <td className="px-3 py-2">
                        {p.modeLabel}
                        {p.methodLabel ? <span className="block text-xs text-muted-foreground">{p.methodLabel}</span> : null}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{rupiah(p.contract ?? p.hps)}</td>
                      <td className="px-3 py-2">
                        <Pill tone={STATUS_TONE[p.status]}>{p.statusLabel}</Pill>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {p.warnCount ? <span className="font-medium text-amber-900">{p.warnCount} perlu diperiksa</span> : <span className="text-muted-foreground">-</span>}
                        {p.sppCount ? <span className="block text-muted-foreground">{p.sppCount} SPP terkait</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Belum ada paket pengadaan untuk tahun {year}. Buat paket untuk setiap kegiatan APB Desa yang membeli barang atau jasa, baik lewat swakelola maupun penyedia.</p>
          )}

          <section aria-labelledby="pg-unp-h" className="space-y-2">
            <h2 id="pg-unp-h" className="text-lg font-semibold">
              Pembayaran tanpa paket pengadaan
            </h2>
            {data.unpackaged.length ? (
              <>
                <p className="text-sm text-muted-foreground">SPP (di luar BLT, PKTD, dan KDMP) pada kegiatan berikut belum punya paket pengadaan aktif. Ini hanya informasi: SPP tetap berjalan menurut alurnya sendiri.</p>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[34rem] text-sm">
                    <caption className="sr-only">Kegiatan dengan SPP tetapi tanpa paket pengadaan</caption>
                    <thead className="bg-muted text-left">
                      <tr>
                        <th scope="col" className="px-3 py-2">Kegiatan</th>
                        <th scope="col" className="px-3 py-2 text-right">SPP</th>
                        <th scope="col" className="px-3 py-2 text-right">Total diajukan</th>
                        <th scope="col" className="px-3 py-2 text-right">Sudah dibayar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.unpackaged.map((u) => (
                        <tr key={u.activityCode}>
                          <td className="break-words px-3 py-2">
                            {u.activityCode} {u.activityName}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{u.sppCount}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{rupiah(u.total)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{rupiah(u.paid)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada. Setiap kegiatan yang sudah punya SPP juga punya paket pengadaan aktif.</p>
            )}
            <Link href="/apbdes" className="inline-flex min-h-11 items-center gap-0.5 text-sm underline underline-offset-4">
              Buka APBDes dan SPP
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
          </section>

          <details className="rounded-lg border p-3 text-sm">
            <summary className="min-h-11 cursor-pointer py-2 font-medium">Dasar aturan dan batasnya</summary>
            <ul className="mt-2 space-y-1">
              {data.catalog.sources.map((s) => (
                <li key={s.ref} className="break-words">
                  <strong>{s.ref}</strong> ({s.status === "V" ? "dibaca dari teks resmi" : "belum diverifikasi"}): {s.note}
                </li>
              ))}
            </ul>
          </details>
        </>
      ) : null}

      {creating && data ? <PackageDialog year={year} catalog={data.catalog} onClose={() => setCreating(false)} onDone={() => { setCreating(false); reload(); }} /> : null}
      {settings && data ? <SettingDialog data={data} onClose={() => setSettings(false)} onDone={() => { setSettings(false); reload(); }} /> : null}
    </div>
  );
}
