"use client";

import Link from "next/link";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtDate, rupiah, villageTitle } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import type { registrationPack } from "@/lib/bumdes/service";

type Pack = Extract<Awaited<ReturnType<typeof registrationPack>>, { ok: true }>["data"];

const PRINT_CSS = "@page{size:A4;margin:14mm}@media print{body *{visibility:hidden!important}#bd-reg,#bd-reg *{visibility:visible!important}#bd-reg{position:absolute;left:0;top:0;width:100%}}";
const th = "w-1/3 border border-black p-1.5 text-left align-top font-normal";
const td = "border border-black p-1.5 align-top";

/** Lembar data pendaftaran BUM Desa: bahan mengisi formulir di Sistem Informasi Desa (Permendesa PDTT 3/2021 Pasal 9-10). */
export function CetakView() {
  const { data, loading, error, reload } = useApiGet<Pack>("/api/bumdes/pendaftaran");
  const row = (k: string, v: string | null | undefined) => (
    <tr key={k}>
      <th scope="row" className={th}>{k}</th>
      <td className={`${td} break-words`}>{v || "-"}</td>
    </tr>
  );
  return (
    <div className="space-y-6 pb-24">
      <style>{PRINT_CSS}</style>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button asChild variant="ghost" className="min-h-11">
          <Link href="/bumdes">
            <ArrowLeft aria-hidden="true" />
            Kembali
          </Link>
        </Button>
        <Button type="button" className="min-h-11" onClick={() => window.print()} disabled={!data}>
          <Printer aria-hidden="true" />
          Cetak
        </Button>
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
        <article id="bd-reg" className="min-w-0 space-y-4 bg-white p-4 text-black" aria-label="Lembar data pendaftaran BUM Desa">
          <header className="text-center">
            <p className="text-sm font-semibold uppercase">Pemerintah Desa {villageTitle(data.village?.name ?? "")}</p>
            <h1 className="text-lg font-bold uppercase">Data Pendaftaran BUM Desa</h1>
            <p className="text-xs">Bahan pengisian pendaftaran di Sistem Informasi Desa (Permendesa PDTT 3/2021 Pasal 9). Dicetak {fmtDate(new Date().toISOString())}.</p>
          </header>
          <section>
            <h2 className="mb-1 text-sm font-semibold">A. Identitas</h2>
            <table className="w-full border-collapse text-sm">
              <tbody>
                {row("Nama BUM Desa", data.bumdes.name)}
                {row("Jenis", "BUM Desa (didirikan satu desa)")}
                {row("Desa pendiri", data.village ? `${data.village.name}, Kec. ${data.village.district}, ${data.village.regency}, ${data.village.province}` : null)}
                {row("Alamat kedudukan", data.bumdes.address)}
                {row("Telepon / surel", [data.bumdes.phone, data.bumdes.email].filter(Boolean).join(" / "))}
                {row("Status badan hukum", data.profile.legalStatusLabel)}
                {row("Tanggal pendirian", data.profile.establishedOn ? fmtDate(data.profile.establishedOn) : null)}
                {row("Bidang usaha", data.profile.businessFields)}
                {row("Modal awal", data.profile.initialCapital ? rupiah(data.profile.initialCapital) : null)}
              </tbody>
            </table>
          </section>
          <section>
            <h2 className="mb-1 text-sm font-semibold">B. Dokumen dan nomor</h2>
            <table className="w-full border-collapse text-sm">
              <tbody>
                {row("Musyawarah Desa pendirian", data.profile.establishMeeting ? `${data.profile.establishMeeting.title}${data.profile.establishMeeting.heldOn ? ` (${fmtDate(data.profile.establishMeeting.heldOn)})` : ""}` : null)}
                {row("Peraturan Desa pendirian dan Anggaran Dasar", data.profile.perdesNumber ? `${data.profile.perdesNumber}${data.profile.perdesDate ? `, ${fmtDate(data.profile.perdesDate)}` : ""}` : null)}
                {row("Anggaran Rumah Tangga (Perkades)", data.profile.artNumber ? `${data.profile.artNumber}${data.profile.artDate ? `, ${fmtDate(data.profile.artDate)}` : ""}` : null)}
                {row("Persetujuan nama", data.profile.nameApprovalNo ? `${data.profile.nameApprovalNo}${data.profile.nameApprovalDate ? `, ${fmtDate(data.profile.nameApprovalDate)}` : ""}` : null)}
                {row("Sertifikat pendaftaran badan hukum", data.profile.certificateNo ? `${data.profile.certificateNo}${data.profile.certificateDate ? `, ${fmtDate(data.profile.certificateDate)}` : ""}` : null)}
                {row("NIB", data.profile.nib)}
                {row("NPWP", data.profile.npwp)}
              </tbody>
            </table>
          </section>
          <section>
            <h2 className="mb-1 text-sm font-semibold">C. Pengurus</h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th scope="col" className={td}>Jabatan</th>
                  <th scope="col" className={td}>Nama</th>
                  <th scope="col" className={td}>SK</th>
                  <th scope="col" className={td}>Masa jabatan</th>
                </tr>
              </thead>
              <tbody>
                {data.officers.length ? (
                  data.officers.map((o) => (
                    <tr key={o.id}>
                      <td className={td}>{o.roleLabel}</td>
                      <td className={td}>{o.name}</td>
                      <td className={td}>{[o.skNumber, o.skDate ? fmtDate(o.skDate) : null].filter(Boolean).join(", ") || "-"}</td>
                      <td className={td}>{o.startOn ? fmtDate(o.startOn) : "-"} s.d. {o.termEnd ? fmtDate(o.termEnd) : "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className={td} colSpan={4}>Belum ada pengurus tercatat.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
          <section>
            <h2 className="mb-1 text-sm font-semibold">D. Unit usaha</h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th scope="col" className={td}>Nama</th>
                  <th scope="col" className={td}>Kategori</th>
                  <th scope="col" className={td}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.units.length ? (
                  data.units.map((u) => (
                    <tr key={u.id}>
                      <td className={td}>{u.name}</td>
                      <td className={td}>{u.category ?? "-"}</td>
                      <td className={td}>{u.status === "active" ? "Aktif" : u.status}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className={td} colSpan={3}>Belum ada unit usaha.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
          <p className="text-xs">Dokumen pendukung yang diunggah di Sistem Informasi Desa: berita acara Musyawarah Desa pendirian, Peraturan Desa dan Anggaran Dasar, Anggaran Rumah Tangga, dan rencana program kerja (Pasal 10). Berkas itu tidak disimpan di lembar ini.</p>
        </article>
      ) : null}
    </div>
  );
}
