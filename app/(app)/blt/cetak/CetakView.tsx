"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtDate, rupiah, villageTitle } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import type { PrintData } from "../_components/types";

const KINDS = { sk: "Lampiran Keputusan Kepala Desa: Daftar Keluarga Penerima Manfaat BLT Desa", tandaterima: "Daftar Tanda Terima BLT Desa", rekap: "Rekap Penerima BLT Desa" } as const;
type Kind = keyof typeof KINDS;
const PRINT_CSS = "@page{size:A4 landscape;margin:12mm}@media print{body *{visibility:hidden!important}#blt-print,#blt-print *{visibility:visible!important}#blt-print{position:absolute;left:0;top:0;width:100%}}";
const th = "border border-black p-1.5 text-left align-top";
const td = "border border-black p-1.5 align-top";

type Resp = PrintData & { village: { name: string } };

/** Dokumen memuat NIK lengkap; diambil dari rute berizin ekspor dan tercatat di log audit. */
export function CetakView() {
  const sp = useSearchParams();
  const id = Number(sp.get("id"));
  const raw = sp.get("kind") ?? "";
  const kind: Kind = raw in KINDS ? (raw as Kind) : "sk";
  const { data, loading, error, reload } = useApiGet<Resp>(Number.isInteger(id) && id > 0 ? `/api/blt/${id}/cetak${kind === "rekap" ? "?semua=1" : ""}` : null);
  const pr = data?.program;

  return (
    <div className="space-y-6">
      <style>{PRINT_CSS}</style>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button asChild variant="ghost" className="min-h-11">
          <Link href={id > 0 ? `/blt/${id}` : "/blt"}>
            <ArrowLeft aria-hidden="true" />
            Kembali
          </Link>
        </Button>
        <Button type="button" className="min-h-11" onClick={() => window.print()} disabled={!data}>
          <Printer aria-hidden="true" />
          Cetak
        </Button>
        {(Object.keys(KINDS) as Kind[]).map((k) => (
          <Button key={k} asChild variant={k === kind ? "default" : "outline"} className="min-h-11">
            <Link href={`/blt/cetak?id=${id}&kind=${k}`}>{k === "sk" ? "Daftar penerima" : k === "tandaterima" ? "Tanda terima" : "Rekap"}</Link>
          </Button>
        ))}
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

      {data && pr ? (
        <article id="blt-print" className="space-y-4 bg-white p-6 text-black" aria-label={KINDS[kind]}>
          <header className="text-center">
            <p className="text-sm font-semibold uppercase">Pemerintah Desa {villageTitle(data.village.name)}</p>
            <h1 className="text-lg font-bold uppercase">{KINDS[kind]}</h1>
            <p className="text-sm">
              {pr.title} · Tahun {pr.year}
              {pr.decreeNumber ? ` · Keputusan Kepala Desa Nomor ${pr.decreeNumber}${pr.decreeDate ? ` tanggal ${fmtDate(pr.decreeDate)}` : ""}` : " · (nomor keputusan belum diisi)"}
            </p>
            {pr.musdesTitle ? <p className="text-sm">Hasil Musyawarah Desa{pr.musdesHeldOn ? ` tanggal ${fmtDate(pr.musdesHeldOn)}` : ""}</p> : null}
          </header>

          {kind === "sk" ? (
            <>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th scope="col" className={`${th} w-8`}>No</th>
                    <th scope="col" className={th}>Nama</th>
                    <th scope="col" className={th}>NIK</th>
                    <th scope="col" className={th}>Alamat</th>
                    <th scope="col" className={th}>Kelompok pekerjaan</th>
                    <th scope="col" className={th}>Kategori</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.no}>
                      <td className={td}>{r.no}</td>
                      <td className={td}>{r.name}</td>
                      <td className={`${td} tabular-nums`}>{r.nik ?? "(tanpa NIK)"}</td>
                      <td className={td}>{r.address}</td>
                      <td className={td}>{r.jobGroup}</td>
                      <td className={td}>{r.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="grid grid-cols-2 gap-6 text-xs">
                <div>
                  <p className="font-semibold">Rincian menurut kelompok pekerjaan</p>
                  <ul className="list-disc pl-5">
                    {data.byJobGroup.map((g) => (
                      <li key={g.jobGroup}>
                        {g.jobGroup}: {g.count} keluarga
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold">Jumlah keluarga penerima manfaat: {data.rows.length}</p>
                  <ul className="list-disc pl-5">
                    {data.byCategory.map((g) => (
                      <li key={g.category}>
                        Kategori {g.category}: {g.count} keluarga
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1">Besaran: {rupiah(pr.monthly)} per keluarga per bulan, {pr.totalMonths} bulan.</p>
                </div>
              </div>
            </>
          ) : null}

          {kind === "tandaterima" ? (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th scope="col" className={`${th} w-8`}>No</th>
                  <th scope="col" className={th}>Nama</th>
                  <th scope="col" className={th}>NIK</th>
                  <th scope="col" className={th}>Bulan</th>
                  <th scope="col" className={`${th} text-right`}>Jumlah</th>
                  <th scope="col" className={`${th} w-48`}>Tanda tangan penerima</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.no} className="h-12">
                    <td className={td}>{r.no}</td>
                    <td className={td}>{r.name}</td>
                    <td className={`${td} tabular-nums`}>{r.nik ?? "-"}</td>
                    <td className={td}>&nbsp;</td>
                    <td className={`${td} text-right`}>&nbsp;</td>
                    <td className={td}>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {kind === "rekap" ? (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th scope="col" className={`${th} w-8`}>No</th>
                  <th scope="col" className={th}>Nama</th>
                  <th scope="col" className={th}>Status</th>
                  <th scope="col" className={th}>Bulan dibayar</th>
                  <th scope="col" className={`${th} text-right`}>Jumlah dibayar</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.no}>
                    <td className={td}>{r.no}</td>
                    <td className={td}>{r.name}</td>
                    <td className={td}>{r.status === "AKTIF" ? "Aktif" : r.status === "DIGANTI" ? "Diganti" : "Berakhir tanpa pengganti"}</td>
                    <td className={td}>{r.paidMonths}</td>
                    <td className={`${td} text-right tabular-nums`}>{rupiah(r.paidAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          <div className="flex justify-end pt-6 text-xs">
            <div className="w-64 text-center">
              <p>{data.village.name}, ______________</p>
              <p>Kepala Desa</p>
              <p className="mt-16">______________________</p>
            </div>
          </div>
        </article>
      ) : null}
    </div>
  );
}
