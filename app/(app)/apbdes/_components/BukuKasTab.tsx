"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Lock, LockOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApiGet } from "@/hooks/useApiGet";
import type { EntryView } from "@/lib/apbdes/service";
import { EntryDialog } from "./EntryDialog";
import { ConfirmRequest, MONTHS, SELECT_CLASS, dateId, money, type Overview } from "./shared";
import { SearchSelect } from "@/components/ui/search-select";

interface BkuResponse {
  entries: EntryView[];
  opening: { tunai: string; bank: string };
  closing: { tunai: string; bank: string; pajak: string };
}

const STATE_LABEL: Record<string, string> = { BUKA: "Terbuka", DITUTUP: "Ditutup", DIVERIFIKASI: "Diverifikasi Sekretaris Desa", DISETUJUI: "Disetujui Kepala Desa" };

type Dlg = { kind: "entry"; entry: EntryView | null } | { kind: "del"; entry: EntryView } | { kind: "month"; action: "close" | "verify" | "approve" | "reopen" };

const ACTIONS = {
  close: { title: "Tutup buku kas bulan ini?", text: "Setelah ditutup, catatan bulan ini tidak dapat ditambah, diubah, atau dihapus (Pasal 63). Laporkan ke Sekretaris Desa paling lambat tanggal 10 bulan berikutnya.", button: "Tutup buku kas", url: "/api/apbdes/bulan" },
  verify: { title: "Tandai sudah diverifikasi?", text: "Sekretaris Desa telah memverifikasi, mengevaluasi, dan menganalisis buku kas bulan ini (Pasal 67).", button: "Tandai diverifikasi", url: "/api/apbdes/bulan" },
  approve: { title: "Setujui buku kas bulan ini?", text: "Kepala Desa menyetujui hasil verifikasi Sekretaris Desa (Pasal 67).", button: "Setujui", url: "/api/apbdes/bulan/persetujuan" },
  reopen: { title: "Buka kembali bulan ini?", text: "Kunci pembukuan dicabut, verifikasi dan persetujuan bulan ini dihapus, lalu catatan dapat diubah lagi. Lakukan hanya untuk koreksi yang sah.", button: "Buka kembali", url: "/api/apbdes/bulan" },
} as const;

export function BukuKasTab({ o, reload }: { o: Overview; reload: () => void }) {
  const now = new Date();
  const [month, setMonth] = useState<number>(now.getUTCFullYear() === o.year ? now.getUTCMonth() + 1 : 1);
  const [dlg, setDlg] = useState<Dlg | null>(null);
  const bku = useApiGet<BkuResponse>(`/api/apbdes/bku?year=${o.year}&month=${month}`);
  const status = o.months[month - 1]!;
  const locked = status.state !== "BUKA";
  const refresh = () => { setDlg(null); reload(); bku.reload(); };
  const b = bku.data;

  return (
    <div className="space-y-5">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Kas tunai", o.balances.tunai],
          ["Rekening bank", o.balances.bank],
          ["Pajak dipotong, belum disetor", o.balances.pajak],
          ["Saldo kas (tunai + bank)", o.balances.total],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border p-3">
            <dt className="text-sm text-muted-foreground">{k}</dt>
            <dd className="text-lg font-semibold tabular-nums">{money(v!)}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">Saldo kas awal tahun dicatat sebagai penerimaan pada rekening 6.1.1.01 SiLPA Tahun Sebelumnya.</p>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-48">
          <label htmlFor="bk-month" className="mb-1.5 block text-sm font-medium">Bulan</label>
          <SearchSelect id="bk-month" className={SELECT_CLASS} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m} {o.months[i]!.state !== "BUKA" ? "(ditutup)" : ""}</option>)}
          </SearchSelect>
        </div>
        {o.can.create && !locked ? (
          <Button type="button" size="lg" className="min-h-11" onClick={() => setDlg({ kind: "entry", entry: null })}>
            <Plus aria-hidden="true" />
            Catat transaksi
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <p className="flex items-center gap-2 text-sm">
          {locked ? <Lock aria-hidden="true" className="size-4" /> : <LockOpen aria-hidden="true" className="size-4" />}
          <span><strong>{MONTHS[month - 1]} {o.year}</strong>: {STATE_LABEL[status.state]} · {status.entryCount} catatan</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {status.state === "BUKA" && o.can.update ? <Button type="button" variant="outline" className="min-h-11" onClick={() => setDlg({ kind: "month", action: "close" })}><Lock aria-hidden="true" />Tutup bulan</Button> : null}
          {status.state === "DITUTUP" && o.can.update ? <Button type="button" variant="outline" className="min-h-11" onClick={() => setDlg({ kind: "month", action: "verify" })}><CheckCircle2 aria-hidden="true" />Tandai diverifikasi</Button> : null}
          {status.state === "DIVERIFIKASI" && o.can.approve ? <Button type="button" className="min-h-11" onClick={() => setDlg({ kind: "month", action: "approve" })}><CheckCircle2 aria-hidden="true" />Setujui</Button> : null}
          {locked && o.can.delete ? <Button type="button" variant="ghost" className="min-h-11" onClick={() => setDlg({ kind: "month", action: "reopen" })}>Buka kembali</Button> : null}
        </div>
      </div>

      {bku.loading ? <p role="status" className="flex items-center gap-2 text-muted-foreground"><Loader2 aria-hidden="true" className="size-4 animate-spin" />Memuat buku kas…</p> : null}
      {bku.error ? <p role="alert" className="text-destructive">{bku.error}</p> : null}
      {b && b.entries.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">Belum ada catatan pada {MONTHS[month - 1]} {o.year}.</p> : null}

      {b && b.entries.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Buku Kas Umum {MONTHS[month - 1]} {o.year}</caption>
            <thead className="border-b text-muted-foreground">
              <tr>
                <th scope="col" className="p-3 font-medium">Tanggal</th>
                <th scope="col" className="p-3 font-medium">Bukti</th>
                <th scope="col" className="p-3 font-medium">Uraian</th>
                <th scope="col" className="p-3 font-medium">Kas</th>
                <th scope="col" className="p-3 text-right font-medium">Masuk</th>
                <th scope="col" className="p-3 text-right font-medium">Keluar</th>
                <th scope="col" className="p-3"><span className="sr-only">Tindakan</span></th>
              </tr>
            </thead>
            <tbody>
              {b.entries.map((e) => {
                const inflow = e.type === "PENERIMAAN";
                const transfer = e.type === "TARIK_BANK" || e.type === "SETOR_BANK";
                return (
                  <tr key={e.id} className="border-b align-top last:border-0">
                    <td className="whitespace-nowrap p-3">{dateId(e.entryDate)}</td>
                    <td className="p-3 break-words">{e.voucherNo}</td>
                    <td className="p-3">
                      <p className="break-words">{e.description}</p>
                      <p className="break-words text-xs text-muted-foreground">
                        {o.terms.entryTypes[e.type]}{e.activityCode ? ` · ${e.activityCode}` : ""}{e.accountCode ? ` · ${e.accountCode}` : ""}{e.bankFee ? " · biaya adm bank" : ""}
                        {Number(e.tax) > 0 ? ` · pajak ${e.taxKind} ${money(e.tax)} dipotong` : ""}
                      </p>
                    </td>
                    <td className="p-3">{e.type === "TARIK_BANK" ? "Bank → tunai" : e.type === "SETOR_BANK" ? "Tunai → bank" : e.channel === "TUNAI" ? "Tunai" : "Bank"}</td>
                    <td className="whitespace-nowrap p-3 text-right tabular-nums">{inflow ? money(e.amount) : transfer ? <span className="text-muted-foreground">{money(e.amount)}</span> : ""}</td>
                    <td className="whitespace-nowrap p-3 text-right tabular-nums">{!inflow && !transfer ? money(e.amount) : ""}</td>
                    <td className="whitespace-nowrap p-3 text-right">
                      {e.locked ? <Lock aria-label="Bulan sudah ditutup" className="ml-auto size-4 text-muted-foreground" /> : e.linked ? <span className="block max-w-[10rem] break-words text-xs text-muted-foreground">{e.linkedNote ?? "dari SPP/panjar"}</span> : (
                        <>
                          {o.can.update ? <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Ubah ${e.description}`} onClick={() => setDlg({ kind: "entry", entry: e })}><Pencil aria-hidden="true" /></Button> : null}
                          {o.can.delete ? <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Hapus ${e.description}`} onClick={() => setDlg({ kind: "del", entry: e })}><Trash2 aria-hidden="true" /></Button> : null}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      {b ? <p className="text-sm text-muted-foreground">Saldo akhir {MONTHS[month - 1]}: tunai {money(b.closing.tunai)}, bank {money(b.closing.bank)}. Baris &ldquo;Tarik/Setor&rdquo; hanya memindahkan uang antar kas dan tidak menambah masuk atau keluar.</p> : null}

      {dlg?.kind === "entry" ? <EntryDialog o={o} entry={dlg.entry} defaultMonth={month} onClose={() => setDlg(null)} onSaved={refresh} /> : null}
      {dlg?.kind === "del" ? <ConfirmRequest title="Hapus catatan?" text={`“${dlg.entry.description}” (${money(dlg.entry.amount)}) dihapus dari buku kas. Ditolak bila saldo sesudahnya menjadi minus.`} button="Hapus" destructive url={`/api/apbdes/bku/${dlg.entry.id}`} method="DELETE" onClose={() => setDlg(null)} onDone={refresh} /> : null}
      {dlg?.kind === "month" ? (
        <ConfirmRequest
          title={ACTIONS[dlg.action].title}
          text={`${MONTHS[month - 1]} ${o.year}. ${ACTIONS[dlg.action].text}`}
          button={ACTIONS[dlg.action].button}
          destructive={dlg.action === "reopen"}
          url={ACTIONS[dlg.action].url}
          method="POST"
          body={{ year: o.year, month, action: dlg.action }}
          onClose={() => setDlg(null)}
          onDone={refresh}
        />
      ) : null}
    </div>
  );
}
