"use client";

import { useState } from "react";
import { AlertTriangle, Landmark, Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiGet } from "@/hooks/useApiGet";
import { AnggaranTab } from "./AnggaranTab";
import { BukuKasTab } from "./BukuKasTab";
import { LaporanTab } from "./LaporanTab";
import { PelaksanaanTab } from "./PelaksanaanTab";
import { SppTab } from "./SppTab";
import { SettingsDialog } from "./SettingsDialog";
import { SELECT_CLASS, money, type Overview } from "./shared";

export function ApbdesView() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [settings, setSettings] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const { data: o, loading, error, reload } = useApiGet<Overview>(`/api/apbdes?year=${year}`);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Landmark aria-hidden="true" className="size-6" />
            APBDes &amp; Buku Kas
          </h1>
          <p className="max-w-prose text-muted-foreground">
            Anggaran, buku kas, dan laporan keuangan desa mengikuti Permendagri 20/2018. Terpisah dari catatan keuangan lama di menu Keuangan Desa.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-32">
            <label htmlFor="apb-year" className="mb-1.5 block text-sm font-medium">Tahun anggaran</label>
            <select id="apb-year" className={SELECT_CLASS} value={year} onChange={(e) => { setYear(Number(e.target.value)); setWarnings([]); }}>
              {Array.from({ length: 8 }, (_, k) => thisYear + 1 - k).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {o?.can.update ? (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setSettings(true)}>
              <Settings aria-hidden="true" />
              Pengaturan
            </Button>
          ) : null}
        </div>
      </header>

      {loading ? <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground"><Loader2 aria-hidden="true" className="size-5 animate-spin" />Memuat…</p> : null}
      {error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={reload}>Coba lagi</Button>
        </div>
      ) : null}

      {o ? (
        <>
          {[...warnings, ...o.alerts].length > 0 ? (
            <ul role="status" className="space-y-1 rounded-lg border border-amber-500 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              {[...warnings, ...o.alerts].map((a) => (
                <li key={a} className="flex gap-2"><AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{a}</li>
              ))}
            </ul>
          ) : null}

          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <dt className="text-sm text-muted-foreground">Pendapatan (realisasi / anggaran)</dt>
              <dd className="font-semibold tabular-nums">{money(o.summary.incomeRealized)} <span className="font-normal text-muted-foreground">/ {money(o.summary.incomeBudget)}</span></dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-sm text-muted-foreground">Belanja (realisasi / anggaran)</dt>
              <dd className="font-semibold tabular-nums">{money(o.summary.expenseRealized)} <span className="font-normal text-muted-foreground">/ {money(o.summary.expenseBudget)}</span></dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-sm text-muted-foreground">APB Desa yang berlaku</dt>
              <dd className="font-semibold">{o.activeLabel ?? "Belum ditetapkan"}</dd>
            </div>
          </dl>

          <Tabs defaultValue="anggaran">
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="anggaran" className="min-h-11">Anggaran</TabsTrigger>
              <TabsTrigger value="dpa" className="min-h-11">Pelaksanaan (DPA)</TabsTrigger>
              <TabsTrigger value="spp" className="min-h-11">SPP &amp; Panjar</TabsTrigger>
              <TabsTrigger value="kas" className="min-h-11">Buku Kas</TabsTrigger>
              <TabsTrigger value="laporan" className="min-h-11">Laporan</TabsTrigger>
            </TabsList>
            <TabsContent value="anggaran" className="pt-4"><AnggaranTab o={o} reload={reload} onWarnings={setWarnings} /></TabsContent>
            <TabsContent value="dpa" className="pt-4"><PelaksanaanTab o={o} reload={reload} /></TabsContent>
            <TabsContent value="spp" className="pt-4"><SppTab o={o} reload={reload} /></TabsContent>
            <TabsContent value="kas" className="pt-4"><BukuKasTab o={o} reload={reload} /></TabsContent>
            <TabsContent value="laporan" className="pt-4"><LaporanTab o={o} /></TabsContent>
          </Tabs>
          <p className="text-xs text-muted-foreground">Sumber aturan: {o.terms.source}. Kode bidang, kegiatan, dan rekening diambil dari lampirannya. Peraturan Bupati/Wali Kota setempat dapat menambah kegiatan 90-99 atau mengatur lebih rinci.</p>
        </>
      ) : null}

      {settings && o ? <SettingsDialog year={year} settings={o.settings} onClose={() => setSettings(false)} onSaved={() => { setSettings(false); reload(); }} /> : null}
    </div>
  );
}
