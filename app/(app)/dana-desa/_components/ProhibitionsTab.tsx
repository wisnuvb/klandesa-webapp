"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pill, ReasonDialog, rupiah } from "@/components/app/perencanaan/shared";
import type { TabProps } from "./types";

type Hit = TabProps["data"]["analysis"]["prohibitions"][number];

export function ProhibitionsTab({ data, year, reload }: TabProps) {
  const [target, setTarget] = useState<Hit | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const open = data.analysis.prohibitions.filter((h) => !h.exceptionReason);
  const excepted = data.exceptions;

  async function revoke(id: number) {
    setErr(null);
    const res = await fetch(`/api/dana-desa/pengecualian?id=${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) return reload();
    const j = await res?.json().catch(() => null);
    setErr(typeof j?.error === "string" ? j.error : "Gagal mencabut pengecualian.");
  }

  return (
    <>
      <section aria-labelledby="dd-lr-h" className="space-y-3">
        <h2 id="dd-lr-h" className="text-lg font-semibold">
          Indikasi larangan penggunaan Dana Desa
        </h2>
        <p className="text-sm text-muted-foreground">
          Pemeriksaan otomatis atas baris anggaran bersumber Dana Desa terhadap 8 larangan (Permendesa 16/2025 Lampiran II.J). <strong>Berdasar rekening</strong> berarti pasti terkait larangan; <strong>berdasar uraian</strong> hanyalah perkiraan dari kata kunci dan perlu dicek orangnya. Bila ternyata diperbolehkan, Kepala Desa atau admin dapat mencatat pengecualian beserta alasannya.
        </p>
        {err ? (
          <p role="alert" className="text-sm text-destructive">
            {err}
          </p>
        ) : null}
        {!open.length ? <p role="status" className="rounded-md border border-emerald-600/40 bg-emerald-50 p-3 text-sm text-emerald-900">Tidak ada indikasi larangan yang belum dijawab.</p> : null}
        <ul className="space-y-2">
          {open.map((h) => (
            <li key={`${h.ruleKey}|${h.activityCode}|${h.accountCode}|${h.description}`} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={h.basis === "KODE" ? "overdue" : "soon"}>{h.basis === "KODE" ? "Berdasar rekening" : "Berdasar uraian"}</Pill>
                <span className="font-medium">
                  Larangan {h.no}: {h.text}
                </span>
              </div>
              <p className="mt-1 text-sm">
                <span className="tabular-nums text-muted-foreground">
                  {h.activityCode || "-"} / {h.accountCode}
                </span>{" "}
                {h.description} · <span className="tabular-nums">{rupiah(h.amount)}</span>
              </p>
              {data.can.approve ? (
                <Button type="button" variant="outline" className="mt-2 min-h-11" onClick={() => setTarget(h)}>
                  Nyatakan pengecualian
                </Button>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">Pengecualian hanya dapat dicatat oleh Kepala Desa atau admin.</p>
              )}
            </li>
          ))}
        </ul>
      </section>

      {excepted.length ? (
        <section aria-labelledby="dd-ex-h" className="space-y-3">
          <h2 id="dd-ex-h" className="text-lg font-semibold">
            Pengecualian yang tercatat
          </h2>
          <ul className="divide-y rounded-lg border">
            {excepted.map((e) => {
              const rule = data.terms.prohibitions.find((p) => p.key === e.ruleKey);
              return (
                <li key={e.id} className="flex flex-wrap items-start justify-between gap-2 p-3 text-sm">
                  <div>
                    <p className="font-medium">
                      Larangan {rule?.no ?? e.ruleKey} · <span className="tabular-nums">{e.activityCode || "-"} / {e.accountCode}</span>
                    </p>
                    <p className="text-muted-foreground">Alasan: {e.reason}</p>
                  </div>
                  {data.can.approve ? (
                    <Button type="button" variant="ghost" className="min-h-11" onClick={() => revoke(e.id)}>
                      Cabut
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {target ? (
        <ReasonDialog
          title="Nyatakan pengecualian"
          description={`Larangan ${target.no}: ${target.text}. Alasan ini tercatat dan dapat diperiksa pengawas.`}
          label="Alasan pengecualian (minimal 15 huruf)"
          confirm="Simpan pengecualian"
          url="/api/dana-desa/pengecualian"
          build={(reason) => ({ year, ruleKey: target.ruleKey, activityCode: target.activityCode, accountCode: target.accountCode, reason })}
          onClose={() => setTarget(null)}
          onDone={() => {
            setTarget(null);
            reload();
          }}
        />
      ) : null}
    </>
  );
}
