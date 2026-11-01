"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtDate, rupiah, villageTitle } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import type { PrintData } from "../_components/types";

const PRINT_CSS = "@page{size:A4 landscape;margin:10mm}@media print{body *{visibility:hidden!important}#pktd-print,#pktd-print *{visibility:visible!important}#pktd-print{position:absolute;left:0;top:0;width:100%}}";
const th = "border border-black p-1 text-left align-top";
const td = "border border-black p-1 align-top";

type Resp = PrintData & { village: { name: string } };

/** Lembar hari kerja (tanda hadir dan upah harian) untuk periode; tanpa NIK. */
export function CetakView() {
  const sp = useSearchParams();
  const id = Number(sp.get("id"));
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  const qs = [from && `from=${encodeURIComponent(from)}`, to && `to=${encodeURIComponent(to)}`].filter(Boolean).join("&");
  const { data, loading, error, reload } = useApiGet<Resp>(Number.isInteger(id) && id > 0 ? `/api/pktd/${id}/cetak${qs ? `?${qs}` : ""}` : null);

  return (
    <div className="space-y-6">
      <style>{PRINT_CSS}</style>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button asChild variant="ghost" className="min-h-11">
          <Link href={id > 0 ? `/pktd/${id}` : "/pktd"}>
            <ArrowLeft aria-hidden="true" />
            Kembali
          </Link>
        </Button>
        <Button type="button" className="min-h-11" onClick={() => window.print()} disabled={!data}>
          <Printer aria-hidden="true" />
          Cetak
        </Button>
        <form method="get" className="flex flex-wrap items-center gap-2 text-sm">
          <input type="hidden" name="id" value={id} />
          <label className="flex items-center gap-1">
            Dari
            <input type="date" name="from" defaultValue={from} className="h-11 rounded-md border px-2" />
          </label>
          <label className="flex items-center gap-1">
            sampai
            <input type="date" name="to" defaultValue={to} className="h-11 rounded-md border px-2" />
          </label>
          <Button type="submit" variant="outline" className="min-h-11">
            Terapkan periode
          </Button>
        </form>
      </div>

      {loading ? (
        <p role="status" className="flex items-center gap-2 text-muted-foreground print:hidden">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Menyiapkan lembar…
        </p>
      ) : null}
      {error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive print:hidden">
          <p>{error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={reload}>
            Coba lagi
          </Button>
        </div>
      ) : null}

      {data ? (
        <article id="pktd-print" className="space-y-3 bg-white p-4 text-black" aria-label="Lembar hari kerja PKTD">
          <header className="text-center">
            <p className="text-sm font-semibold uppercase">Pemerintah Desa {villageTitle(data.village.name)}</p>
            <h1 className="text-lg font-bold uppercase">Daftar Hadir dan Pembayaran Upah Padat Karya Tunai Desa</h1>
            <p className="text-sm">
              {data.title}
              {data.location ? ` · ${data.location}` : ""} · Tahun {data.year}
            </p>
            {data.wageMin && data.wageMax ? (
              <p className="text-xs">
                Batas upah harian {rupiah(data.wageMin)} sampai {rupiah(data.wageMax)}
              </p>
            ) : null}
          </header>
          {data.dates.length ? (
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th scope="col" className={`${th} w-6`}>No</th>
                  <th scope="col" className={th}>Nama pekerja</th>
                  {data.dates.map((d) => (
                    <th key={d} scope="col" className={`${th} text-center`}>
                      {fmtDate(d).replace(/ \d{4}$/, "")}
                    </th>
                  ))}
                  <th scope="col" className={`${th} text-right`}>Hari</th>
                  <th scope="col" className={`${th} text-right`}>Jumlah (Rp)</th>
                  <th scope="col" className={`${th} w-24`}>Tanda tangan</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.no} className="h-8">
                    <td className={td}>{r.no}</td>
                    <td className={td}>{r.name}</td>
                    {r.cells.map((c, i) => (
                      <td key={data.dates[i]} className={`${td} text-center tabular-nums`}>
                        {c ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number(c)) : ""}
                      </td>
                    ))}
                    <td className={`${td} text-right tabular-nums`}>{r.days}</td>
                    <td className={`${td} text-right tabular-nums`}>{new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number(r.total))}</td>
                    <td className={td}>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className={`${td} font-semibold`} colSpan={data.dates.length + 3}>
                    Jumlah upah periode ini
                  </td>
                  <td className={`${td} text-right font-semibold tabular-nums`}>{new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number(data.total))}</td>
                  <td className={td} />
                </tr>
              </tfoot>
            </table>
          ) : (
            <p className="text-sm">Belum ada hari kerja pada periode ini.</p>
          )}
          <p className="text-xs">
            Upah terealisasi seluruh kegiatan {rupiah(data.recorded)} dari biaya {rupiah(data.cost)} ({(data.shareBps / 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%; minimal {data.minPct}%).
          </p>
          <div className="flex justify-between pt-4 text-xs">
            <div className="w-56 text-center">
              <p>Bendahara Desa</p>
              <p className="mt-12">______________________</p>
            </div>
            <div className="w-56 text-center">
              <p>Kepala Desa / Pelaksana Kegiatan</p>
              <p className="mt-12">______________________</p>
            </div>
          </div>
        </article>
      ) : null}
    </div>
  );
}
