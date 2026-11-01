"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rupiah, villageTitle } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";

interface Resp {
  year: number;
  village: { name: string };
  label: string | null;
  status: string | null;
  items: { activityCode: string; name: string; location: string | null; amount: string }[];
  total: string;
}

const PRINT_CSS = "@page{size:A4 portrait;margin:14mm}@media print{body *{visibility:hidden!important}#dd-print,#dd-print *{visibility:visible!important}#dd-print{position:absolute;left:0;top:0;width:100%}}";
const th = "border border-black p-2 text-left align-top";
const td = "border border-black p-2 align-top";

/** Daftar nama kegiatan, lokasi, dan besaran Dana Desa untuk papan informasi atau baliho (Permendesa 16/2025 Pasal 10 ayat 2). */
export function PublikasiView() {
  const sp = useSearchParams();
  const year = Number(sp.get("year")) || new Date().getFullYear();
  const apbdes = sp.get("apbdes");
  const { data, loading, error, reload } = useApiGet<Resp>(`/api/dana-desa/publikasi?year=${year}${apbdes ? `&apbdes=${encodeURIComponent(apbdes)}` : ""}`);

  return (
    <div className="space-y-6">
      <style>{PRINT_CSS}</style>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button asChild variant="ghost" className="min-h-11">
          <Link href="/dana-desa">
            <ArrowLeft aria-hidden="true" />
            Kembali
          </Link>
        </Button>
        <Button type="button" className="min-h-11" onClick={() => window.print()} disabled={!data?.items.length}>
          <Printer aria-hidden="true" />
          Cetak
        </Button>
      </div>

      {loading ? (
        <p role="status" className="flex items-center gap-2 text-muted-foreground print:hidden">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Menyiapkan daftar…
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

      {data && !data.items.length ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground print:hidden">Belum ada kegiatan bersumber Dana Desa pada APB Desa tahun {data.year}.</p> : null}

      {data?.items.length ? (
        <article id="dd-print" className="space-y-4 bg-white p-6 text-black" aria-label={`Penggunaan Dana Desa ${data.year}`}>
          <header className="text-center">
            <p className="text-sm font-semibold uppercase">Pemerintah Desa {villageTitle(data.village.name)}</p>
            <h1 className="text-xl font-bold uppercase">Penggunaan Dana Desa Tahun {data.year}</h1>
            <p className="text-sm">{data.label}{data.status === "DRAFT" ? " (draf, belum ditetapkan)" : ""}</p>
          </header>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th scope="col" className={`${th} w-10`}>No</th>
                <th scope="col" className={th}>Nama kegiatan</th>
                <th scope="col" className={th}>Lokasi</th>
                <th scope="col" className={`${th} text-right`}>Anggaran</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((r, i) => (
                <tr key={r.activityCode}>
                  <td className={td}>{i + 1}</td>
                  <td className={td}>{r.name}</td>
                  <td className={td}>{r.location ?? "-"}</td>
                  <td className={`${td} text-right tabular-nums`}>{rupiah(r.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className={`${td} font-semibold`} colSpan={3}>Jumlah</td>
                <td className={`${td} text-right font-semibold tabular-nums`}>{rupiah(data.total)}</td>
              </tr>
            </tfoot>
          </table>
          <p className="text-xs">Dipublikasikan sesuai Peraturan Menteri Desa dan Pembangunan Daerah Tertinggal Nomor 16 Tahun 2025 Pasal 10. Pengaduan penggunaan Dana Desa dapat disampaikan kepada Kementerian Desa melalui layanan telepon 1500040.</p>
        </article>
      ) : null}
    </div>
  );
}
