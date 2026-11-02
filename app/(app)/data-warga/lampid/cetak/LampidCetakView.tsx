"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApiGet } from "@/hooks/useApiGet";
import { currentMonthKey, isMonthKey, LAMPID_KINDS, LAMPID_LABEL, monthLabel, type LampidGroup, type LampidResponse } from "@/lib/kependudukan/lampid";
import { genderNationalityTable, listTable, regionTable, summaryTable } from "@/lib/kependudukan/lampid-export";
import { formatLongDate } from "@/lib/statistics/export";
import { LampidTableView } from "../_components/LampidTableView";

const PRINT_CSS =
  "@page{size:A4 portrait;margin:15mm}@media print{body *{visibility:hidden!important}#lampid-print,#lampid-print *{visibility:visible!important}#lampid-print{position:absolute;left:0;top:0;width:100%}}";

export function LampidCetakView() {
  const params = useSearchParams();
  const thisMonth = currentMonthKey(new Date());
  const qMonth = params.get("month");
  const month = isMonthKey(qMonth) && qMonth <= thisMonth ? qMonth : thisMonth;
  const group: LampidGroup = params.get("group") === "rtrw" ? "rtrw" : "dusun";
  const { data, loading, error, reload } = useApiGet<LampidResponse>(`/api/kependudukan/lampid?month=${month}&group=${group}`);
  const report = data?.report;
  const v = data?.village;
  const generated = data ? new Date(data.generatedAt) : null;

  return (
    <div className="space-y-6">
      <style>{PRINT_CSS}</style>
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Button asChild variant="ghost" className="min-h-11">
          <Link href={`/data-warga/lampid?month=${month}&group=${group}`}>
            <ArrowLeft aria-hidden="true" />
            Kembali ke Laporan LAMPID
          </Link>
        </Button>
        <Button type="button" className="min-h-11" disabled={!data} onClick={() => window.print()}>
          <Printer aria-hidden="true" />
          Cetak / Simpan PDF
        </Button>
        <p className="text-sm text-muted-foreground">Pilih &ldquo;Simpan sebagai PDF&rdquo; di dialog cetak untuk mendapatkan berkas PDF.</p>
      </div>

      {loading ? (
        <p role="status" className="flex items-center gap-2 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          Menyusun laporan…
        </p>
      ) : null}

      {error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={reload}>
            Coba lagi
          </Button>
        </div>
      ) : null}

      {report && v && generated && data ? (
        <article id="lampid-print" className="mx-auto max-w-3xl space-y-5 bg-background text-sm leading-relaxed">
          <header className="flex items-center gap-4 border-b-4 border-double pb-3">
            {v.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- logo desa bisa dari domain mana pun; hanya untuk cetak
              <img src={v.logoUrl} alt="" className="size-16 shrink-0 object-contain" />
            ) : null}
            <div className="flex-1 text-center">
              <p className="text-sm font-semibold uppercase">Pemerintah Kabupaten {v.regency}</p>
              <p className="text-sm font-semibold uppercase">Kecamatan {v.district}</p>
              <p className="text-lg font-bold uppercase">Desa {v.name}</p>
              <p className="text-xs text-muted-foreground">{v.address}</p>
            </div>
          </header>

          <div className="space-y-1 text-center">
            <h1 className="text-base font-bold uppercase">Laporan Bulanan Peristiwa Kependudukan (LAMPID)</h1>
            <p className="font-semibold">Bulan {monthLabel(report.month)}</p>
            <p className="text-xs text-muted-foreground">Lahir · Mati · Pindah · Datang</p>
          </div>

          <section className="break-inside-avoid space-y-1">
            <h2 className="font-semibold">A. Ringkasan</h2>
            <LampidTableView table={summaryTable(report)} print />
            <p className="text-xs text-muted-foreground">Penduduk akhir = awal + lahir − mati − pindah + datang.</p>
          </section>

          <section className="break-inside-avoid space-y-1">
            <h2 className="font-semibold">B. {group === "dusun" ? "Rincian per dusun" : "Rincian per RW/RT"}</h2>
            <LampidTableView table={regionTable(report)} print />
          </section>

          <section className="break-inside-avoid space-y-1">
            <h2 className="font-semibold">C. Menurut jenis kelamin dan kewarganegaraan</h2>
            <LampidTableView table={genderNationalityTable(report)} print />
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">D. Daftar nama</h2>
            {LAMPID_KINDS.map((k) => {
              const t = listTable(report, k);
              return (
                <div key={k} className="break-inside-avoid space-y-1">
                  <h3 className="text-xs font-semibold">
                    {LAMPID_LABEL[k]} ({report.list[k].length})
                  </h3>
                  {report.list[k].length ? <LampidTableView table={t} print /> : <p className="text-xs text-muted-foreground">Tidak ada kejadian pada bulan ini.</p>}
                </div>
              );
            })}
          </section>

          <section className="grid break-inside-avoid grid-cols-2 gap-6 pt-4 text-center">
            <div className="space-y-16">
              <p>
                Mengetahui,
                <br />
                Kepala Desa
              </p>
              <p className="font-semibold underline">{data.signers.kades || "…………………………"}</p>
            </div>
            <div className="space-y-16">
              <p>
                {v.name}, {formatLongDate(generated)}
                <br />
                Sekretaris Desa
              </p>
              <p className="font-semibold underline">{data.signers.sekdes || "…………………………"}</p>
            </div>
          </section>

          <footer className="border-t pt-2 text-xs text-muted-foreground">
            <p>Sumber: Buku Mutasi dan data kependudukan KlanDesa. Jumlah awal dihitung mundur dari data penduduk per {formatLongDate(generated)}. NIK ditampilkan 4 digit terakhir.</p>
          </footer>
        </article>
      ) : null}
    </div>
  );
}
