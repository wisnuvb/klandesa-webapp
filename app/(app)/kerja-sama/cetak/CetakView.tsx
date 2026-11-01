"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtDate, rupiah, villageTitle } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { regionLine } from "@/lib/format-region";
import type { PrintBundle } from "@/lib/kerja-sama/service";

const DOCS = {
  penawaran: { title: "Surat Penawaran Kerja Sama", tab: "Surat penawaran" },
  kesepakatan: { title: "Berita Acara Kesepakatan Kerja Sama", tab: "BA kesepakatan" },
} as const;
type Doc = keyof typeof DOCS;
const PRINT_CSS = "@page{size:A4 portrait;margin:18mm}@media print{body *{visibility:hidden!important}#ks-print,#ks-print *{visibility:visible!important}#ks-print{position:absolute;left:0;top:0;width:100%}}";
const th = "border border-black p-1.5 text-left align-top";
const td = "border border-black p-1.5 align-top";
const dots = (v: string | null | undefined, hint = "............") => (v && v.trim() ? v : hint);

export function CetakView() {
  const sp = useSearchParams();
  const id = Number(sp.get("id"));
  const raw = sp.get("doc") ?? "";
  const doc: Doc = Object.hasOwn(DOCS, raw) ? (raw as Doc) : "penawaran";
  const { data, loading, error, reload } = useApiGet<PrintBundle>(Number.isInteger(id) && id > 0 ? `/api/kerja-sama/${id}/cetak` : null);
  const a = data?.agreement;
  const place = data ? villageTitle(data.village.name) : "";
  const contents: [string, string | null][] = a
    ? [
        ["Bidang dan/atau potensi Desa", a.fieldLabel],
        ["Ruang lingkup kerja sama", a.scope],
        ["Tata cara dan ketentuan pelaksanaan kerja sama", a.procedures],
        ["Jangka waktu", a.termStartOn || a.termEndOn ? `${a.termStartOn ? fmtDate(a.termStartOn) : "............"} sampai dengan ${a.termEndOn ? fmtDate(a.termEndOn) : "............"}` : null],
        ["Hak dan kewajiban para pihak", a.rights],
        ["Pendanaan", a.funding],
        ["Tata cara perubahan, penundaan, dan pembatalan", a.amendment],
        ["Penyelesaian perselisihan", a.dispute],
      ]
    : [];
  const self = a?.parties.find((p) => p.kind === "SELF");

  return (
    <div className="space-y-6">
      <style>{PRINT_CSS}</style>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button asChild variant="ghost" className="min-h-11">
          <Link href={id > 0 ? `/kerja-sama/${id}` : "/kerja-sama"}>
            <ArrowLeft aria-hidden="true" />
            Kembali
          </Link>
        </Button>
        <Button type="button" className="min-h-11" onClick={() => window.print()} disabled={!data}>
          <Printer aria-hidden="true" />
          Cetak
        </Button>
        {(Object.keys(DOCS) as Doc[]).map((k) => (
          <Button key={k} asChild variant={k === doc ? "default" : "outline"} className="min-h-11">
            <Link href={`/kerja-sama/cetak?id=${id}&doc=${k}`}>{DOCS[k].tab}</Link>
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
      {data && a ? (
        <>
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground print:hidden">Templat awal. Sesuaikan dengan peraturan daerah/bupati tentang kerja sama desa di kabupaten Anda. Isian kosong tampil sebagai titik-titik untuk ditulis tangan.</p>
          <article id="ks-print" className="space-y-4 break-words bg-white p-6 text-sm leading-relaxed text-black" aria-label={DOCS[doc].title}>
            <header className="text-center">
              <p className="font-semibold uppercase">Pemerintah Desa {place}</p>
              <p className="text-xs">{regionLine(data.village.district, data.village.regency)}</p>
              <h1 className="mt-2 text-base font-bold uppercase">{DOCS[doc].title}</h1>
              <p className="font-semibold">{a.title}</p>
            </header>

            {doc === "penawaran" ? (
              <>
                <p>
                  Nomor: ............ · Hal: Penawaran {a.kindLabel.toLowerCase()}
                  <br />
                  Kepada Yth. {a.parties.filter((p) => p.kind !== "SELF").map((p) => p.name).join(", ") || "............"}
                </p>
                <p>Dengan hormat, Pemerintah Desa {place} bermaksud menawarkan kerja sama dengan ketentuan pokok sebagai berikut (Permendagri 96/2017):</p>
                <ol className="list-decimal space-y-1 pl-6">
                  {contents.map(([k, v]) => (
                    <li key={k}>
                      <strong>{k}:</strong> <span className="whitespace-pre-line">{dots(v)}</span>
                    </li>
                  ))}
                </ol>
                <p>Mohon jawaban tertulis setelah penawaran ini dibahas dalam Musyawarah Desa. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.</p>
                <div className="grid grid-cols-2 pt-4 text-center">
                  <span />
                  <div>
                    <p>{place}, {a.offerSentOn ? fmtDate(a.offerSentOn) : "............"}</p>
                    <p>Kepala Desa</p>
                    <p className="h-20" />
                    <p className="font-semibold underline">{dots(data.villageHead ?? self?.representativeName, "(..............................)")}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p>
                  Pada tanggal {a.agreedOn ? fmtDate(a.agreedOn) : "............"}, para pihak berikut telah bersepakat melakukan {a.kindLabel.toLowerCase()}
                  {a.prepMusdes || a.offerMusdes ? `, setelah dibahas dalam Musyawarah Desa ${[a.prepMusdes, a.offerMusdes].filter(Boolean).map((m) => `"${m!.title}"${m!.heldOn ? ` (${fmtDate(m!.heldOn)})` : ""}`).join(" dan ")}` : ""}.
                </p>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th scope="col" className={`${th} w-8`}>No</th>
                      <th scope="col" className={th}>Pihak</th>
                      <th scope="col" className={th}>Diwakili oleh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.parties.map((p, i) => (
                      <tr key={p.id}>
                        <td className={td}>{i + 1}</td>
                        <td className={td}>{p.name}</td>
                        <td className={td}>{p.representativeName ? `${p.representativeName}${p.representativeTitle ? `, ${p.representativeTitle}` : ""}` : "............"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="font-semibold">Pokok kesepakatan</p>
                <ol className="list-decimal space-y-1 pl-6">
                  {contents.map(([k, v]) => (
                    <li key={k}>
                      <strong>{k}:</strong> <span className="whitespace-pre-line">{dots(v)}</span>
                    </li>
                  ))}
                </ol>
                <p className="font-semibold">Rencana anggaran biaya bersama</p>
                {a.budget.length ? (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th scope="col" className={th}>Uraian</th>
                        <th scope="col" className={th}>Ditanggung oleh</th>
                        <th scope="col" className={`${th} text-right`}>Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.budget.map((b) => (
                        <tr key={b.id}>
                          <td className={td}>{b.description}</td>
                          <td className={td}>{b.bearerName ?? "-"}</td>
                          <td className={`${td} text-right tabular-nums`}>{rupiah(b.amount)}</td>
                        </tr>
                      ))}
                      <tr>
                        <th scope="row" colSpan={2} className={th}>Total</th>
                        <td className={`${td} text-right font-semibold tabular-nums`}>{rupiah(a.total)}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <p>Tidak ada rencana biaya yang dibebankan; pendanaan sebagaimana dijelaskan pada pokok kesepakatan.</p>
                )}
                <p>Kesepakatan ini akan dituangkan dalam {a.kind === "ANTAR_DESA" ? "Peraturan Bersama Kepala Desa" : "Perjanjian Bersama"} dan ditandatangani paling lama 7 hari kerja sejak tanggal kesepakatan, disaksikan camat atas nama bupati/wali kota. Hasil berupa uang menjadi pendapatan Desa dan wajib masuk rekening kas desa; hasil berupa barang menjadi aset Desa.</p>
                <div className={`grid gap-6 pt-4 text-center ${a.parties.length > 2 ? "grid-cols-3" : "grid-cols-2"}`}>
                  {a.parties.map((p) => (
                    <div key={p.id} className="break-words">
                      <p>{p.name}</p>
                      <p className="h-20" />
                      <p className="font-semibold underline">{dots(p.representativeName, "(..............................)")}</p>
                    </div>
                  ))}
                </div>
                <div className="pt-4 text-center">
                  <p>Menyaksikan, Camat atas nama bupati/wali kota</p>
                  <p className="h-20" />
                  <p className="font-semibold underline">{dots(a.witnessName, "(..............................)")}</p>
                </div>
              </>
            )}
          </article>
        </>
      ) : null}
    </div>
  );
}
