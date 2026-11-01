"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SELECT_CLASS, WarningList } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { FocusTab } from "./FocusTab";
import { ProhibitionsTab } from "./ProhibitionsTab";
import { PublicationTab } from "./PublicationTab";
import { ReportsTab } from "./ReportsTab";
import { SummaryTab } from "./SummaryTab";
import type { Resp } from "./types";

type Tab = "ringkasan" | "fokus" | "larangan" | "publikasi" | "laporan";

export function DanaDesaView() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [apbdesId, setApbdesId] = useState("");
  const [tab, setTab] = useState<Tab>("ringkasan");
  const { data, loading, error, reload } = useApiGet<Resp>(`/api/dana-desa?year=${year}${apbdesId ? `&apbdes=${apbdesId}` : ""}`);
  // Pilihan dokumen disimpan dari jawaban pertama tiap tahun agar pemilih tetap tampil saat jawaban baru dimuat.
  const [opts, setOpts] = useState<{ year: number; list: Resp["apbdesOptions"] } | null>(null);
  if (data && data.year === year && !apbdesId && (opts?.year !== year || opts.list !== data.apbdesOptions)) setOpts({ year, list: data.apbdesOptions });
  const choices = opts?.year === year ? opts.list : (data?.apbdesOptions ?? []);
  const years = [thisYear - 2, thisYear - 1, thisYear, thisYear + 1];

  return (
    <div className="space-y-6 pb-24">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Dana Desa</h1>
        <p className="text-muted-foreground">Memeriksa penggunaan Dana Desa terhadap APB Desa: fokus penggunaan, batas operasional, larangan, publikasi, dan kesiapan laporan penyaluran.</p>
      </header>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="dd-year">Tahun anggaran</Label>
          <SearchSelect
            id="dd-year"
            className={`${SELECT_CLASS} w-32`}
            value={String(year)}
            onChange={(e) => {
              setYear(Number(e.target.value));
              setApbdesId("");
            }}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </SearchSelect>
        </div>
        {choices.length ? (
          <div className="space-y-1.5">
            <Label htmlFor="dd-apb">Dokumen APB Desa yang diperiksa</Label>
            <SearchSelect id="dd-apb" className={`${SELECT_CLASS} w-72`} value={apbdesId || String(choices[0]!.id)} onChange={(e) => setApbdesId(e.target.value)}>
              {choices.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} — {c.status === "DITETAPKAN" ? "ditetapkan" : "draf"}
                </option>
              ))}
            </SearchSelect>
          </div>
        ) : null}
      </div>

      {loading && !data ? (
        <p role="status" className="flex items-center gap-2 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Memuat Dana Desa…
        </p>
      ) : null}
      {error && !data ? (
        <div role="alert" className="rounded-md border border-destructive p-4 text-destructive">
          {error}
        </div>
      ) : null}

      {data ? (
        <div aria-busy={loading} className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          {!data.rules.exact ? <WarningList title={`Aturan Dana Desa ${year} belum tersedia`} items={[`Pemeriksaan memakai aturan tahun ${data.rules.basisYear} (${data.rules.sources.join("; ")}). Angka batas bisa berbeda; cek peraturan tahun ${year} begitu terbit.`]} /> : null}
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mt-4">
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="ringkasan" className="min-h-11">Ringkasan</TabsTrigger>
              <TabsTrigger value="fokus" className="min-h-11">Fokus kegiatan ({data.activities.length})</TabsTrigger>
              <TabsTrigger value="larangan" className="min-h-11">Larangan ({data.analysis.prohibitions.filter((p) => !p.exceptionReason).length})</TabsTrigger>
              <TabsTrigger value="publikasi" className="min-h-11">Publikasi</TabsTrigger>
              <TabsTrigger value="laporan" className="min-h-11">Penyaluran dan laporan</TabsTrigger>
            </TabsList>
            <TabsContent value="ringkasan" className="space-y-6 pt-4">
              <SummaryTab data={data} year={year} reload={reload} />
            </TabsContent>
            <TabsContent value="fokus" className="space-y-4 pt-4">
              <FocusTab data={data} year={year} reload={reload} />
            </TabsContent>
            <TabsContent value="larangan" className="space-y-4 pt-4">
              <ProhibitionsTab data={data} year={year} reload={reload} />
            </TabsContent>
            <TabsContent value="publikasi" className="space-y-4 pt-4">
              <PublicationTab data={data} year={year} reload={reload} apbdesId={apbdesId} />
            </TabsContent>
            <TabsContent value="laporan" className="space-y-6 pt-4">
              <ReportsTab data={data} year={year} reload={reload} />
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </div>
  );
}
