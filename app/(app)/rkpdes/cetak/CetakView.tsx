"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtDate, rupiah, villageTitle } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import type { DetailResponse } from "../_components/types";

const KINDS = { rancangan: "Rancangan RKP Desa", usulan: "Daftar Usulan RKP Desa", tim: "Lampiran Tim Penyusun RKP Desa", pagu: "Pagu Indikatif dan Program Masuk Desa" } as const;
type Kind = keyof typeof KINDS;
const PRINT_CSS = "@page{size:A4 landscape;margin:12mm}@media print{body *{visibility:hidden!important}#doc-print,#doc-print *{visibility:visible!important}#doc-print{position:absolute;left:0;top:0;width:100%}}";
const th = "border border-black p-1.5 text-left align-top";
const td = "border border-black p-1.5 align-top";

export function CetakView() {
  const sp = useSearchParams();
  const id = Number(sp.get("id"));
  const raw = sp.get("kind") ?? "";
  const kind: Kind = raw in KINDS ? (raw as Kind) : "rancangan";
  const { data, loading, error, reload } = useApiGet<DetailResponse>(Number.isInteger(id) && id > 0 ? `/api/perencanaan/rkpdes/${id}` : null);
  const d = data?.document;
  const title = d ? `${KINDS[kind]} Tahun ${d.year}${d.revision > 0 ? ` (Perubahan ke-${d.revision})` : ""}` : KINDS[kind];

  return (
    <div className="space-y-6">
      <style>{PRINT_CSS}</style>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button asChild variant="ghost" className="min-h-11">
          <Link href={id > 0 ? `/rkpdes/${id}` : "/rkpdes"}>
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
            <Link href={`/rkpdes/cetak?id=${id}&kind=${k}`}>{KINDS[k]}</Link>
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

      {data && d ? (
        <article id="doc-print" className="space-y-5 rounded-lg border bg-white p-8 text-xs text-black print:border-0 print:p-0">
          <header className="text-center text-sm">
            <p className="font-semibold uppercase">Pemerintah Desa {villageTitle(data.village.name)}</p>
            <h2 className="text-base font-bold uppercase">{title}</h2>
            {d.legalDocument ? <p>Ditetapkan dengan Peraturan Desa {d.legalDocument.number}/{d.legalDocument.year}</p> : <p>(Rancangan — belum ditetapkan dengan Peraturan Desa)</p>}
          </header>

          {kind === "rancangan" ? (
            <>
              <section>
                <h3 className="mb-1 text-sm font-bold">A. Evaluasi pelaksanaan RKP Desa tahun sebelumnya</h3>
                <p className="whitespace-pre-wrap">{d.evaluationText ?? "(belum diisi)"}</p>
              </section>
              <section>
                <h3 className="mb-1 text-sm font-bold">B. Prioritas program, kegiatan, dan anggaran yang dikelola Desa</h3>
                <ActivityTable rows={d.activities.filter((a) => a.method === "SWAKELOLA" || !a.method)} data={data} />
              </section>
              <section>
                <h3 className="mb-1 text-sm font-bold">C. Prioritas program, kegiatan, dan anggaran melalui kerja sama antar-Desa dan pihak ketiga</h3>
                {d.activities.some((a) => a.method === "KERJASAMA_DESA" || a.method === "PIHAK_KETIGA") ? <ActivityTable rows={d.activities.filter((a) => a.method === "KERJASAMA_DESA" || a.method === "PIHAK_KETIGA")} data={data} /> : <p>(tidak ada)</p>}
              </section>
              <section>
                <h3 className="mb-1 text-sm font-bold">D. Program, kegiatan, dan anggaran penugasan dari Pemerintah dan pemerintah daerah (masuk Desa)</h3>
                <IncomingTable data={data} />
              </section>
              <section>
                <h3 className="mb-1 text-sm font-bold">E. Pelaksana kegiatan</h3>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className={th}>Kegiatan</th>
                      <th className={th}>Ketua</th>
                      <th className={th}>Sekretaris</th>
                      <th className={th}>Bendahara</th>
                      <th className={th}>Anggota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.activities.map((a) => (
                      <tr key={a.id}>
                        <td className={td}>{a.title}</td>
                        <td className={td}>{a.executorChair ?? ""}</td>
                        <td className={td}>{a.executorSecretary ?? ""}</td>
                        <td className={td}>{a.executorTreasurer ?? ""}</td>
                        <td className={td}>{a.executorMembers ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          ) : null}

          {kind === "usulan" ? (
            <section>
              <p className="mb-2">Daftar usulan kegiatan yang disampaikan kepada Bupati/Wali Kota melalui Camat{d.usulanRef ? ` (surat ${d.usulanRef})` : ""}{d.usulanSubmittedAt ? `, tanggal ${fmtDate(d.usulanSubmittedAt)}` : ""}.</p>
              <ActivityTable rows={d.activities.filter((a) => a.proposeToRegency)} data={data} />
            </section>
          ) : null}

          {kind === "tim" ? (
            <section>
              <p className="mb-2">Keputusan Kepala Desa tentang pembentukan tim penyusun RKP Desa{d.teamDecreeRef ? ` nomor ${d.teamDecreeRef}` : ""}{d.teamFormedAt ? `, tanggal ${fmtDate(d.teamFormedAt)}` : ""}.</p>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className={`${th} w-10`}>No</th>
                    <th className={th}>Nama</th>
                    <th className={th}>Kedudukan dalam tim</th>
                    <th className={th}>Jabatan</th>
                  </tr>
                </thead>
                <tbody>
                  {d.team.map((t, i) => (
                    <tr key={t.id}>
                      <td className={td}>{i + 1}</td>
                      <td className={td}>{t.name}</td>
                      <td className={td}>{t.roleLabel}</td>
                      <td className={td}>{t.position ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          {kind === "pagu" ? (
            <>
              <section>
                <h3 className="mb-1 text-sm font-bold">Pagu indikatif Desa</h3>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className={th}>Sumber dana</th>
                      <th className={`${th} text-right`}>Jumlah</th>
                      <th className={th}>Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.pagu.map((p) => (
                      <tr key={p.id}>
                        <td className={td}>{p.label}</td>
                        <td className={`${td} text-right`}>{rupiah(p.amount)}</td>
                        <td className={td}>{p.note ?? ""}</td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td className={td}>Jumlah</td>
                      <td className={`${td} text-right`}>{rupiah(d.paguTotal)}</td>
                      <td className={td} />
                    </tr>
                  </tbody>
                </table>
              </section>
              <section>
                <h3 className="mb-1 text-sm font-bold">Kegiatan pembangunan yang masuk Desa</h3>
                <IncomingTable data={data} />
              </section>
            </>
          ) : null}
        </article>
      ) : null}
    </div>
  );
}

function ActivityTable({ rows, data }: { rows: DetailResponse["document"]["activities"]; data: DetailResponse }) {
  if (!rows.length) return <p>(tidak ada kegiatan)</p>;
  const total = rows.reduce((s, a) => s + Number(a.estimatedBudget ?? 0), 0);
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-gray-100">
          <th className={`${th} w-8`}>No</th>
          <th className={th}>Kegiatan</th>
          <th className={th}>Lokasi</th>
          <th className={th}>Keluaran</th>
          <th className={th}>Sumber dana</th>
          <th className={th}>Cara</th>
          <th className={`${th} text-right`}>Anggaran</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((a, i) => (
          <tr key={a.id}>
            <td className={td}>{i + 1}</td>
            <td className={td}>
              {a.title}
              {a.activityCode ? <span className="block text-gray-600">{a.activityCode} {a.activityName}</span> : null}
            </td>
            <td className={td}>{a.location ?? ""}</td>
            <td className={td}>{a.outputName ? `${a.outputName}${a.outputVolume ? ` ${a.outputVolume} ${a.outputUnit ?? ""}` : ""}` : ""}</td>
            <td className={td}>{a.fundSource ? data.terms.paguSources[a.fundSource] ?? a.fundSource : ""}</td>
            <td className={td}>{a.method ? data.terms.methods[a.method] ?? a.method : ""}</td>
            <td className={`${td} text-right`}>{rupiah(a.estimatedBudget)}</td>
          </tr>
        ))}
        <tr className="font-bold">
          <td className={td} colSpan={6}>Jumlah</td>
          <td className={`${td} text-right`}>{rupiah(total)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function IncomingTable({ data }: { data: DetailResponse }) {
  const rows = data.document.incoming;
  if (!rows.length) return <p>(tidak ada)</p>;
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-gray-100">
          <th className={`${th} w-8`}>No</th>
          <th className={th}>Program/kegiatan</th>
          <th className={th}>Tingkat</th>
          <th className={th}>Instansi</th>
          <th className={th}>Lokasi</th>
          <th className={`${th} text-right`}>Perkiraan nilai</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p, i) => (
          <tr key={p.id}>
            <td className={td}>{i + 1}</td>
            <td className={td}>{p.name}</td>
            <td className={td}>{p.levelLabel}</td>
            <td className={td}>{p.agency ?? ""}</td>
            <td className={td}>{p.location ?? ""}</td>
            <td className={`${td} text-right`}>{p.amount ? rupiah(p.amount) : ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
