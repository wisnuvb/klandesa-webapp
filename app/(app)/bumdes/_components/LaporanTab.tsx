"use client";

import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { useApiGet } from "@/hooks/useApiGet";
import { PERIOD_KIND, type PeriodKind } from "@/lib/bumdes/catalog";
import type { ReportView, SectionView, StatementsView } from "@/lib/bumdes/service";
import { Busy, Findings, SELECT_CLASS, StatusPill, rp } from "./shared";

const PRINT_CSS = "@page{size:A4;margin:12mm}@media print{body *{visibility:hidden!important}#bd-report,#bd-report *{visibility:visible!important}#bd-report{position:absolute;left:0;top:0;width:100%}}";

function Section({ s, strong }: { s: SectionView; strong?: boolean }) {
  return (
    <>
      <tr>
        <th scope="rowgroup" colSpan={2} className="bg-muted/60 px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide">
          {s.label}
        </th>
      </tr>
      {s.lines.length ? (
        s.lines.map((l) => (
          <tr key={l.code}>
            <td className="break-words px-3 py-1.5 pl-6">
              {/^\d/.test(l.code) ? <span className="text-xs text-muted-foreground">{l.code} </span> : null}
              {l.name}
            </td>
            <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{rp(l.amount)}</td>
          </tr>
        ))
      ) : (
        <tr>
          <td colSpan={2} className="px-3 py-1.5 pl-6 text-muted-foreground">
            Tidak ada saldo
          </td>
        </tr>
      )}
      <tr className={strong ? "font-semibold" : "font-medium"}>
        <td className="px-3 py-1.5">Jumlah {s.label.toLowerCase()}</td>
        <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{rp(s.total)}</td>
      </tr>
    </>
  );
}
const Total = ({ label, value }: { label: string; value: string }) => (
  <tr className="border-t-2 font-semibold">
    <td className="px-3 py-2">{label}</td>
    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{rp(value)}</td>
  </tr>
);

function Statements({ e }: { e: StatementsView }) {
  const n = e.neraca;
  const l = e.labaRugi;
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <section aria-labelledby="lp-neraca" className="min-w-0 rounded-lg border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <h3 id="lp-neraca" className="font-semibold">
            Laporan posisi keuangan (neraca)
          </h3>
          {n.balanced ? <StatusPill tone="ok">Seimbang</StatusPill> : <StatusPill tone="warn">Tidak seimbang: selisih {rp(n.difference)}</StatusPill>}
        </div>
        <p className="px-3 pt-2 text-xs text-muted-foreground">Per {n.asOf}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] text-sm">
            <caption className="sr-only">Neraca {e.name}</caption>
            <tbody>
              <Section s={n.aset} />
              <Section s={n.kewajiban} />
              <Section s={n.ekuitas} />
              <Total label="Jumlah kewajiban dan ekuitas" value={n.totalKewajibanEkuitas} />
            </tbody>
          </table>
        </div>
      </section>
      <section aria-labelledby="lp-lr" className="min-w-0 rounded-lg border">
        <div className="border-b p-3">
          <h3 id="lp-lr" className="font-semibold">
            Laporan laba rugi
          </h3>
        </div>
        <p className="px-3 pt-2 text-xs text-muted-foreground">{l.period}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] text-sm">
            <caption className="sr-only">Laba rugi {e.name}</caption>
            <tbody>
              <Section s={l.pendapatan} />
              <Section s={l.hpp} />
              <Total label="Laba kotor" value={l.labaKotor} />
              <Section s={l.beban} />
              <Total label="Laba usaha" value={l.labaUsaha} />
              <Section s={l.pendapatanLain} />
              <Section s={l.bebanLain} />
              <Total label="Laba sebelum pajak" value={l.labaSebelumPajak} />
              <Section s={l.bebanPajak} />
              <Total label="Laba (rugi) bersih" value={l.labaBersih} />
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function LaporanTab({ units }: { units: { id: number; name: string }[] }) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [kind, setKind] = useState<PeriodKind>(new Date().getMonth() < 6 ? "S1" : "S2");
  const [entity, setEntity] = useState("gabungan");
  const { data, loading, error } = useApiGet<ReportView>(`/api/bumdes/laporan?year=${year}&kind=${kind}`);
  const target: StatementsView | null = data ? (entity === "gabungan" ? data.consolidated : (data.entities.find((e) => (entity === "pusat" ? e.unitId === null : String(e.unitId) === entity)) ?? null)) : null;
  const csv = `/api/bumdes/laporan?year=${year}&kind=${kind}&format=csv&entity=${entity}`;

  return (
    <div className="min-w-0 space-y-4">
      <style>{PRINT_CSS}</style>
      <p className="max-w-3xl text-sm text-muted-foreground">
        Laporan semesteran memuat posisi keuangan dan laba rugi (PP 11/2021 Pasal 58 ayat 4); laporan tahunan menambah gabungan unit usaha (ayat 6). Angka dihitung dari jurnal aktif; akun nominal tahun lalu dihitung sebagai laba ditahan, bukan dijurnal penutup.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="lp-year">Tahun buku</Label>
          <SearchSelect id="lp-year" className={SELECT_CLASS} value={String(year)} onChange={(e) => setYear(Number(e.target.value))}>
            {[thisYear - 3, thisYear - 2, thisYear - 1, thisYear, thisYear + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </SearchSelect>
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="lp-kind">Periode</Label>
          <SearchSelect id="lp-kind" className={SELECT_CLASS} value={kind} onChange={(e) => setKind(e.target.value as PeriodKind)}>
            {Object.entries(PERIOD_KIND).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </SearchSelect>
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="lp-ent">Entitas</Label>
          <SearchSelect id="lp-ent" className={SELECT_CLASS} value={entity} onChange={(e) => setEntity(e.target.value)}>
            <option value="gabungan">Gabungan (konsolidasi)</option>
            <option value="pusat">Kantor Pusat</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </SearchSelect>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Button type="button" variant="outline" className="min-h-11" onClick={() => window.print()} disabled={!target}>
            <Printer aria-hidden="true" />
            Cetak
          </Button>
          <Button asChild variant="outline" className="min-h-11">
            <a href={csv} download>
              <Download aria-hidden="true" />
              Unduh CSV
            </a>
          </Button>
        </div>
      </div>

      {loading && !data ? <Busy>Menyusun laporan…</Busy> : null}
      {error ? (
        <div role="alert" className="rounded-md border border-destructive p-4 text-destructive">
          {error}
        </div>
      ) : null}
      {data ? (
        <>
          <div className="space-y-2 print:hidden">
            <Findings items={data.findings} />
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <strong>{data.range.label}</strong>
              {data.periodState.map((p) => (
                <StatusPill key={p.half} tone={p.state === "DITUTUP" ? "ok" : "off"}>
                  Semester {p.half === 1 ? "I" : "II"}: {p.state === "DITUTUP" ? "ditutup" : "terbuka"}
                </StatusPill>
              ))}
            </p>
          </div>
          {target ? (
            <div id="bd-report" className="min-w-0 space-y-3 bg-white p-0 text-black print:p-2">
              <header className="hidden print:block">
                <h1 className="text-lg font-bold uppercase">Laporan keuangan BUM Desa</h1>
                <p className="text-sm">
                  {data.range.label} · {target.name}
                </p>
              </header>
              <h2 className="text-lg font-semibold print:hidden">{target.name}</h2>
              {target.empty ? <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground print:hidden">Belum ada jurnal untuk entitas ini sampai akhir periode.</p> : null}
              <Statements e={target} />
              {entity === "gabungan" ? (
                <p className="text-xs text-muted-foreground">
                  Eliminasi akun resiprokal (RK Unit Usaha {rp(data.elimination.rkUnit)}, RK Pusat {rp(data.elimination.rkPusat)}): sisa {rp(data.elimination.residual)} {data.elimination.balanced ? "(saling meniadakan)" : "(BELUM saling meniadakan)"}. Sumber: Kepmendes PDTT 136/2022 Bab V.B.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Entitas tidak ditemukan.</p>
          )}
        </>
      ) : null}
    </div>
  );
}
