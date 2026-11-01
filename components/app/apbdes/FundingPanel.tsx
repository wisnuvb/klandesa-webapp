"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill, rupiah } from "@/components/app/perencanaan/shared";
import { fmtDate } from "@/components/app/perencanaan/shared";
import { RequestSppDialog } from "./RequestSppDialog";

interface Funding {
  spps: { id: number; label: string; status: string; statusLabel: string; activityCode: string; activityName: string; gross: string; used: string; returned: string; available: string; paidAt: string | null }[];
  unspent: string;
  fundable: string;
  available: string;
}

const TONE: Record<string, string> = { DIAJUKAN: "soon", DIVERIFIKASI: "soon", DISETUJUI: "info", DIBAYAR: "done", DITOLAK: "overdue" };

/**
 * Pendanaan pembayaran lewat SPP (Permendagri 20/2018 Pasal 52-56): daftar SPP modul ini beserta sisa dananya, dan tombol mengajukan SPP baru.
 * Pembayaran baru hanya dapat dicatat dari SPP yang sudah dibayar; verifikasi, persetujuan, dan pembayaran SPP dilakukan di menu APBDes.
 */
export function FundingPanel({ kind, funding, canRequest, year, title, summary, url, extraBody, defaultActivityCode, noun, reload }: { kind: "BLT" | "PKTD" | "KDMP"; funding: Funding; canRequest: boolean; year: number; title: string; summary: string; url: string; extraBody?: Record<string, unknown>; defaultActivityCode?: string | null; noun: string; reload: () => void }) {
  const [asking, setAsking] = useState(false);
  const can = canRequest && Number(funding.fundable) > 0;
  return (
    <section aria-labelledby={`fp-${kind}-h`} className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 id={`fp-${kind}-h`} className="text-lg font-semibold">
            Dana dari SPP
          </h2>
          <p className="text-sm text-muted-foreground">
            {noun} hanya dapat dicatat dari SPP yang sudah dibayar (diajukan, diverifikasi Sekretaris Desa, disetujui Kepala Desa, lalu dibayar di menu{" "}
            <Link href="/apbdes" className="underline underline-offset-4">
              APBDes
            </Link>
            ).
          </p>
        </div>
        {canRequest ? (
          <Button type="button" className="min-h-11" onClick={() => setAsking(true)} disabled={!can} aria-describedby={can ? undefined : `fp-${kind}-why`}>
            Ajukan SPP
          </Button>
        ) : null}
      </div>
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[
          ["Dana SPP siap dipakai", rupiah(funding.available)],
          ["Diajukan/dibayar, belum disalurkan", rupiah(funding.unspent)],
          ["Kebutuhan belum didanai", rupiah(funding.fundable)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-md border p-3">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="text-lg font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {canRequest && !can ? (
        <p id={`fp-${kind}-why`} className="text-sm text-muted-foreground">
          Belum ada kebutuhan yang dapat didanai SPP baru.
        </p>
      ) : null}
      {funding.spps.length ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[36rem] text-sm">
            <caption className="sr-only">SPP yang mendanai {noun.toLowerCase()}</caption>
            <thead className="bg-muted text-left">
              <tr>
                <th scope="col" className="px-3 py-2">SPP</th>
                <th scope="col" className="px-3 py-2">Status</th>
                <th scope="col" className="px-3 py-2 text-right">Jumlah</th>
                <th scope="col" className="px-3 py-2 text-right">Terpakai</th>
                <th scope="col" className="px-3 py-2 text-right">Sisa</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {funding.spps.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2">
                    <span className="font-medium">{s.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {s.activityCode} {s.activityName}
                      {s.paidAt ? ` · dibayar ${fmtDate(s.paidAt)}` : ""}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Pill tone={TONE[s.status] ?? "neutral"}>{s.statusLabel}</Pill>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{rupiah(s.gross)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{rupiah(s.used)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.status === "DIBAYAR" ? rupiah(s.available) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada SPP. Ajukan SPP agar pembayaran dapat dicatat.</p>
      )}
      <Link href="/apbdes" className="inline-flex min-h-11 items-center gap-0.5 text-sm underline underline-offset-4">
        Proses SPP di APBDes
        <ArrowUpRight aria-hidden="true" className="size-4" />
      </Link>
      {asking ? <RequestSppDialog kind={kind} year={year} title={title} summary={summary} url={url} fundable={funding.fundable} extraBody={extraBody} defaultActivityCode={defaultActivityCode} onClose={() => setAsking(false)} onDone={() => { setAsking(false); reload(); }} /> : null}
    </section>
  );
}
