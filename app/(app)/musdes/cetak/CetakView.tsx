"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtDate, villageTitle } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import type { DetailResponse } from "../_components/types";

/** Menyembunyikan seluruh aplikasi saat mencetak, kecuali lembar yang dicetak. */
const PRINT_CSS = "@page{size:A4 portrait;margin:15mm}@media print{body *{visibility:hidden!important}#doc-print,#doc-print *{visibility:visible!important}#doc-print{position:absolute;left:0;top:0;width:100%}}";

export function CetakView() {
  const sp = useSearchParams();
  const id = Number(sp.get("id"));
  const kind = sp.get("kind") === "berita-acara" ? "berita-acara" : "hadir";
  const { data, loading, error, reload } = useApiGet<DetailResponse>(Number.isInteger(id) && id > 0 ? `/api/musdes/${id}` : null);

  return (
    <div className="space-y-6">
      <style>{PRINT_CSS}</style>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button asChild variant="ghost" className="min-h-11">
          <Link href={Number.isInteger(id) && id > 0 ? `/musdes/${id}` : "/musdes"}>
            <ArrowLeft aria-hidden="true" />
            Kembali
          </Link>
        </Button>
        <Button type="button" className="min-h-11" onClick={() => window.print()} disabled={!data}>
          <Printer aria-hidden="true" />
          Cetak
        </Button>
        <Button asChild variant={kind === "hadir" ? "default" : "outline"} className="min-h-11">
          <Link href={`/musdes/cetak?id=${id}&kind=hadir`}>Daftar hadir</Link>
        </Button>
        <Button asChild variant={kind === "berita-acara" ? "default" : "outline"} className="min-h-11">
          <Link href={`/musdes/cetak?id=${id}&kind=berita-acara`}>Berita acara</Link>
        </Button>
      </div>

      {loading ? (
        <p role="status" className="flex items-center gap-2 text-muted-foreground print:hidden">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Menyiapkan dokumen…
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
        <article id="doc-print" className="space-y-5 rounded-lg border bg-white p-8 text-black print:border-0 print:p-0">
          <header className="text-center">
            <p className="font-semibold uppercase">Pemerintah Desa {villageTitle(data.village.name)}</p>
            <h2 className="text-lg font-bold uppercase">{kind === "hadir" ? "Daftar Hadir" : "Berita Acara"}</h2>
            <p className="font-semibold">{data.meeting.title}</p>
            {kind === "berita-acara" && data.meeting.minutesNo ? <p className="text-sm">Nomor: {data.meeting.minutesNo}</p> : null}
          </header>

          <dl className="grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
            <dt>Hari/tanggal</dt>
            <dd>: {fmtDate(data.meeting.heldOn ?? data.meeting.scheduledOn)}</dd>
            {data.meeting.startTime ? (
              <>
                <dt>Pukul</dt>
                <dd>: {data.meeting.startTime} WIB</dd>
              </>
            ) : null}
            <dt>Tempat</dt>
            <dd>: {data.meeting.location ?? "-"}</dd>
            {data.meeting.topic ? (
              <>
                <dt>Pokok bahasan</dt>
                <dd>: {data.meeting.topic}</dd>
              </>
            ) : null}
          </dl>

          {kind === "hadir" ? (
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Daftar hadir {data.meeting.title}</caption>
              <thead>
                <tr className="bg-gray-100">
                  <th scope="col" className="w-10 border border-black p-1.5">No</th>
                  <th scope="col" className="border border-black p-1.5 text-left">Nama</th>
                  <th scope="col" className="border border-black p-1.5 text-left">Unsur</th>
                  <th scope="col" className="w-12 border border-black p-1.5">L/P</th>
                  <th scope="col" className="w-40 border border-black p-1.5">Tanda tangan</th>
                </tr>
              </thead>
              <tbody>
                {data.attendees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="border border-black p-3 text-center">Belum ada peserta tercatat.</td>
                  </tr>
                ) : (
                  data.attendees.map((a, i) => (
                    <tr key={a.id} className="h-9">
                      <td className="border border-black p-1.5 text-center">{i + 1}</td>
                      <td className="border border-black p-1.5">{a.name}</td>
                      <td className="border border-black p-1.5">{a.unsurLabel}</td>
                      <td className="border border-black p-1.5 text-center">{a.gender ?? ""}</td>
                      <td className="border border-black p-1.5">{data.meeting.status === "PLANNED" ? "" : a.present ? `${i + 1}. ______` : "tidak hadir"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <div className="space-y-4 text-sm">
              <p>
                Pada hari ini, {fmtDate(data.meeting.heldOn ?? data.meeting.scheduledOn)}, bertempat di {data.meeting.location ?? "-"}, telah dilaksanakan {data.meeting.kindLabel} dengan peserta yang hadir sebanyak {data.counts.present} orang ({data.counts.women} di antaranya perempuan).
              </p>
              {data.meeting.agenda ? (
                <div>
                  <p className="font-semibold">Acara</p>
                  <p className="whitespace-pre-wrap">{data.meeting.agenda}</p>
                </div>
              ) : null}
              <div>
                <p className="font-semibold">Jalannya musyawarah</p>
                <p className="whitespace-pre-wrap">{data.meeting.minutesText ?? "(isi berita acara belum ditulis)"}</p>
              </div>
              <div>
                <p className="font-semibold">Keputusan</p>
                {data.decisions.length ? (
                  <ol className="list-decimal space-y-1 pl-6">
                    {data.decisions.map((d) => (
                      <li key={d.id}>{d.text}</li>
                    ))}
                  </ol>
                ) : (
                  <p>(tidak ada keputusan tercatat)</p>
                )}
              </div>
              <p>Demikian berita acara ini dibuat dengan sebenarnya.</p>
              <div className="grid grid-cols-2 gap-8 pt-6 text-center">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-semibold">{data.meeting.organizer === "Kepala Desa" ? "Kepala Desa" : "Ketua BPD"}</p>
                  <div className="h-20" />
                  <p>(______________________)</p>
                </div>
                <div>
                  <p>&nbsp;</p>
                  <p className="font-semibold">Notulen</p>
                  <div className="h-20" />
                  <p>(______________________)</p>
                </div>
              </div>
            </div>
          )}
        </article>
      ) : null}
    </div>
  );
}
