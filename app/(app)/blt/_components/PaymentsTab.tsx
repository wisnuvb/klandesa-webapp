"use client";

import { useState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { PostToBkuDialog } from "@/components/app/apbdes/PostToBkuDialog";
import { Pill, SELECT_CLASS, fmtDate, rupiah } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { localToday } from "@/lib/form-input";
import type { TabProps } from "./types";

type B = TabProps["data"]["program"]["beneficiaries"][number];

export function PaymentsTab({ data, reload }: TabProps) {
  const p = data.program;
  const [paying, setPaying] = useState<B | null>(null);
  const [posting, setPosting] = useState<TabProps["data"]["program"]["payouts"][number] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const active = p.beneficiaries.filter((b) => b.status === "AKTIF");
  const canPay = p.status === "DITETAPKAN" && data.can.create;
  const months = Array.from({ length: p.totalMonths }, (_, i) => i + 1);

  async function void_(id: number) {
    setErr(null);
    const res = await fetch(`/api/blt/${p.id}/pembayaran/${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) return reload();
    const j = await res?.json().catch(() => null);
    setErr(typeof j?.error === "string" ? j.error : "Gagal membatalkan pembayaran.");
  }

  return (
    <>
      <section aria-labelledby="by-h" className="space-y-3">
        <h2 id="by-h" className="text-lg font-semibold">
          Status pembayaran per keluarga
        </h2>
        {p.status === "DRAFT" ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Pembayaran baru dapat dicatat setelah Keputusan Kepala Desa terbit dan program ditetapkan.</p> : null}
        {err ? (
          <p role="alert" className="text-sm text-destructive">
            {err}
          </p>
        ) : null}
        {active.length && p.status !== "DRAFT" ? (
          <ul className="divide-y rounded-lg border">
            {active.map((b) => (
              <li key={b.id} className="space-y-2 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {b.name} <span className="text-sm font-normal text-muted-foreground">· dibayar {rupiah(b.paidAmount)}</span>
                  </p>
                  {canPay && b.paidMonths.length < p.totalMonths - b.startMonth + 1 ? (
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setPaying(b)}>
                      Catat pembayaran
                    </Button>
                  ) : null}
                </div>
                <ol className="flex flex-wrap gap-1.5" aria-label={`Bulan pembayaran ${b.name}`}>
                  {months.map((m) => {
                    const paid = b.paidMonths.includes(m);
                    const before = m < b.startMonth;
                    return (
                      <li
                        key={m}
                        className={`inline-flex h-9 min-w-9 items-center justify-center gap-0.5 rounded-md border px-2 text-sm tabular-nums ${paid ? "border-emerald-600/40 bg-emerald-50 text-emerald-900" : before ? "border-dashed text-muted-foreground line-through" : "text-muted-foreground"}`}
                        aria-label={`Bulan ${m}: ${paid ? "sudah dibayar" : before ? "bukan hak penerima ini" : "belum dibayar"}`}
                      >
                        {paid ? <Check aria-hidden="true" className="size-3.5" /> : null}
                        {m}
                      </li>
                    );
                  })}
                </ol>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section aria-labelledby="bh-h" className="space-y-3">
        <h2 id="bh-h" className="text-lg font-semibold">
          Riwayat pembayaran
        </h2>
        {p.payments.length ? (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[40rem] text-sm">
              <caption className="sr-only">Riwayat pembayaran BLT</caption>
              <thead className="bg-muted text-left">
                <tr>
                  <th scope="col" className="px-3 py-2">Tanggal</th>
                  <th scope="col" className="px-3 py-2">Penerima</th>
                  <th scope="col" className="px-3 py-2">Bulan</th>
                  <th scope="col" className="px-3 py-2 text-right">Jumlah</th>
                  <th scope="col" className="px-3 py-2">Cara</th>
                  <th scope="col" className="px-3 py-2">Diterima oleh</th>
                  {data.can.delete ? (
                    <th scope="col" className="px-3 py-2">
                      <span className="sr-only">Aksi</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y">
                {p.payments.map((x) => (
                  <tr key={x.id}>
                    <td className="whitespace-nowrap px-3 py-2">{fmtDate(x.paidOn)}</td>
                    <td className="px-3 py-2">{x.beneficiaryName}</td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">{x.monthFrom === x.monthTo ? x.monthFrom : `${x.monthFrom}–${x.monthTo}`}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{rupiah(x.amount)}</td>
                    <td className="px-3 py-2">{x.method === "TUNAI" ? "Tunai" : "Nontunai"}</td>
                    <td className="px-3 py-2">{x.receivedBy ?? "-"}</td>
                    {data.can.delete ? (
                      <td className="px-3 py-1 text-right">
                        {p.status !== "SELESAI" && !x.bkuEntryId ? (
                          <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Batalkan pembayaran ${x.beneficiaryName} bulan ${x.monthFrom}${x.monthTo !== x.monthFrom ? `–${x.monthTo}` : ""}`} onClick={() => void_(x.id)}>
                            <Trash2 aria-hidden="true" />
                          </Button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada pembayaran tercatat.</p>
        )}
      </section>

      {p.payouts.length ? (
        <section aria-labelledby="bk-h" className="space-y-3">
          <div>
            <h2 id="bk-h" className="text-lg font-semibold">
              Pencatatan ke Buku Kas Umum
            </h2>
            <p className="text-sm text-muted-foreground">Pembayaran satu tanggal dicatat sebagai satu pengeluaran pada Buku Kas Umum, agar laporan keuangan desa lengkap. Pembayaran yang sudah tercatat tidak dapat dibatalkan sebelum pencatatannya dibatalkan.</p>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[34rem] text-sm">
              <caption className="sr-only">Pembayaran BLT per tanggal bayar dan status pencatatan Buku Kas Umum</caption>
              <thead className="bg-muted text-left">
                <tr>
                  <th scope="col" className="px-3 py-2">Tanggal bayar</th>
                  <th scope="col" className="px-3 py-2 text-right">Penerima</th>
                  <th scope="col" className="px-3 py-2 text-right">Jumlah</th>
                  <th scope="col" className="px-3 py-2">Buku Kas Umum</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {p.payouts.map((g) => (
                  <tr key={`${g.paidOn}-${g.entryId ?? "x"}`}>
                    <td className="whitespace-nowrap px-3 py-2">{fmtDate(g.paidOn)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{g.payments}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{rupiah(g.total)}</td>
                    <td className="px-3 py-1">
                      {g.entryId ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill tone="done">Tercatat · {g.voucherNo ?? "-"}</Pill>
                          {data.can.delete ? <ConfirmDelete buttonText="Batalkan" label={`Batalkan pencatatan Buku Kas Umum pembayaran ${fmtDate(g.paidOn)}`} title="Batalkan pencatatan Buku Kas Umum?" description={`Catatan pengeluaran ${rupiah(g.total)} (bukti ${g.voucherNo ?? "-"}) akan dihapus dari Buku Kas Umum; pembayaran tanggal ${fmtDate(g.paidOn)} kembali berstatus belum dicatat.`} text="Batalkan pencatatan" url={`/api/blt/${p.id}/bku?entry=${g.entryId}`} onDone={reload} /> : null}
                        </div>
                      ) : data.can.create ? (
                        <Button type="button" variant="outline" className="min-h-11" onClick={() => setPosting(g)}>
                          Catat ke BKU
                        </Button>
                      ) : (
                        <Pill tone="soon">Belum dicatat</Pill>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {posting ? <PostToBkuDialog year={Number(posting.paidOn.slice(0, 4))} title="Catat pembayaran BLT ke Buku Kas Umum" summary={`${posting.payments} penerima dibayar ${fmtDate(posting.paidOn)} · ${p.title}.`} amount={posting.total} url={`/api/blt/${p.id}/bku`} extraBody={{ paidOn: posting.paidOn }} defaultChannel={posting.method === "NONTUNAI" ? "BANK" : "TUNAI"} defaultVoucher={`BLT-${posting.paidOn}${p.payouts.filter((x) => x.paidOn === posting.paidOn && x.entryId).length ? `-${p.payouts.filter((x) => x.paidOn === posting.paidOn && x.entryId).length + 1}` : ""}`} onClose={() => setPosting(null)} onDone={() => { setPosting(null); reload(); }} /> : null}

      {paying ? (
        <PayDialog
          data={data}
          target={paying}
          onClose={() => setPaying(null)}
          onDone={() => {
            setPaying(null);
            reload();
          }}
        />
      ) : null}
    </>
  );
}

function PayDialog({ data, target, onClose, onDone }: { data: TabProps["data"]; target: B; onClose: () => void; onDone: () => void }) {
  const p = data.program;
  const free = Array.from({ length: p.totalMonths }, (_, i) => i + 1).filter((m) => m >= target.startMonth && !target.paidMonths.includes(m));
  const [from, setFrom] = useState(String(free[0] ?? 1));
  const [count, setCount] = useState("1");
  const [method, setMethod] = useState("TUNAI");
  const [date, setDate] = useState(() => localToday());
  const [by, setBy] = useState(target.name);
  const [note, setNote] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();

  // Jumlah bulan yang masih bisa dibayar berturut-turut dari bulan mulai, dibatasi aturan.
  let run = 0;
  while (run < p.cap.monthsAtOnce && free.includes(Number(from) + run)) run += 1;
  const n = Math.min(Number(count), Math.max(run, 1));
  const amount = Number(p.monthly) * n;

  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit(`/api/blt/${p.id}/pembayaran`, "POST", { beneficiaryId: target.id, monthFrom: Number(from), monthTo: Number(from) + n - 1, method, paidOn: date, receivedBy: by, note });
    if (r) onDone();
  }

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Catat pembayaran BLT</DialogTitle>
          <DialogDescription>
            {target.name}. Paling banyak {p.cap.monthsAtOnce} bulan sekaligus; jumlah dihitung otomatis dari nilai per bulan.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ monthFrom: "Bulan mulai", monthTo: "Jumlah bulan", method: "Cara", paidOn: "Tanggal", receivedBy: "Diterima oleh", note: "Catatan" }} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pay-from">Mulai bulan ke- *</Label>
              <SearchSelect id="pay-from" className={SELECT_CLASS} value={from} onChange={(e) => { setFrom(e.target.value); setCount("1"); }}>
                {free.map((m) => (
                  <option key={m} value={m}>
                    Bulan {m}
                  </option>
                ))}
              </SearchSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-count">Dibayar untuk *</Label>
              <SearchSelect id="pay-count" className={SELECT_CLASS} value={String(n)} onChange={(e) => setCount(e.target.value)}>
                {Array.from({ length: Math.max(run, 1) }, (_, i) => i + 1).map((c) => (
                  <option key={c} value={c}>
                    {c} bulan
                  </option>
                ))}
              </SearchSelect>
            </div>
          </div>
          <p role="status" className="rounded-md border bg-muted p-3 text-sm">
            Jumlah dibayarkan: <strong className="tabular-nums">{rupiah(amount)}</strong>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pay-method">Cara pembayaran *</Label>
              <SearchSelect id="pay-method" className={SELECT_CLASS} value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="TUNAI">Tunai</option>
                <option value="NONTUNAI">Nontunai (transfer)</option>
              </SearchSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-date">Tanggal *</Label>
              <Input id="pay-date" type="date" className="h-11" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(errors.paidOn)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-by">Diterima oleh (bila diwakilkan, tulis nama dan hubungannya)</Label>
            <Input id="pay-by" className="h-11" maxLength={150} value={by} onChange={(e) => setBy(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-note">Catatan</Label>
            <Input id="pay-note" className="h-11" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy || !free.length}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Simpan pembayaran
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
