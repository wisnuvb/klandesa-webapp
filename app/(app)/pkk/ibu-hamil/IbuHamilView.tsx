"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Baby, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApiGet } from "@/hooks/useApiGet";
import type { MaternalBoard } from "@/lib/kia/service";
import { DetailDialog, EndDialog, RegisterDialog, VisitDialog, day } from "./dialogs";

type Data = MaternalBoard & { can: { create: boolean; update: boolean; delete: boolean } };
type Dlg = { kind: "register" } | { kind: "detail"; id: number; name: string } | { kind: "visit"; id: number; name: string; lmpDate: string } | { kind: "end"; id: number; name: string };

export function IbuHamilView() {
  const { data, loading, error, reload } = useApiGet<Data>("/api/pkk/kia");
  const [dlg, setDlg] = useState<Dlg | null>(null);
  const done = () => { setDlg(null); reload(); };
  const s = data?.summary;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button asChild variant="ghost" className="min-h-11">
          <Link href="/pkk"><ArrowLeft aria-hidden="true" />Kembali ke PKK</Link>
        </Button>
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h1 className="flex items-center gap-2 text-2xl font-semibold"><Baby aria-hidden="true" className="size-6" />KIA: Ibu Hamil</h1>
            <p className="max-w-prose text-muted-foreground">
              Catat kehamilan dan kunjungan antenatal. Anjurannya minimal 6 kali kunjungan: 2 di trimester 1, 1 di trimester 2, 3 di trimester 3, dua di antaranya oleh dokter. Penanda hanyalah pengingat bagi kader dan bidan, bukan diagnosis. Data kesehatan bersifat rahasia.
            </p>
          </div>
          {data?.can.create ? <Button type="button" size="lg" className="min-h-11" onClick={() => setDlg({ kind: "register" })}><Plus aria-hidden="true" />Daftarkan ibu hamil</Button> : null}
        </header>
      </div>

      {loading ? <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground"><Loader2 aria-hidden="true" className="size-5 animate-spin" />Memuat…</p> : null}
      {error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={reload}>Coba lagi</Button>
        </div>
      ) : null}

      {s ? (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              ["Ibu hamil", s.active],
              ["Belum pernah diperiksa", s.noVisitYet],
              ["Ada penanda", s.flagged],
              ["Lewat HPL", s.overdue],
              ["Kunjungan 6 kali atau lebih", s.completedPlan],
            ].map(([k, v]) => (
              <div key={k as string} className="rounded-lg border p-3"><dt className="text-sm text-muted-foreground">{k}</dt><dd className="text-xl font-semibold tabular-nums">{v}</dd></div>
            ))}
          </dl>

          {s.residentGone > 0 ? <p role="status" className="rounded-md border border-amber-500 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">{s.residentGone} catatan kehamilan atas warga yang sudah meninggal atau pindah tidak ditampilkan di sini. Perbarui statusnya lewat data warga atau akhiri kehamilannya.</p> : null}
          {data!.truncated ? <p role="status" className="text-sm text-muted-foreground">Daftar dibatasi 2.000 catatan terdekat HPL; ringkasan hanya mencakup yang ditampilkan.</p> : null}
          {data!.pregnancies.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center">Belum ada ibu hamil yang tercatat.</p> : (
            <ul className="space-y-3">
              {data!.pregnancies.map((p) => (
                <li key={p.id} className="rounded-lg border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <h2 className="break-words font-semibold">{p.name}<span className="font-normal text-muted-foreground"> · RT {p.rt ?? "-"}/RW {p.rw ?? "-"} · {p.ageYears} th saat HPHT</span></h2>
                      <p className="text-sm">Minggu {p.weeks} (trimester {p.trimester}) · HPL {day(p.edd)} · {p.visitCount} kunjungan{p.lastVisit ? `, terakhir ${day(p.lastVisit)}` : ""}</p>
                      {p.plan.missing.length ? <p className="text-sm text-muted-foreground">Belum sesuai anjuran: {p.plan.missing.join(", ")}.</p> : null}
                      {p.overdue ? <p className="text-sm text-destructive">Sudah lewat HPL lebih dari 14 hari. Perbarui statusnya bila sudah bersalin.</p> : null}
                      {p.flags.length ? (
                        <ul className="space-y-0.5 text-sm text-amber-800 dark:text-amber-300">
                          {p.flags.map((f) => <li key={f} className="flex gap-1.5"><AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{f}</li>)}
                        </ul>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" className="min-h-11" onClick={() => setDlg({ kind: "detail", id: p.id, name: p.name })} aria-label={`Riwayat ${p.name}`}>Riwayat</Button>
                      {data!.can.create ? <Button type="button" className="min-h-11" onClick={() => setDlg({ kind: "visit", id: p.id, name: p.name, lmpDate: p.lmpDate })} aria-label={`Catat kunjungan ${p.name}`}>Catat kunjungan</Button> : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}

      {dlg?.kind === "register" ? <RegisterDialog onClose={() => setDlg(null)} onSaved={done} /> : null}
      {dlg?.kind === "detail" ? <DetailDialog id={dlg.id} name={dlg.name} canWrite={Boolean(data?.can.update)} canDelete={Boolean(data?.can.delete)} onDeleted={done} onClose={() => setDlg(null)} onVisit={() => { const p = data?.pregnancies.find((x) => x.id === dlg.id); if (p) setDlg({ kind: "visit", id: p.id, name: p.name, lmpDate: p.lmpDate }); }} onEnd={() => setDlg({ kind: "end", id: dlg.id, name: dlg.name })} /> : null}
      {dlg?.kind === "visit" ? <VisitDialog pregnancy={{ id: dlg.id, name: dlg.name, lmpDate: dlg.lmpDate }} onClose={() => setDlg(null)} onSaved={done} /> : null}
      {dlg?.kind === "end" ? <EndDialog pregnancy={{ id: dlg.id, name: dlg.name }} onClose={() => setDlg(null)} onSaved={done} /> : null}
    </div>
  );
}
