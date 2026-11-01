"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { MODES, SPP_STATUS } from "@/lib/apbdes/catalog";
import type { ActivityPlanView } from "@/lib/apbdes/dpa";
import type { PanjarView, SppView } from "@/lib/apbdes/spp";
import { PanjarDialog, SppActionDialog, SppFormDialog, type SppActionKind } from "./SppDialogs";
import { dateId, money, type Overview } from "./shared";

type Dlg = { kind: "form" } | { kind: "act"; id: number; label: string; action: SppActionKind } | { kind: "panjar"; panjar: PanjarView; mode: "spj" | "kembali" };

const STATE_LABEL = { TERBUKA: "Terbuka", LUNAS: "Lunas", TERLAMBAT: "Lewat 10 hari kerja" } as const;

export function SppTab({ o, reload }: { o: Overview; reload: () => void }) {
  const list = useApiGet<{ requests: SppView[] }>(`/api/apbdes/spp?year=${o.year}`);
  const pj = useApiGet<{ panjar: PanjarView[] }>(`/api/apbdes/panjar?year=${o.year}`);
  const plans = useApiGet<{ activities: ActivityPlanView[] }>(`/api/apbdes/dpa?year=${o.year}`);
  const [dlg, setDlg] = useState<Dlg | null>(null);
  const check = useFormSubmit();
  const done = () => { setDlg(null); list.reload(); pj.reload(); plans.reload(); reload(); };

  return (
    <div className="space-y-8">
      <section aria-labelledby="spp-h" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 id="spp-h" className="text-lg font-semibold">Surat Permintaan Pembayaran (SPP)</h2>
            <p className="max-w-prose text-sm text-muted-foreground">Kaur/Kasi mengajukan, Sekretaris Desa memverifikasi, Kepala Desa menyetujui, Kaur Keuangan membayar (Pasal 55). Pembayaran otomatis masuk Buku Kas Umum.</p>
          </div>
          {o.can.create ? <Button type="button" size="lg" className="min-h-11" onClick={() => setDlg({ kind: "form" })}><Plus aria-hidden="true" />Ajukan SPP</Button> : null}
        </div>
        {list.loading ? <p role="status" className="flex items-center gap-2 text-muted-foreground"><Loader2 aria-hidden="true" className="size-4 animate-spin" />Memuat…</p> : null}
        {list.error ? <p role="alert" className="text-destructive">{list.error}</p> : null}
        {list.data && list.data.requests.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">Belum ada SPP tahun {o.year}.</p> : null}
        <ul className="space-y-3">
          {list.data?.requests.map((s) => (
            <li key={s.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <h3 className="break-words font-semibold">{s.label} · {s.activityCode} {s.activityName}</h3>
                  <p className="text-sm">{SPP_STATUS[s.status]} · {MODES[s.mode]}{s.executorName ? ` · ${s.executorName}` : ""} · {money(s.total)}{s.paidAt ? ` · dibayar ${dateId(s.paidAt)}` : ""}</p>
                  {s.rejectNote ? <p className="text-sm text-destructive">Ditolak: {s.rejectNote}</p> : null}
                  <ul className="text-sm text-muted-foreground">{s.lines.map((l) => <li key={l.id} className="break-words">{l.accountCode} {l.description}{l.payee ? ` (${l.payee})` : ""}: {money(l.amount)}{Number(l.tax) > 0 ? ` · pajak ${l.taxKind} ${money(l.tax)}` : ""}</li>)}</ul>
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.status === "DIAJUKAN" && o.verifier ? <Button type="button" className="min-h-11" onClick={() => setDlg({ kind: "act", id: s.id, label: s.label, action: "verify" })}>Verifikasi</Button> : null}
                  {s.status === "DIVERIFIKASI" && o.can.approve ? <Button type="button" className="min-h-11" onClick={() => setDlg({ kind: "act", id: s.id, label: s.label, action: "approve" })}>Setujui</Button> : null}
                  {s.status === "DISETUJUI" && o.can.create ? <Button type="button" className="min-h-11" onClick={() => setDlg({ kind: "act", id: s.id, label: s.label, action: "pay" })}>Bayar</Button> : null}
                  {["DIAJUKAN", "DIVERIFIKASI", "DISETUJUI"].includes(s.status) && (o.verifier || o.can.approve) ? <Button type="button" variant="outline" className="min-h-11" onClick={() => setDlg({ kind: "act", id: s.id, label: s.label, action: "reject" })}>Tolak</Button> : null}
                  <Button asChild variant="ghost" className="min-h-11"><Link href={`/apbdes/cetak?kind=spp&year=${o.year}&id=${s.id}`}>Cetak SPP</Link></Button>
                  {s.mode === "PENYEDIA" ? <Button asChild variant="ghost" className="min-h-11"><Link href={`/apbdes/cetak?kind=ptjb&year=${o.year}&id=${s.id}`}>Pernyataan</Link></Button> : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pj-h" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 id="pj-h" className="text-lg font-semibold">Panjar kegiatan swakelola</h2>
            <p className="max-w-prose text-sm text-muted-foreground">Dana yang diterima Kaur/Kasi pelaksana harus dipertanggungjawabkan dengan bukti ke Sekretaris Desa atau sisanya dikembalikan ke kas desa dalam 10 hari kerja (Pasal 54). Hari libur nasional tidak dihitung aplikasi, jadi tenggat bisa lebih awal dari yang sebenarnya.</p>
          </div>
          <Button asChild variant="outline" className="min-h-11"><Link href={`/apbdes/cetak?kind=panjar&year=${o.year}`}>Cetak Buku Pembantu Panjar</Link></Button>
        </div>
        <FormErrorSummary innerRef={check.summaryRef} errors={{}} general={check.general} labels={{}} />
        {pj.data && pj.data.panjar.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">Belum ada panjar. Panjar terbentuk saat SPP swakelola dibayar.</p> : null}
        <ul className="space-y-3">
          {pj.data?.panjar.map((p) => (
            <li key={p.id} className={`rounded-lg border bg-card p-4 ${p.state === "TERLAMBAT" ? "border-destructive/60" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <h3 className="break-words font-semibold">{p.requestLabel} · {p.holderName}</h3>
                  <p className="text-sm">{p.activityCode} {p.activityName}</p>
                  <p className="text-sm">Diberikan {dateId(p.givenAt)} {money(p.given)} · dipertanggungjawabkan {money(p.spent)} · dikembalikan {money(p.returned)} · <strong>saldo {money(p.balance)}</strong></p>
                  {p.moduleKind ? <p className="text-xs text-muted-foreground">Termasuk {money(p.fromModule)} yang dicatat di modul {p.moduleKind === "BLT" ? "BLT Desa" : p.moduleKind === "PKTD" ? "Padat Karya" : "KDMP"}; pembayaran itu otomatis menjadi pertanggungjawaban panjar.</p> : null}
                  <p className={`flex items-center gap-1.5 text-sm ${p.state === "TERLAMBAT" ? "text-destructive" : "text-muted-foreground"}`}>
                    {p.state === "TERLAMBAT" ? <AlertTriangle aria-hidden="true" className="size-4" /> : null}
                    {STATE_LABEL[p.state]} · batas {dateId(p.dueAt)}
                  </p>
                  {p.spj.length ? (
                    <ul className="text-sm text-muted-foreground">
                      {p.spj.map((s) => (
                        <li key={s.id} className="flex flex-wrap items-center gap-2 break-words">
                          {dateId(s.spjDate)} · {s.voucherNo} · {s.description}: {money(s.amount)} · {s.checked ? "sudah diperiksa Sekretaris Desa" : "belum diperiksa"}
                          {!s.checked && o.verifier ? <Button type="button" size="sm" variant="outline" className="min-h-11" disabled={check.busy} onClick={async () => { if (await check.submit(`/api/apbdes/panjar/spj/${s.id}/periksa`, "POST", {}, "Gagal menandai. Coba lagi.")) done(); }}>Tandai diperiksa</Button> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                {p.state !== "LUNAS" && o.can.create ? (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" className="min-h-11" onClick={() => setDlg({ kind: "panjar", panjar: p, mode: "spj" })}>Pertanggungjawaban</Button>
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setDlg({ kind: "panjar", panjar: p, mode: "kembali" })}>Kembalikan sisa</Button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {dlg?.kind === "form" ? <SppFormDialog o={o} plans={plans.data?.activities ?? []} onClose={() => setDlg(null)} onSaved={done} /> : null}
      {dlg?.kind === "act" ? <SppActionDialog o={o} id={dlg.id} label={dlg.label} action={dlg.action} onClose={() => setDlg(null)} onDone={done} /> : null}
      {dlg?.kind === "panjar" ? <PanjarDialog o={o} panjar={dlg.panjar} mode={dlg.mode} onClose={() => setDlg(null)} onSaved={done} /> : null}
    </div>
  );
}
