"use client";

import Link from "next/link";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApiGet } from "@/hooks/useApiGet";
import { KIND_LABEL, type Kind } from "@/lib/dtsen/catalog";
import type { ProposalView } from "@/lib/dtsen/service";

interface ListResponse {
  items: ProposalView[];
  total: number;
}

const PRINT_CSS = "@page{size:A4 landscape;margin:12mm}@media print{body *{visibility:hidden!important}#dtsen-print,#dtsen-print *{visibility:visible!important}#dtsen-print{position:absolute;left:0;top:0;width:100%}}";
const fmt = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "-");

/** Daftar usulan yang sudah diverifikasi dan menunggu dibahas di musyawarah desa. Tanpa NIK. */
export function CetakView() {
  const { data, loading, error, reload } = useApiGet<ListResponse>("/api/dtsen/usulan?status=TERVERIFIKASI&pageSize=100");
  return (
    <div className="space-y-6">
      <style>{PRINT_CSS}</style>
      <div className="space-y-4 print:hidden">
        <Button asChild variant="ghost" className="min-h-11">
          <Link href="/dtsen">
            <ArrowLeft aria-hidden="true" />
            Kembali ke Usulan DTSEN
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Daftar untuk musyawarah desa</h1>
        <p className="max-w-prose text-sm text-muted-foreground">Berisi usulan yang sudah diverifikasi lapangan dan belum dibahas (maksimal 100). Cetak sebagai bahan pembahasan; hasil pembahasan dicatat kembali di layar Usulan DTSEN.</p>
        <Button type="button" className="min-h-11" disabled={!data || data.items.length === 0} onClick={() => window.print()}>
          <Printer aria-hidden="true" />
          Cetak
        </Button>
      </div>
      {loading ? (
        <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground print:hidden">
          <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          Menyusun daftar…
        </p>
      ) : null}
      {error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive print:hidden">
          <p>{error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={reload}>Coba lagi</Button>
        </div>
      ) : null}
      {data ? (
        <article id="dtsen-print" className="space-y-4 rounded-lg border bg-white p-6 text-black print:border-0 print:p-0">
          <header className="text-center">
            <h2 className="text-lg font-bold uppercase">Daftar Usulan Pemutakhiran DTSEN</h2>
            <p className="font-semibold">Bahan Musyawarah Desa</p>
          </header>
          {data.items.length === 0 ? (
            <p className="text-center text-sm">Tidak ada usulan yang menunggu musyawarah desa.</p>
          ) : (
            <table className="w-full border-collapse text-xs">
              <caption className="sr-only">Usulan DTSEN yang menunggu musyawarah desa</caption>
              <thead>
                <tr className="bg-gray-100">
                  <th scope="col" className="border border-black p-1">No</th>
                  <th scope="col" className="border border-black p-1">Nama</th>
                  <th scope="col" className="border border-black p-1">RT/RW</th>
                  <th scope="col" className="border border-black p-1">Jenis Usulan</th>
                  <th scope="col" className="border border-black p-1">Alasan</th>
                  <th scope="col" className="border border-black p-1">Hasil Verifikasi Lapangan</th>
                  <th scope="col" className="border border-black p-1">Keputusan Musyawarah</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((i, n) => (
                  <tr key={i.id} className="align-top">
                    <td className="border border-black p-1 text-center">{n + 1}</td>
                    <td className="border border-black p-1">{i.residentName}</td>
                    <td className="border border-black p-1 text-center">{i.residentRt ?? "-"}/{i.residentRw ?? "-"}</td>
                    <td className="border border-black p-1">{KIND_LABEL[i.kind as Kind] ?? i.kind}</td>
                    <td className="border border-black p-1">{i.reason}</td>
                    <td className="border border-black p-1">{i.verificationNote} <span className="text-gray-600">({fmt(i.verifiedAt)}, {i.verifiedBy})</span></td>
                    <td className="border border-black p-1">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
      ) : null}
    </div>
  );
}
