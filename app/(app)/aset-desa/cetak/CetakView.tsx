"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApiGet } from "@/hooks/useApiGet";
import { acquiredLabel, categoryLabel, conditionLabel } from "@/lib/aset-desa/book";
import { DISPOSAL_REASON_LABEL, type DisposalReason } from "@/lib/aset-desa/catalog";
import type { ItemView } from "@/lib/aset-desa/service";
import { SELECT_CLASS } from "../_components/types";

interface Book {
  year: number;
  village: { name: string };
  items: ItemView[];
  disposed: ItemView[];
}

/** Menyembunyikan seluruh aplikasi saat mencetak, kecuali lembar buku inventaris. */
const PRINT_CSS =
  "@page{size:A4 landscape;margin:12mm}@media print{body *{visibility:hidden!important}#book-print,#book-print *{visibility:visible!important}#book-print{position:absolute;left:0;top:0;width:100%}}";

export function CetakView() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const { data, loading, error, reload } = useApiGet<Book>(`/api/aset-desa/buku?year=${year}`);

  return (
    <div className="space-y-6">
      <style>{PRINT_CSS}</style>
      <div className="space-y-4 print:hidden">
        <Button asChild variant="ghost" className="min-h-11">
          <Link href="/aset-desa">
            <ArrowLeft aria-hidden="true" />
            Kembali ke Aset Desa
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Buku Inventaris Aset Desa</h1>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <label htmlFor="buku-tahun" className="mb-1.5 block text-sm font-medium">
              Tahun
            </label>
            <select id="buku-tahun" className={SELECT_CLASS} value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, k) => thisYear - k).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" className="min-h-11" disabled={!data || data.items.length === 0} onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Cetak
          </Button>
          <Button asChild variant="outline" className="min-h-11">
            <a href={`/api/aset-desa/buku?year=${year}&format=csv`} download>
              <Download aria-hidden="true" />
              Unduh CSV
            </a>
          </Button>
        </div>
        <p className="max-w-prose text-sm text-muted-foreground">
          Buku berisi barang yang sudah dimiliki sampai akhir {year} dan belum dihapus pada tahun itu. Setelah dicetak, tanda tangani oleh Petugas/Pengurus Barang Milik Desa dan diketahui Sekretaris Desa.
        </p>
      </div>

      {loading ? (
        <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground print:hidden">
          <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          Menyusun buku…
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
        <article id="book-print" className="space-y-6 rounded-lg border bg-white p-6 text-black print:border-0 print:p-0">
          <header className="text-center">
            <h2 className="text-lg font-bold uppercase">Buku Inventaris Aset Desa</h2>
            <p className="font-semibold uppercase">Pemerintah Desa {data.village.name}</p>
            <p className="font-semibold">Tahun {data.year}</p>
          </header>
          {data.items.length === 0 ? (
            <p className="text-center text-sm">Tidak ada barang tercatat pada tahun ini.</p>
          ) : (
            <table className="w-full border-collapse text-xs">
              <caption className="sr-only">Buku Inventaris Aset Desa tahun {data.year}</caption>
              <thead>
                <tr className="bg-gray-100">
                  <th rowSpan={2} scope="col" className="border border-black p-1">No</th>
                  <th rowSpan={2} scope="col" className="border border-black p-1">Jenis Barang</th>
                  <th rowSpan={2} scope="col" className="border border-black p-1">Kode Barang</th>
                  <th rowSpan={2} scope="col" className="border border-black p-1">Identitas Barang</th>
                  <th rowSpan={2} scope="col" className="border border-black p-1">Jumlah</th>
                  <th colSpan={3} scope="colgroup" className="border border-black p-1">Asal Usul Barang</th>
                  <th rowSpan={2} scope="col" className="border border-black p-1">Tanggal Perolehan/ Pembelian</th>
                  <th rowSpan={2} scope="col" className="border border-black p-1">Ket.</th>
                </tr>
                <tr className="bg-gray-100">
                  <th scope="col" className="border border-black p-1">APBDesa</th>
                  <th scope="col" className="border border-black p-1">Perolehan Lain yang Sah</th>
                  <th scope="col" className="border border-black p-1">Aset/Kekayaan Asli Desa</th>
                </tr>
                <tr className="text-center">
                  {Array.from({ length: 10 }, (_, k) => (
                    <th key={k} scope="col" className="border border-black p-0.5 font-normal italic">
                      {k + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((i, n) => (
                  <tr key={i.id} className="align-top">
                    <td className="border border-black p-1 text-center">{n + 1}</td>
                    <td className="border border-black p-1">
                      {i.name}
                      <span className="block text-[10px] text-gray-600">{categoryLabel(i.category)}</span>
                    </td>
                    <td className="border border-black p-1">{i.itemCode}</td>
                    <td className="border border-black p-1">{i.identity}</td>
                    <td className="border border-black p-1 text-center">{i.quantity}</td>
                    <td className="border border-black p-1 text-center">{i.origin === "APBDES" ? "✓" : ""}</td>
                    <td className="border border-black p-1 text-center">{i.origin === "PEROLEHAN_LAIN" ? "✓" : ""}</td>
                    <td className="border border-black p-1 text-center">{i.origin === "ASLI_DESA" ? "✓" : ""}</td>
                    <td className="border border-black p-1">{acquiredLabel(i)}</td>
                    <td className="border border-black p-1">{[conditionLabel(i.condition), i.location, i.notes].filter(Boolean).join("; ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {data.disposed.length > 0 ? (
            <section aria-labelledby="hapus-judul" className="break-inside-avoid space-y-2">
              <h3 id="hapus-judul" className="text-center text-sm font-bold uppercase">
                Daftar Aset Desa yang Dihapus Tahun {data.year}
              </h3>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th scope="col" className="border border-black p-1">No</th>
                    <th scope="col" className="border border-black p-1">Jenis Barang</th>
                    <th scope="col" className="border border-black p-1">Banyaknya</th>
                    <th scope="col" className="border border-black p-1">Tahun Perolehan</th>
                    <th scope="col" className="border border-black p-1">Alasan</th>
                    <th scope="col" className="border border-black p-1">Nomor SK Kepala Desa</th>
                  </tr>
                </thead>
                <tbody>
                  {data.disposed.map((i, n) => (
                    <tr key={i.id}>
                      <td className="border border-black p-1 text-center">{n + 1}</td>
                      <td className="border border-black p-1">{i.name}</td>
                      <td className="border border-black p-1 text-center">{i.quantity}</td>
                      <td className="border border-black p-1 text-center">{i.acquiredYear}</td>
                      <td className="border border-black p-1">{i.disposalReason ? DISPOSAL_REASON_LABEL[i.disposalReason as DisposalReason] : ""}</td>
                      <td className="border border-black p-1">{i.disposalDecree}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          <footer className="grid break-inside-avoid grid-cols-2 gap-8 pt-6 text-center text-sm">
            <div>
              <p>Mengetahui:</p>
              <p>Sekretaris Desa</p>
              <p>Selaku Pembantu Pengelola Barang Milik Desa</p>
              <p className="mt-16">(……………………………………)</p>
            </div>
            <div>
              <p>Desa {data.village.name}, tanggal ……………………</p>
              <p>Petugas/Pengurus Barang Milik Desa</p>
              <p className="mt-[4.5rem]">(……………………………………)</p>
            </div>
          </footer>
        </article>
      ) : null}
    </div>
  );
}
