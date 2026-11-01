"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtDate, rupiah, villageTitle } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { regionLine } from "@/lib/format-region";
import type { PrintBundle } from "@/lib/pengadaan/service";

const DOCS = {
  sk: { title: "Keputusan Kepala Desa tentang Tim Pelaksana Kegiatan (TPK)", tab: "SK TPK" },
  negosiasi: { title: "Berita Acara Hasil Negosiasi", tab: "BA negosiasi" },
  spk: { title: "Surat Perjanjian (SPK)", tab: "SPK" },
  bast: { title: "Berita Acara Serah Terima (BAST)", tab: "BAST" },
} as const;
type Doc = keyof typeof DOCS;
const PRINT_CSS = "@page{size:A4 portrait;margin:18mm}@media print{body *{visibility:hidden!important}#pg-print,#pg-print *{visibility:visible!important}#pg-print{position:absolute;left:0;top:0;width:100%}}";
const th = "border border-black p-1.5 text-left align-top";
const td = "border border-black p-1.5 align-top";
const blank = (v: string | null | undefined, hint = "............") => (v && v.trim() ? v : hint);

function Sign({ cols }: { cols: { role: string; name: string | null }[] }) {
  return (
    <div className={`grid gap-6 pt-6 text-center text-sm ${cols.length > 2 ? "grid-cols-3" : "grid-cols-2"}`}>
      {cols.map((c) => (
        <div key={c.role} className="break-words">
          <p>{c.role}</p>
          <p className="h-20" />
          <p className="font-semibold underline">{blank(c.name, "(..............................)")}</p>
        </div>
      ))}
    </div>
  );
}

export function CetakView() {
  const sp = useSearchParams();
  const id = Number(sp.get("id"));
  const raw = sp.get("doc") ?? "";
  const doc: Doc = Object.hasOwn(DOCS, raw) ? (raw as Doc) : "sk";
  const { data, loading, error, reload } = useApiGet<PrintBundle>(Number.isInteger(id) && id > 0 ? `/api/pengadaan/${id}/cetak` : null);
  const p = data?.pkg;
  const place = data ? `${villageTitle(data.village.name)}` : "";

  return (
    <div className="space-y-6">
      <style>{PRINT_CSS}</style>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button asChild variant="ghost" className="min-h-11">
          <Link href={id > 0 ? `/pengadaan/${id}` : "/pengadaan"}>
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
            <Link href={`/pengadaan/cetak?id=${id}&doc=${k}`}>{DOCS[k].tab}</Link>
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
      {data && p ? (
        <>
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground print:hidden">Templat awal. Sesuaikan kalimatnya dengan Peraturan Bupati tentang pengadaan barang/jasa di desa kabupaten Anda sebelum ditandatangani. Isian yang kosong tampil sebagai titik-titik untuk ditulis tangan.</p>
          <article id="pg-print" className="space-y-4 break-words bg-white p-6 text-sm leading-relaxed text-black" aria-label={DOCS[doc].title}>
            <header className="text-center">
              <p className="font-semibold uppercase">Pemerintah Desa {place}</p>
              <p className="text-xs">{regionLine(data.village.district, data.village.regency)}</p>
              <h1 className="mt-2 text-base font-bold uppercase">{DOCS[doc].title}</h1>
              {doc === "sk" ? <p>Nomor: {blank(p.tpkDecreeNumber)}</p> : null}
              {doc === "negosiasi" ? <p>Nomor: {blank(p.negotiation.number)}</p> : null}
              {doc === "spk" ? <p>Nomor: {blank(p.contract.number)}</p> : null}
              {doc === "bast" ? <p>Nomor: {blank(p.bast.number)}</p> : null}
            </header>

            {doc === "sk" ? (
              <>
                <p>
                  Menetapkan Tim Pelaksana Kegiatan (TPK) untuk paket pengadaan <strong>{p.title}</strong> pada kegiatan {p.activityCode} {p.activityName}, Tahun Anggaran {p.year}, dengan susunan sebagai berikut:
                </p>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th scope="col" className={`${th} w-8`}>No</th>
                      <th scope="col" className={th}>Nama</th>
                      <th scope="col" className={th}>Kedudukan dalam TPK</th>
                      <th scope="col" className={th}>Unsur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...p.team].sort((a, b) => ["KETUA", "SEKRETARIS", "ANGGOTA"].indexOf(a.role) - ["KETUA", "SEKRETARIS", "ANGGOTA"].indexOf(b.role)).map((m, i) => (
                      <tr key={m.id}>
                        <td className={td}>{i + 1}</td>
                        <td className={td}>
                          {m.name}
                          {m.position ? <span className="block text-xs">{m.position}</span> : null}
                        </td>
                        <td className={td}>{m.roleLabel}</td>
                        <td className={td}>{m.elementLabel}</td>
                      </tr>
                    ))}
                    {!p.team.length ? (
                      <tr>
                        <td className={td} colSpan={4}>
                          (belum ada anggota)
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
                <p>TPK bertugas melaksanakan swakelola, atau memilih dan menetapkan penyedia, memeriksa dan melaporkan hasil pengadaan kepada Kasi/Kaur, serta mengumumkan hasil kegiatan pengadaan (Peraturan LKPP 12/2019 Pasal 11 ayat 5). Biaya pelaksanaan dibebankan pada APB Desa Tahun Anggaran {p.year}.</p>
                <p>Ditetapkan di {place}, tanggal {p.tpkDecreeDate ? fmtDate(p.tpkDecreeDate) : "............"}.</p>
                <Sign cols={[{ role: "Kepala Desa", name: data.signers.villageHead }]} />
              </>
            ) : null}

            {doc === "negosiasi" ? (
              <>
                <p>
                  Pada tanggal {p.negotiation.date ? fmtDate(p.negotiation.date) : "............"}, TPK paket <strong>{p.title}</strong> (kegiatan {p.activityCode} {p.activityName}, Tahun Anggaran {p.year}) melakukan negosiasi harga dengan penyedia sebagai berikut. Harga perkiraan sendiri (HPS): {rupiah(p.hps)}.
                </p>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th scope="col" className={th}>Penyedia</th>
                      <th scope="col" className={`${th} text-right`}>Harga penawaran</th>
                      <th scope="col" className={th}>Evaluasi</th>
                      <th scope="col" className={`${th} text-right`}>Harga hasil negosiasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.offers.map((o) => (
                      <tr key={o.id}>
                        <td className={td}>{o.providerName}</td>
                        <td className={`${td} text-right tabular-nums`}>{rupiah(o.price)}</td>
                        <td className={td}>{o.passed ? "Lulus" : "Tidak lulus"}</td>
                        <td className={`${td} text-right tabular-nums`}>{o.negotiated ? rupiah(o.negotiated) : "-"}</td>
                      </tr>
                    ))}
                    {!p.offers.length ? (
                      <tr>
                        <td className={td} colSpan={4}>
                          (belum ada penawaran)
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
                {(() => {
                  const w = p.offers.find((o) => o.isWinner);
                  return <p>Hasil: {w ? `penyedia ${w.providerName} ditetapkan dengan harga akhir ${rupiah(w.effective)}.` : "penyedia terpilih belum ditetapkan."}</p>;
                })()}
                {p.negotiation.note ? <p>Catatan: {p.negotiation.note}</p> : null}
                <p>Demikian berita acara ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
                <Sign cols={[{ role: "Ketua TPK", name: p.team.find((m) => m.role === "KETUA")?.name ?? null }, { role: "Sekretaris TPK", name: p.team.find((m) => m.role === "SEKRETARIS")?.name ?? null }, { role: "Penyedia", name: p.offers.find((o) => o.isWinner)?.providerName ?? null }]} />
              </>
            ) : null}

            {doc === "spk" ? (
              <>
                <p>Pada tanggal {p.contract.date ? fmtDate(p.contract.date) : "............"}, yang bertanda tangan di bawah ini:</p>
                <ol className="list-decimal space-y-1 pl-6">
                  <li>
                    {blank(p.executorName, "..............................")}, {blank(p.executorTitle, "Kasi/Kaur")} Pemerintah Desa {place}, selaku pelaksana kegiatan anggaran, selanjutnya disebut <strong>Pihak Pertama</strong>.
                  </li>
                  <li>
                    {blank(p.offers.find((o) => o.isWinner)?.providerName, "..............................")}
                    {p.offers.find((o) => o.isWinner)?.providerAddress ? `, ${p.offers.find((o) => o.isWinner)?.providerAddress}` : ""}, selaku penyedia, selanjutnya disebut <strong>Pihak Kedua</strong>.
                  </li>
                </ol>
                <p>Kedua pihak sepakat mengadakan perjanjian pengadaan dengan ketentuan berikut.</p>
                <ol className="list-decimal space-y-2 pl-6">
                  <li>
                    <strong>Lingkup pekerjaan.</strong> {p.title}. {p.scope ?? ""} {p.location ? `Lokasi: ${p.location}.` : ""}
                  </li>
                  <li>
                    <strong>Nilai perjanjian.</strong> {p.contract.value ? rupiah(p.contract.value) : "Rp............"} (sudah mencakup seluruh kewajiban Pihak Kedua menurut perjanjian ini).
                  </li>
                  <li>
                    <strong>Jangka waktu.</strong> Mulai {p.contract.startOn ? fmtDate(p.contract.startOn) : "............"} dan selesai {p.contract.endOn ? fmtDate(p.contract.endOn) : "............"}.
                  </li>
                  <li>
                    <strong>Sumber dana.</strong> APB Desa Tahun Anggaran {p.year}, kegiatan {p.activityCode} {p.activityName}
                    {p.accountCode ? `, rekening ${p.accountCode}` : ""}.
                  </li>
                  <li>
                    <strong>Pembayaran.</strong> Dilakukan setelah pekerjaan selesai sesuai perjanjian, setelah TPK memeriksa hasilnya dan Berita Acara Serah Terima ditandatangani.
                  </li>
                  <li>
                    <strong>Perubahan perjanjian.</strong> Hanya karena keadaan kahar atau perbedaan kondisi lapangan dengan gambar/spesifikasi, dengan persetujuan Kepala Desa.
                  </li>
                  <li>
                    <strong>Penyelesaian perselisihan.</strong> Diselesaikan dengan musyawarah untuk mufakat; bila tidak tercapai, dengan musyawarah yang dipimpin Kepala Desa; selanjutnya sesuai peraturan perundang-undangan.
                  </li>
                </ol>
                <p>Demikian perjanjian ini dibuat rangkap secukupnya, bermeterai cukup, dan mempunyai kekuatan hukum yang sama.</p>
                <Sign cols={[{ role: "Pihak Kedua (Penyedia)", name: p.offers.find((o) => o.isWinner)?.providerName ?? null }, { role: "Pihak Pertama (Kasi/Kaur)", name: p.executorName }]} />
              </>
            ) : null}

            {doc === "bast" ? (
              <>
                <p>Pada tanggal {p.bast.date ? fmtDate(p.bast.date) : "............"}, yang bertanda tangan di bawah ini:</p>
                <ol className="list-decimal space-y-1 pl-6">
                  <li>{blank(p.bast.handedBy, "..............................")}, selaku {p.mode === "SWAKELOLA" ? "Ketua TPK (yang menyerahkan)" : "penyedia (yang menyerahkan)"}.</li>
                  <li>{blank(p.bast.receivedBy ?? p.executorName, "..............................")}, selaku Kasi/Kaur pelaksana kegiatan anggaran (yang menerima).</li>
                </ol>
                <p>
                  Pihak yang menyerahkan telah menyerahkan hasil pekerjaan <strong>{p.title}</strong> (kegiatan {p.activityCode} {p.activityName}, Tahun Anggaran {p.year}
                  {p.contract.number ? `, SPK Nomor ${p.contract.number}` : ""}), dan pihak yang menerima menyatakan telah menerima dan memeriksanya. Progres pekerjaan: {p.progressPct}%.
                </p>
                {p.bast.note ? <p>Catatan pemeriksaan: {p.bast.note}</p> : null}
                <p>Demikian berita acara ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
                <Sign cols={[{ role: "Yang menyerahkan", name: p.bast.handedBy }, { role: "Yang menerima (Kasi/Kaur)", name: p.bast.receivedBy ?? p.executorName }, { role: "Mengetahui, Kepala Desa", name: data.signers.villageHead }]} />
              </>
            ) : null}
          </article>
        </>
      ) : null}
    </div>
  );
}
