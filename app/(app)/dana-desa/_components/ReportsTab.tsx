"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill, STEP_STATE_LABEL, fmtDate, rupiah } from "@/components/app/perencanaan/shared";
import { localToday } from "@/lib/form-input";
import type { TabProps } from "./types";

const FIELD: Record<string, string> = { "laporan-lalu": "prevYearReportedOn", "laporan-fokus": "focusReportedOn", "laporan-tahap1": "stage1ReportedOn" };

const csvCell = (v: string | number | null): string => {
  const s = v === null ? "" : String(v);
  // Cegah injeksi rumus saat dibuka di spreadsheet.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function ReportsTab({ data, year, reload }: TabProps) {
  const o = data.outputs;
  const [date, setDate] = useState(() => localToday());
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function mark(key: string, on: string | null) {
    setBusy(key);
    setErr(null);
    const res = await fetch("/api/dana-desa", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ year, [FIELD[key]!]: on }) }).catch(() => null);
    setBusy(null);
    if (res?.ok) return reload();
    const j = await res?.json().catch(() => null);
    setErr(typeof j?.error === "string" ? j.error : "Gagal menyimpan. Coba lagi.");
  }

  function exportCsv() {
    const head = ["Bidang", "Kegiatan", "Uraian keluaran", "Volume keluaran", "Satuan keluaran", "Capaian keluaran (%)"];
    const rows = o.rows.map((r) => [r.bidang, `${r.activityCode} ${r.name}`, r.outputName, r.volume, r.unit, r.pct === null ? "" : r.pct.toFixed(2)]);
    const csv = "﻿" + [head, ...rows].map((r) => r.map((c) => csvCell(c as string | number | null)).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `capaian-keluaran-dana-desa-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section aria-labelledby="dd-st-h" className="space-y-3">
        <h2 id="dd-st-h" className="text-lg font-semibold">
          Penyaluran Dana Desa reguler {year}
        </h2>
        {data.stages ? (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <caption className="sr-only">Tahap penyaluran Dana Desa reguler</caption>
              <thead className="bg-muted text-left">
                <tr>
                  <th scope="col" className="px-3 py-2">Tahap</th>
                  <th scope="col" className="px-3 py-2 text-right">Bagian</th>
                  <th scope="col" className="px-3 py-2 text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.stages.map((s) => (
                  <tr key={s.stage}>
                    <td className="px-3 py-2">Tahap {s.stage === 1 ? "I" : "II"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{s.pct}%</td>
                    <td className="px-3 py-2 text-right tabular-nums">{rupiah(s.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Isi pagu reguler di tab Ringkasan untuk melihat rincian tahap penyaluran.</p>
        )}
        <p className="text-xs text-muted-foreground">Besaran tahap mengikuti PMK 7/2026 Pasal 23 (Desa mandiri: 60% lalu 40%). Penyaluran dilakukan setelah kabupaten/kota menyampaikan dokumen persyaratan secara lengkap.</p>
      </section>

      <section aria-labelledby="dd-ck-h" className="space-y-3">
        <h2 id="dd-ck-h" className="text-lg font-semibold">
          Kesiapan syarat dan laporan
        </h2>
        {err ? (
          <p role="alert" className="text-sm text-destructive">
            {err}
          </p>
        ) : null}
        <ul className="divide-y rounded-lg border">
          {data.checklist.map((c) => (
            <li key={c.key} className="space-y-2 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={c.state}>{STEP_STATE_LABEL[c.state] ?? c.state}</Pill>
                <span className="font-medium">{c.label}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {c.hint}
                {c.due ? ` Tenggat: ${fmtDate(c.due)}.` : ""}
                {c.doneOn ? ` Selesai: ${fmtDate(c.doneOn)}.` : ""}
              </p>
              {!c.auto && data.can.update ? (
                c.doneOn ? (
                  <Button type="button" variant="ghost" className="min-h-11" disabled={busy === c.key} onClick={() => mark(c.key, null)}>
                    Hapus tanda selesai
                  </Button>
                ) : (
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1">
                      <Label htmlFor={`ck-${c.key}`} className="text-xs">
                        Tanggal disampaikan
                      </Label>
                      <Input id={`ck-${c.key}`} type="date" className="h-11 w-44" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <Button type="button" variant="outline" className="min-h-11" disabled={busy === c.key || !date} onClick={() => mark(c.key, date)}>
                      Tandai sudah disampaikan
                    </Button>
                  </div>
                )
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="dd-out-h" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="dd-out-h" className="text-lg font-semibold">
            Capaian keluaran kegiatan Dana Desa
          </h2>
          {o.rows.length && data.can.export ? (
            <Button type="button" variant="outline" className="min-h-11" onClick={exportCsv}>
              <Download aria-hidden="true" />
              Unduh CSV
            </Button>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          Capaian keluaran Desa dihitung dari rata-rata persen capaian seluruh kegiatan (PMK 7/2026 Pasal 25 ayat 5). Volume dan realisasi diisi pada DPA kegiatan di menu APBDes; kegiatan yang belum diisi dihitung 0%.
        </p>
        {o.rows.length ? (
          <>
            <p role="status" className="rounded-md border bg-muted p-3 text-sm">
              Rata-rata capaian: <strong className="tabular-nums">{o.averagePct === null ? "-" : `${o.averagePct.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`}</strong> · {o.filled} kegiatan terisi, {o.missing} belum diisi
            </p>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[40rem] text-sm">
                <caption className="sr-only">Capaian keluaran per kegiatan</caption>
                <thead className="bg-muted text-left">
                  <tr>
                    <th scope="col" className="px-3 py-2">Kegiatan</th>
                    <th scope="col" className="px-3 py-2">Uraian keluaran</th>
                    <th scope="col" className="px-3 py-2 text-right">Volume</th>
                    <th scope="col" className="px-3 py-2 text-right">Realisasi</th>
                    <th scope="col" className="px-3 py-2 text-right">Capaian</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {o.rows.map((r) => (
                    <tr key={r.activityCode}>
                      <td className="px-3 py-2">
                        <span className="tabular-nums text-muted-foreground">{r.activityCode}</span> {r.name}
                      </td>
                      <td className="px-3 py-2">{r.outputName ?? <span className="text-muted-foreground">Belum diisi</span>}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.volume === null ? "-" : `${r.volume.toLocaleString("id-ID")} ${r.unit ?? ""}`}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.realized === null ? "-" : r.realized.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.pct === null ? "0% (belum diisi)" : `${r.pct.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada kegiatan bersumber Dana Desa.</p>
        )}
      </section>
    </>
  );
}
