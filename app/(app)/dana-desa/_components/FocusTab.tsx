"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/ui/search-select";
import { SELECT_CLASS, rupiah } from "@/components/app/perencanaan/shared";
import type { TabProps } from "./types";

export function FocusTab({ data, year, reload }: TabProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const focusLabel = (k: string) => data.terms.focus.find((f) => f.key === k)?.label ?? k;

  async function setFocus(activityCode: string, focus: string) {
    setBusy(activityCode);
    setErr(null);
    const res = focus
      ? await fetch("/api/dana-desa/fokus", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ year, activityCode, focus }) }).catch(() => null)
      : await fetch(`/api/dana-desa/fokus?year=${year}&activityCode=${encodeURIComponent(activityCode)}`, { method: "DELETE" }).catch(() => null);
    setBusy(null);
    if (res?.ok) return reload();
    const j = await res?.json().catch(() => null);
    setErr(typeof j?.error === "string" ? j.error : "Gagal menyimpan penandaan. Coba lagi.");
  }

  if (!data.activities.length) return <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada kegiatan bersumber Dana Desa pada dokumen APB Desa ini. Isi kolom sumber dana “Dana Desa” pada baris anggaran di menu APBDes.</p>;

  return (
    <section aria-labelledby="dd-fk-h" className="space-y-3">
      <h2 id="dd-fk-h" className="text-lg font-semibold">
        Fokus penggunaan tiap kegiatan
      </h2>
      <p className="text-sm text-muted-foreground">Tandai fokus Dana Desa (Permendesa 16/2025 Pasal 2) untuk setiap kegiatan yang dibiayai Dana Desa. Penandaan ini menjadi dasar batas operasional dan sebaran di tab Ringkasan, dan berlaku untuk semua dokumen APB Desa tahun ini.</p>
      {err ? (
        <p role="alert" className="text-sm text-destructive">
          {err}
        </p>
      ) : null}
      <ul className="divide-y rounded-lg border">
        {data.activities.map((a) => (
          <li key={a.activityCode} className="grid gap-2 p-3 md:grid-cols-[1fr_20rem] md:items-center">
            <div>
              <p className="font-medium">
                <span className="tabular-nums text-muted-foreground">{a.activityCode || "-"}</span> {a.name}
              </p>
              <p className="text-sm tabular-nums text-muted-foreground">{rupiah(a.budget)}</p>
            </div>
            {data.can.update ? (
              <div className="space-y-1">
                <SearchSelect
                  aria-label={`Fokus untuk ${a.name}`}
                  className={SELECT_CLASS}
                  disabled={busy === a.activityCode || !a.activityCode}
                  value={a.focus ?? ""}
                  onChange={(e) => setFocus(a.activityCode, e.target.value)}
                >
                  <option value="">— Belum ditandai —</option>
                  {data.terms.focus.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.letter ? `${f.letter}. ` : ""}
                      {f.label}
                    </option>
                  ))}
                </SearchSelect>
                {!a.focus && a.suggestion ? (
                  <Button type="button" variant="link" className="h-auto min-h-11 justify-start px-0 text-sm" disabled={busy === a.activityCode} onClick={() => setFocus(a.activityCode, a.suggestion!)}>
                    Pakai saran: {focusLabel(a.suggestion)}
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="text-sm">{a.focus ? focusLabel(a.focus) : "Belum ditandai"}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
