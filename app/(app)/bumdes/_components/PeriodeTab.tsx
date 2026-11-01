"use client";

import { useState } from "react";
import { Loader2, Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import type { PeriodsOverview, PeriodView } from "@/lib/bumdes/service";
import { Busy, Findings, ReasonDialog, SELECT_CLASS, StatusPill, rp } from "./shared";

type Resp = PeriodsOverview & { canManage: boolean };

export function PeriodeTab() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const { data, loading, error, reload } = useApiGet<Resp>(`/api/bumdes/periode?year=${year}`);
  const [reopen, setReopen] = useState<PeriodView | null>(null);
  const { busy, general, submit } = useFormSubmit();
  const [msg, setMsg] = useState<string | null>(null);

  async function close(p: PeriodView) {
    setMsg(null);
    const r = await submit("/api/bumdes/periode", "POST", { year: p.year, half: p.half, action: "tutup" });
    if (r) reload();
    else setMsg("Penutupan ditolak.");
  }

  return (
    <div className="min-w-0 space-y-4">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Periode yang ditutup tidak dapat diubah: transaksi kas, jurnal, koreksi, dan arus APB Desa bertanggal pada periode itu ditolak. Penutupan berurutan (Semester I dulu), baru bisa setelah periode berakhir, dan butuh seluruh transaksi kas berjurnal serta neraca seimbang. Membuka kembali wajib beralasan dan tercatat.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="pr-year">Tahun buku</Label>
        <SearchSelect id="pr-year" className={`${SELECT_CLASS} w-32`} value={String(year)} onChange={(e) => setYear(Number(e.target.value))}>
          {[thisYear - 3, thisYear - 2, thisYear - 1, thisYear, thisYear + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </SearchSelect>
      </div>
      {loading && !data ? <Busy>Memuat periode…</Busy> : null}
      {error ? (
        <div role="alert" className="rounded-md border border-destructive p-4 text-destructive">
          {error}
        </div>
      ) : null}
      {(general || msg) && !busy ? (
        <div role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {general ?? msg}
        </div>
      ) : null}
      {data ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {data.periods.map((p) => (
              <section key={p.half} aria-labelledby={`pr-${p.half}`} className="min-w-0 space-y-2 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 id={`pr-${p.half}`} className="font-semibold">
                    {p.label}
                  </h2>
                  {p.state === "DITUTUP" ? <StatusPill tone="ok">Ditutup</StatusPill> : <StatusPill tone="off">Terbuka</StatusPill>}
                </div>
                {p.state === "DITUTUP" ? (
                  <p className="text-sm text-muted-foreground">
                    Ditutup {p.closedAt ? new Date(p.closedAt).toLocaleString("id-ID") : ""}. Laba (rugi) periode {rp(p.profit)}; total aset akhir {rp(p.assets)}.
                  </p>
                ) : p.closeBlocker ? (
                  <p className="text-sm text-muted-foreground">Belum dapat ditutup: {p.closeBlocker}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Siap ditutup.</p>
                )}
                {data.canManage ? (
                  p.state === "DITUTUP" ? (
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setReopen(p)} disabled={!p.canReopen}>
                      <LockOpen aria-hidden="true" />
                      Buka kembali
                    </Button>
                  ) : (
                    <Button type="button" className="min-h-11" onClick={() => void close(p)} disabled={busy || Boolean(p.closeBlocker)}>
                      {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Lock aria-hidden="true" />}
                      Tutup periode
                    </Button>
                  )
                ) : null}
                {p.state === "DITUTUP" && !p.canReopen ? <p className="text-xs text-muted-foreground">Buka kembali periode yang lebih akhir lebih dulu.</p> : null}
              </section>
            ))}
          </div>
          <Findings items={data.reminders.map((r) => ({ level: r.level, message: r.message, ref: r.ref }))} />
          <section aria-labelledby="pr-log" className="space-y-2">
            <h2 id="pr-log" className="text-lg font-semibold">
              Riwayat penutupan {year}
            </h2>
            {data.log.length ? (
              <ul className="space-y-1 text-sm">
                {data.log.map((l) => (
                  <li key={l.id} className="break-words rounded-md border px-3 py-2">
                    <strong>{l.action === "TUTUP" ? "Ditutup" : "Dibuka kembali"}</strong> Semester {l.half === 1 ? "I" : "II"} · {new Date(l.at).toLocaleString("id-ID")}
                    {l.reason ? <span className="block text-muted-foreground">Alasan: {l.reason}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Belum ada penutupan atau pembukaan kembali pada tahun ini.</p>
            )}
          </section>
        </>
      ) : null}
      {reopen ? (
        <ReasonDialog
          title={`Buka kembali ${reopen.label}?`}
          description="Setelah dibuka, transaksi dan jurnal pada periode ini dapat diubah lagi. Tulis alasannya; alasan tersimpan di riwayat."
          confirmLabel="Buka kembali"
          url="/api/bumdes/periode"
          extraBody={{ year: reopen.year, half: reopen.half, action: "buka" }}
          onClose={() => setReopen(null)}
          onDone={() => { setReopen(null); reload(); }}
        />
      ) : null}
    </div>
  );
}
