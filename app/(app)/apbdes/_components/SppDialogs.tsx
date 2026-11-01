"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { MODES } from "@/lib/apbdes/catalog";
import type { ActivityPlanView } from "@/lib/apbdes/dpa";
import type { PanjarView } from "@/lib/apbdes/spp";
import { localToday } from "@/lib/form-input";
import { MoneyInput } from "./MoneyInput";
import { money, SELECT_CLASS, type Overview } from "./shared";
import { SearchSelect } from "@/components/ui/search-select";

interface Line {
  accountCode: string;
  description: string;
  payee: string;
  amount: string;
  taxAmount: string;
  taxKind: string;
}
const emptyLine = (accountCode = ""): Line => ({ accountCode, description: "", payee: "", amount: "", taxAmount: "", taxKind: "" });

export function SppFormDialog({ o, plans, onClose, onSaved }: { o: Overview; plans: ActivityPlanView[]; onClose: () => void; onSaved: () => void }) {
  const approved = useMemo(() => plans.filter((p) => p.status === "DISETUJUI"), [plans]);
  const [f, setF] = useState({ activityCode: approved[0]?.activityCode ?? "", mode: "SWAKELOLA", executorName: approved[0]?.executorName ?? "", workPeriod: "", hasReceipt: false });
  const [lines, setLines] = useState<Line[]>([emptyLine(approved[0]?.accounts[0]?.accountCode)]);
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const plan = approved.find((p) => p.activityCode === f.activityCode);
  const setLine = (i: number, patch: Partial<Line>) => setLines((p) => p.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const labels = { activityCode: "Kegiatan", mode: "Pelaksanaan", executorName: "Pelaksana", workPeriod: "Waktu pelaksanaan", hasReceipt: "Bukti penerimaan", lines: "Baris", ...Object.fromEntries(lines.map((_, i) => [`line${i + 1}`, `Baris ${i + 1}`])) };
  return (
    <Dialog open onOpenChange={(open) => (!open && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Ajukan SPP</DialogTitle>
          <DialogDescription>Surat Permintaan Pembayaran dari Kaur/Kasi pelaksana. Hanya kegiatan dengan DPA yang sudah disetujui. Jumlah tidak boleh melebihi sisa anggaran maupun rencana penarikan sampai bulan ini (Pasal 53).</DialogDescription>
        </DialogHeader>
        {approved.length === 0 ? <p role="alert" className="rounded-md border border-amber-500 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">Belum ada DPA yang disetujui Kepala Desa. Susun dan setujui DPA di tab Pelaksanaan terlebih dahulu.</p> : null}
        <form
          noValidate
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const body = { year: o.year, ...f, lines: lines.map((l) => ({ ...l, taxKind: l.taxAmount ? l.taxKind : "" })) };
            if (await submit("/api/apbdes/spp", "POST", body)) onSaved();
          }}
        >
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={labels} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sp-act">Kegiatan *</Label>
              <SearchSelect {...fieldA11y("sp-act", errors.activityCode)} className={SELECT_CLASS} value={f.activityCode} onChange={(e) => { const p = approved.find((x) => x.activityCode === e.target.value); setF((x) => ({ ...x, activityCode: e.target.value, executorName: p?.executorName ?? x.executorName })); setLines([emptyLine(p?.accounts[0]?.accountCode)]); }}>
                {approved.map((p) => <option key={p.activityCode} value={p.activityCode}>{p.activityCode} {p.name}</option>)}
              </SearchSelect>
              <FieldError id="sp-act" message={errors.activityCode} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-mode">Pelaksanaan *</Label>
              <SearchSelect {...fieldA11y("sp-mode", errors.mode)} className={SELECT_CLASS} value={f.mode} onChange={(e) => setF((x) => ({ ...x, mode: e.target.value }))}>
                {Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </SearchSelect>
              <FieldError id="sp-mode" message={errors.mode} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-exec">Kaur/Kasi pelaksana{f.mode === "SWAKELOLA" ? " (penerima panjar) *" : ""}</Label>
              <Input {...fieldA11y("sp-exec", errors.executorName)} className="h-11" maxLength={150} value={f.executorName} onChange={(e) => setF((x) => ({ ...x, executorName: e.target.value }))} />
              <FieldError id="sp-exec" message={errors.executorName} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sp-period">Waktu pelaksanaan</Label>
              <Input {...fieldA11y("sp-period", errors.workPeriod)} className="h-11" maxLength={100} value={f.workPeriod} onChange={(e) => setF((x) => ({ ...x, workPeriod: e.target.value }))} placeholder="Contoh: Nov 2026" />
              <FieldError id="sp-period" message={errors.workPeriod} />
            </div>
          </div>
          {f.mode === "PENYEDIA" ? (
            <div>
              <label className="flex min-h-11 items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={f.hasReceipt} onChange={(e) => setF((x) => ({ ...x, hasReceipt: e.target.checked }))} />Barang/jasa sudah diterima; pernyataan tanggung jawab belanja dan bukti penerimaan dilampirkan (Pasal 55)</label>
              <FieldError id="sp-receipt" message={errors.hasReceipt} />
            </div>
          ) : null}
          <fieldset className="space-y-3">
            <legend className="font-medium">Rincian permintaan</legend>
            <FieldError id="sp-lines" message={errors.lines} />
            {lines.map((l, i) => (
              <div key={i} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`sp-acc-${i}`}>Rekening *</Label>
                  <SearchSelect id={`sp-acc-${i}`} className={SELECT_CLASS} value={l.accountCode} onChange={(e) => setLine(i, { accountCode: e.target.value })}>
                    <option value="">Pilih rekening…</option>
                    {(plan?.accounts ?? []).map((a) => <option key={a.accountCode} value={a.accountCode}>{a.accountCode} {a.accountName}</option>)}
                  </SearchSelect>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`sp-d-${i}`}>Uraian</Label>
                  <Input id={`sp-d-${i}`} className="h-11" maxLength={300} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`sp-p-${i}`}>Penerima pembayaran</Label>
                  <Input id={`sp-p-${i}`} className="h-11" maxLength={150} value={l.payee} onChange={(e) => setLine(i, { payee: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`sp-a-${i}`}>Jumlah *</Label>
                  <MoneyInput id={`sp-a-${i}`} value={l.amount} onChange={(v) => setLine(i, { amount: v })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`sp-t-${i}`}>Pajak dipotong (bila ada)</Label>
                  <MoneyInput id={`sp-t-${i}`} value={l.taxAmount} onChange={(v) => setLine(i, { taxAmount: v })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`sp-k-${i}`}>Jenis pajak</Label>
                  <SearchSelect id={`sp-k-${i}`} className={SELECT_CLASS} value={l.taxKind} disabled={!l.taxAmount} onChange={(e) => setLine(i, { taxKind: e.target.value })}>
                    <option value="">Pilih jenis…</option>
                    {o.terms.taxKinds.map((k) => <option key={k} value={k}>{k}</option>)}
                  </SearchSelect>
                </div>
                {lines.length > 1 ? <div className="sm:col-span-2"><Button type="button" variant="ghost" className="min-h-11" onClick={() => setLines((p) => p.filter((_, j) => j !== i))}><Trash2 aria-hidden="true" />Hapus baris {i + 1}</Button></div> : null}
              </div>
            ))}
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setLines((p) => [...p, emptyLine(plan?.accounts[0]?.accountCode)])}><Plus aria-hidden="true" />Tambah baris</Button>
          </fieldset>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>Batal</Button>
            <Button type="submit" className="min-h-11" disabled={busy || approved.length === 0}>{busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}Ajukan SPP</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export type SppActionKind = "verify" | "approve" | "reject" | "pay";

const COPY: Record<SppActionKind, { title: string; text: string; button: string }> = {
  verify: { title: "Verifikasi SPP?", text: "Sekretaris Desa telah meneliti kelengkapan, menguji perhitungan tagihan dan ketersediaan dana (Pasal 55 ayat 3).", button: "Tandai diverifikasi" },
  approve: { title: "Setujui SPP?", text: "Kepala Desa menyetujui SPP sesuai hasil verifikasi (Pasal 55 ayat 4).", button: "Setujui" },
  reject: { title: "Tolak SPP?", text: "SPP ditolak dan tidak dapat diproses lagi. Tuliskan alasannya.", button: "Tolak SPP" },
  pay: { title: "Bayar SPP?", text: "Kaur Keuangan mencairkan sesuai SPP (Pasal 55 ayat 5). Pembayaran langsung dicatat di Buku Kas Umum; untuk swakelola terbentuk panjar yang harus dipertanggungjawabkan atau dikembalikan dalam 10 hari kerja.", button: "Catat pembayaran" },
};

export function SppActionDialog({ o, id, label, action, onClose, onDone }: { o: Overview; id: number; label: string; action: SppActionKind; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ paidAt: localToday(), channel: "BANK", note: "" });
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const c = COPY[action];
  const url = action === "approve" || (action === "reject" && o.can.approve && !o.verifier) ? "/api/apbdes/spp/persetujuan" : `/api/apbdes/spp/${id}/aksi`;
  return (
    <Dialog open onOpenChange={(open) => (!open && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{c.title}</DialogTitle>
          <DialogDescription>{label}. {c.text}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const body = url.endsWith("persetujuan") ? { requestId: id, decision: action, note: f.note } : { action, ...(action === "pay" ? { paidAt: f.paidAt, channel: f.channel } : {}), note: f.note };
            if (await submit(url, "POST", body)) onDone();
          }}
        >
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ paidAt: "Tanggal bayar", channel: "Kas", note: "Alasan" }} />
          {action === "pay" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="sa-date">Tanggal pembayaran *</Label>
                <Input {...fieldA11y("sa-date", errors.paidAt)} className="h-11" type="date" max={localToday()} min={`${o.year}-01-01`} value={f.paidAt} onChange={(e) => setF((x) => ({ ...x, paidAt: e.target.value }))} />
                <FieldError id="sa-date" message={errors.paidAt} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sa-ch">Dibayar dari *</Label>
                <SearchSelect {...fieldA11y("sa-ch", errors.channel)} className={SELECT_CLASS} value={f.channel} onChange={(e) => setF((x) => ({ ...x, channel: e.target.value }))}>
                  {Object.entries(o.terms.channels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </SearchSelect>
                <FieldError id="sa-ch" message={errors.channel} />
              </div>
            </>
          ) : null}
          {action === "reject" ? (
            <div className="space-y-1.5">
              <Label htmlFor="sa-note">Alasan penolakan *</Label>
              <Input {...fieldA11y("sa-note", errors.note)} className="h-11" maxLength={300} value={f.note} onChange={(e) => setF((x) => ({ ...x, note: e.target.value }))} />
              <FieldError id="sa-note" message={errors.note} />
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>Batal</Button>
            <Button type="submit" variant={action === "reject" ? "destructive" : "default"} className="min-h-11" disabled={busy}>{busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}{c.button}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PanjarDialog({ o, panjar, mode, onClose, onSaved }: { o: Overview; panjar: PanjarView; mode: "spj" | "kembali"; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ date: localToday(), voucherNo: "", description: "", amount: "", channel: "TUNAI", accountCode: panjar.accounts[0]?.accountCode ?? "" });
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const isSpj = mode === "spj";
  return (
    <Dialog open onOpenChange={(open) => (!open && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isSpj ? "Pertanggungjawaban panjar" : "Kembalikan sisa panjar"}</DialogTitle>
          <DialogDescription>{panjar.requestLabel} · {panjar.holderName} · saldo {money(panjar.balance)}. {isSpj ? "Bukti pembayaran barang/jasa yang disampaikan ke Sekretaris Desa." : "Mengurangi realisasi belanja pada rekening yang dipilih."}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const url = isSpj ? `/api/apbdes/panjar/${panjar.id}/spj` : `/api/apbdes/panjar/${panjar.id}/kembali`;
            const body = isSpj ? { spjDate: f.date, voucherNo: f.voucherNo, description: f.description, amount: f.amount } : { date: f.date, voucherNo: f.voucherNo, channel: f.channel, accountCode: f.accountCode, amount: f.amount };
            if (await submit(url, "POST", body)) onSaved();
          }}
        >
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ spjDate: "Tanggal", date: "Tanggal", voucherNo: "Nomor bukti", description: "Uraian", amount: "Jumlah", channel: "Kas", accountCode: "Rekening" }} />
          <div className="space-y-1.5">
            <Label htmlFor="pj-date">Tanggal *</Label>
            <Input {...fieldA11y("pj-date", errors.spjDate ?? errors.date)} className="h-11" type="date" min={panjar.givenAt} max={localToday()} value={f.date} onChange={(e) => setF((x) => ({ ...x, date: e.target.value }))} />
            <FieldError id="pj-date" message={errors.spjDate ?? errors.date} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pj-no">{isSpj ? "Nomor bukti *" : "Nomor bukti setor *"}</Label>
            <Input {...fieldA11y("pj-no", errors.voucherNo)} className="h-11" maxLength={60} value={f.voucherNo} onChange={(e) => setF((x) => ({ ...x, voucherNo: e.target.value }))} />
            <FieldError id="pj-no" message={errors.voucherNo} />
          </div>
          {isSpj ? (
            <div className="space-y-1.5">
              <Label htmlFor="pj-desc">Uraian *</Label>
              <Input {...fieldA11y("pj-desc", errors.description)} className="h-11" maxLength={300} value={f.description} onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))} />
              <FieldError id="pj-desc" message={errors.description} />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="pj-acc">Rekening belanja yang dikurangi *</Label>
                <SearchSelect {...fieldA11y("pj-acc", errors.accountCode)} className={SELECT_CLASS} value={f.accountCode} onChange={(e) => setF((x) => ({ ...x, accountCode: e.target.value }))}>
                  {panjar.accounts.map((a) => <option key={a.accountCode} value={a.accountCode}>{a.accountCode} {a.accountName} (bisa dikembalikan {money(a.returnable)})</option>)}
                </SearchSelect>
                <FieldError id="pj-acc" message={errors.accountCode} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pj-ch">Disetor ke *</Label>
                <SearchSelect {...fieldA11y("pj-ch", errors.channel)} className={SELECT_CLASS} value={f.channel} onChange={(e) => setF((x) => ({ ...x, channel: e.target.value }))}>
                  {Object.entries(o.terms.channels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </SearchSelect>
                <FieldError id="pj-ch" message={errors.channel} />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="pj-amt">Jumlah *</Label>
            <MoneyInput id="pj-amt" value={f.amount} onChange={(v) => setF((x) => ({ ...x, amount: v }))} invalid={Boolean(errors.amount)} describedBy={errors.amount ? "pj-amt-err" : undefined} />
            <FieldError id="pj-amt" message={errors.amount} />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>Batal</Button>
            <Button type="submit" className="min-h-11" disabled={busy}>{busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}Simpan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
