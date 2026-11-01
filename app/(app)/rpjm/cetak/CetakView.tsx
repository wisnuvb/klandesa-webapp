"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtDate, rupiah, villageTitle } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import type { DetailResponse } from "../_components/types";

const KINDS = { rancangan: "Dokumen RPJM Desa", matriks: "Matriks Program dan Anggaran Indikatif RPJM Desa", tim: "Lampiran Tim Penyusun RPJM Desa" } as const;
type Kind = keyof typeof KINDS;
const PRINT_CSS = "@page{size:A4 landscape;margin:12mm}@media print{body *{visibility:hidden!important}#doc-print,#doc-print *{visibility:visible!important}#doc-print{position:absolute;left:0;top:0;width:100%}}";
const th = "border border-black p-1.5 text-left align-top";
const thr = "border border-black p-1.5 text-right align-top";
const td = "border border-black p-1.5 align-top";
const tdr = "border border-black p-1.5 text-right align-top tabular-nums";

export function CetakView() {
  const sp = useSearchParams();
  const id = Number(sp.get("id"));
  const raw = sp.get("kind") ?? "";
  const kind: Kind = Object.hasOwn(KINDS, raw) ? (raw as Kind) : "rancangan";
  const { data, loading, error, reload } = useApiGet<DetailResponse>(Number.isInteger(id) && id > 0 ? `/api/perencanaan/rpjm/${id}` : null);
  const p = data?.plan;

  return (
    <div className="space-y-6 pb-24">
      <style>{PRINT_CSS}</style>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button asChild variant="ghost" className="min-h-11">
          <Link href={id > 0 ? `/rpjm/${id}` : "/rpjm"}>
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
            <Link href={`/rpjm/cetak?id=${id}&kind=${k}`}>{KINDS[k]}</Link>
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
        <article id="doc-print" className="space-y-5 overflow-x-auto rounded-lg border bg-white p-8 text-xs text-black print:overflow-visible print:border-0 print:p-0">
          <header className="text-center text-sm">
            <p className="font-semibold uppercase">Pemerintah Desa {villageTitle(data.village.name)}</p>
            <h2 className="text-base font-bold uppercase">
              {KINDS[kind]} {p.periodStart}–{p.periodEnd}
            </h2>
            {p.legalDocument ? <p>Ditetapkan dengan Peraturan Desa {p.legalDocument.number}/{p.legalDocument.year}</p> : <p>(Rancangan — belum ditetapkan dengan Peraturan Desa)</p>}
          </header>

          {kind === "rancangan" ? (
            <>
              <section>
                <h3 className="mb-1 text-sm font-bold">A. Visi dan misi Kepala Desa</h3>
                <p className="font-semibold">Visi</p>
                <p className="mb-2 whitespace-pre-wrap break-words">{p.vision ?? "(belum diisi)"}</p>
                <p className="font-semibold">Misi</p>
                <p className="whitespace-pre-wrap break-words">{p.mission ?? "(belum diisi)"}</p>
              </section>
              <section>
                <h3 className="mb-1 text-sm font-bold">B. Arah kebijakan pembangunan Desa</h3>
                <p className="whitespace-pre-wrap break-words">{p.policyDirection ?? "(belum diisi)"}</p>
              </section>
              {p.reviewSummary ? (
                <section>
                  <h3 className="mb-1 text-sm font-bold">C. Ringkasan hasil pengkajian keadaan Desa</h3>
                  <p className="whitespace-pre-wrap break-words">{p.reviewSummary}</p>
                </section>
              ) : null}
              <section>
                <h3 className="mb-1 text-sm font-bold">{p.reviewSummary ? "D" : "C"}. Rencana program dan kegiatan per bidang</h3>
                {Object.entries(data.terms.fields).map(([code, label]) => (
                  <div key={code} className="mb-3">
                    <p className="mb-1 font-semibold">
                      Bidang {code}. {label}
                    </p>
                    <ProgramTable rows={p.programs.filter((x) => x.fieldCode === code)} data={data} />
                  </div>
                ))}
              </section>
              <MatrixTable data={data} />
            </>
          ) : null}

          {kind === "matriks" ? <MatrixTable data={data} /> : null}

          {kind === "tim" ? (
            <section>
              <p className="mb-2">
                Keputusan Kepala Desa tentang pembentukan tim penyusun RPJM Desa{p.teamDecreeRef ? ` nomor ${p.teamDecreeRef}` : ""}
                {p.teamFormedAt ? `, tanggal ${fmtDate(p.teamFormedAt)}` : ""}.
              </p>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className={`${th} w-10`}>No</th>
                    <th className={th}>Nama</th>
                    <th className={th}>Kedudukan dalam tim</th>
                    <th className={th}>Jabatan</th>
                    <th className={th}>L/P</th>
                  </tr>
                </thead>
                <tbody>
                  {p.team.map((t, i) => (
                    <tr key={t.id}>
                      <td className={td}>{i + 1}</td>
                      <td className={td}>{t.name}</td>
                      <td className={td}>{t.roleLabel}</td>
                      <td className={td}>{t.position ?? ""}</td>
                      <td className={td}>{t.gender ?? ""}</td>
                    </tr>
                  ))}
                  {p.team.length === 0 ? (
                    <tr>
                      <td className={td} colSpan={5}>
                        (belum ada anggota)
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </section>
          ) : null}
        </article>
      ) : null}
    </div>
  );
}

function ProgramTable({ rows, data }: { rows: DetailResponse["plan"]["programs"]; data: DetailResponse }) {
  if (rows.length === 0) return <p>(tidak ada)</p>;
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-gray-100">
          <th className={`${th} w-10`}>No</th>
          <th className={th}>Program/kegiatan</th>
          <th className={th}>Lokasi</th>
          <th className={th}>Volume</th>
          <th className={th}>Sasaran/manfaat</th>
          <th className={th}>Tahun</th>
          <th className={thr}>Anggaran indikatif</th>
          <th className={th}>Sumber dana</th>
          <th className={th}>Pola pelaksanaan</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((a, i) => (
          <tr key={a.id}>
            <td className={td}>{i + 1}</td>
            <td className={td}>
              {a.title}
              {a.activityCode ? <span className="block text-[10px]">Kode {a.activityCode}</span> : null}
            </td>
            <td className={td}>{a.location ?? ""}</td>
            <td className={td}>{a.outputVolume ? `${a.outputVolume.replace(/\.00$/, "")} ${a.outputUnit ?? ""}` : ""}</td>
            <td className={td}>{a.benefit ?? ""}</td>
            <td className={td}>{a.year}</td>
            <td className={tdr}>{rupiah(a.budget)}</td>
            <td className={td}>{a.fundSource ? data.terms.paguSources[a.fundSource] ?? a.fundSource : ""}</td>
            <td className={td}>{a.method ? data.terms.methods[a.method] ?? a.method : ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MatrixTable({ data }: { data: DetailResponse }) {
  const m = data.plan.matrix;
  return (
    <section>
      <h3 className="mb-1 text-sm font-bold">Anggaran indikatif per bidang per tahun (rupiah)</h3>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className={th}>Bidang</th>
            {m.years.map((y) => (
              <th key={y} className={thr}>
                {y}
              </th>
            ))}
            <th className={thr}>Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {m.fields.map((f) => (
            <tr key={f.code}>
              <td className={td}>
                {f.code}. {f.label}
              </td>
              {f.perYear.map((v, i) => (
                <td key={m.years[i]} className={tdr}>
                  {rupiah(v)}
                </td>
              ))}
              <td className={`${tdr} font-semibold`}>{rupiah(f.total)}</td>
            </tr>
          ))}
          <tr className="bg-gray-100 font-semibold">
            <td className={td}>Jumlah</td>
            {m.yearTotals.map((v, i) => (
              <td key={m.years[i]} className={tdr}>
                {rupiah(v)}
              </td>
            ))}
            <td className={tdr}>{rupiah(m.total)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-1">Angka anggaran bersifat indikatif dan tidak mengikat; anggaran definitif ditetapkan dalam APB Desa tiap tahun.</p>
    </section>
  );
}
