"use client";

import { useState } from "react";
import Link from "next/link";
import { Ban, HandCoins, Landmark, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { fmtDate } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { localToday } from "@/lib/form-input";
import { FLOW_KIND, type FlowKind } from "@/lib/bumdes/catalog";
import type { FlowView, FlowsOverview, ResolutionView } from "@/lib/bumdes/service";
import { AccountSelect } from "./AccountSelect";
import { Busy, EmptyNote, INPUT_CLASS, ReasonDialog, SELECT_CLASS, StatusPill, rp } from "./shared";

type Resp = FlowsOverview & { canManage: boolean; canVoid: boolean };

export function DanaDesaTab() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const { data, loading, error, reload } = useApiGet<Resp>(`/api/bumdes/dana-desa?year=${year}`);
  const [adding, setAdding] = useState<FlowKind | null>(null);
  const [voiding, setVoiding] = useState<FlowView | null>(null);
  const [addingRes, setAddingRes] = useState(false);
  const [voidingRes, setVoidingRes] = useState<ResolutionView | null>(null);

  return (
    <div className="min-w-0 space-y-4">
      <div className="max-w-3xl space-y-1 text-sm text-muted-foreground">
        <p>
          Hubungan BUM Desa dengan APB Desa. <strong>Penyertaan modal Desa</strong> berasal dari APB Desa (pengeluaran pembiayaan 6.2.2.01) dan <strong>bagi hasil usaha</strong> menjadi pendapatan Desa (4.1.1.01 Bagi Hasil BUMDes). Keduanya diputuskan Musyawarah Desa, jadi wajib bersandar pada keputusan Musyawarah Desa berjenis “tentang BUM Desa” berberita acara final, dengan jumlah kumulatif tidak melebihi jumlah yang diputuskan (PP 11/2021 Pasal 41 ayat 4; Pasal 17 huruf l, m, p; Pasal 59 ayat 2). Bagi hasil juga ditolak bila melebihi laba bersih tahun buku atau saldo kas.
        </p>
        <p>
          Pencatatan ditulis ke Buku Kas Umum lewat fungsi buku kas yang sama dengan menu{" "}
          <Link href="/apbdes" className="inline-flex min-h-11 items-center underline underline-offset-4">
            APB Desa
          </Link>{" "}
          (anggaran, saldo, dan bulan tutup buku tetap diperiksa di sana) dan sekaligus menjadi jurnal BUM Desa.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dd-year">Tahun anggaran (untuk ringkasan anggaran)</Label>
        <SearchSelect id="dd-year" className={`${SELECT_CLASS} w-32`} value={String(year)} onChange={(e) => setYear(Number(e.target.value))}>
          {[thisYear - 2, thisYear - 1, thisYear, thisYear + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </SearchSelect>
      </div>
      {loading && !data ? <Busy>Memuat arus APB Desa…</Busy> : null}
      {error ? <div role="alert" className="rounded-md border border-destructive p-4 text-destructive">{error}</div> : null}
      {data ? (
        <>
          <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[
              ["Anggaran penyertaan modal", data.capital.budgeted === null ? "APB Desa belum ditetapkan" : rp(data.capital.budgeted)],
              ["Sudah dicatat di BKU", rp(data.capital.spent)],
              ["Sisa anggaran", data.capital.remaining === null ? "-" : rp(data.capital.remaining)],
              ["Bagi hasil diterima Desa (semua tahun)", rp(data.totals.profitShare)],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0 rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="break-words text-lg font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          {data.capital.documentLabel ? <p className="text-xs text-muted-foreground">Anggaran dibaca dari {data.capital.documentLabel} tahun {year}.</p> : null}
          <section aria-labelledby="dd-res" className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="dd-res" className="text-lg font-semibold">
                  Keputusan Musyawarah Desa
                </h2>
                <p className="text-sm text-muted-foreground">Setiap arus bersandar pada satu keputusan dan tidak boleh melebihi jumlah yang diputuskan.</p>
              </div>
              {data.canManage ? (
                <Button type="button" variant="outline" className="min-h-11" onClick={() => setAddingRes(true)}>
                  Catat keputusan
                </Button>
              ) : null}
            </div>
            {data.resolutions.length ? (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[44rem] text-sm">
                  <caption className="sr-only">Keputusan Musyawarah Desa sebagai plafon arus</caption>
                  <thead className="bg-muted text-left">
                    <tr>
                      <th scope="col" className="px-3 py-2">Musyawarah Desa dan butir</th>
                      <th scope="col" className="px-3 py-2">Jenis</th>
                      <th scope="col" className="px-3 py-2 text-right">Diputuskan</th>
                      <th scope="col" className="px-3 py-2 text-right">Terpakai</th>
                      <th scope="col" className="px-3 py-2 text-right">Sisa</th>
                      <th scope="col" className="px-3 py-2"><span className="sr-only">Aksi</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.resolutions.map((r) => (
                      <tr key={r.id} className={r.status === "DIBATALKAN" ? "text-muted-foreground" : undefined}>
                        <td className="break-words px-3 py-2">
                          {r.meeting?.title ?? "Musyawarah tidak ditemukan"}
                          {r.decision ? <span className="block text-xs text-muted-foreground">Butir {r.decision.seq}: {r.decision.text.slice(0, 120)}</span> : null}
                          {r.status === "DIBATALKAN" ? <span className="block text-xs">Dibatalkan{r.voidReason ? `: ${r.voidReason}` : ""}</span> : null}
                        </td>
                        <td className="px-3 py-2">{r.kindLabel}{r.fiscalYear ? <span className="block text-xs text-muted-foreground">tahun buku {r.fiscalYear}</span> : null}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{rp(r.amount)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{rp(r.used)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{rp(r.remaining)}</td>
                        <td className="whitespace-nowrap px-3 py-1 text-right">
                          {data.canManage && r.status === "AKTIF" ? (
                            <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Batalkan keputusan butir ${r.decision?.seq ?? ""} ${r.meeting?.title ?? ""}`} onClick={() => setVoidingRes(r)}>
                              <Ban aria-hidden="true" />
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyNote>Belum ada keputusan tercatat. Buat Musyawarah Desa berjenis “tentang BUM Desa”, finalkan berita acaranya, lalu catat keputusannya di sini.</EmptyNote>
            )}
          </section>
          {data.canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" className="min-h-11" onClick={() => setAdding("PENYERTAAN_MODAL")}>
                <Landmark aria-hidden="true" />
                Catat penyertaan modal
              </Button>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setAdding("BAGI_HASIL")}>
                <HandCoins aria-hidden="true" />
                Catat bagi hasil ke Desa
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Mencatat arus ini butuh izin kelola BUM Desa dan izin mencatat di Buku Kas Umum APB Desa (admin).</p>
          )}
          {data.flows.length ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[48rem] text-sm">
                <caption className="sr-only">Arus penyertaan modal dan bagi hasil</caption>
                <thead className="bg-muted text-left">
                  <tr>
                    <th scope="col" className="px-3 py-2">Tanggal</th>
                    <th scope="col" className="px-3 py-2">Jenis</th>
                    <th scope="col" className="px-3 py-2">Musyawarah Desa</th>
                    <th scope="col" className="px-3 py-2 text-right">Jumlah</th>
                    <th scope="col" className="px-3 py-2">Status</th>
                    <th scope="col" className="px-3 py-2"><span className="sr-only">Aksi</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.flows.map((f) => (
                    <tr key={f.id} className={f.status === "DIBATALKAN" ? "text-muted-foreground" : undefined}>
                      <td className="whitespace-nowrap px-3 py-2">{fmtDate(f.flowDate)}</td>
                      <td className="px-3 py-2">
                        {f.kindLabel}
                        {f.fiscalYear ? <span className="block text-xs text-muted-foreground">tahun buku {f.fiscalYear}</span> : null}
                        <span className="block text-xs text-muted-foreground">Kas: {f.cashAccountName}</span>
                      </td>
                      <td className="break-words px-3 py-2">{f.musdes ? <>{f.musdes.title}{f.musdes.heldOn ? <span className="block text-xs text-muted-foreground">{fmtDate(f.musdes.heldOn)}</span> : null}</> : <span className="text-muted-foreground">Tidak ditemukan</span>}</td>
                      <td className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${f.status === "DIBATALKAN" ? "line-through" : ""}`}>{rp(f.amount)}</td>
                      <td className="px-3 py-2">
                        {f.status === "DIBATALKAN" ? <StatusPill tone="off">Dibatalkan</StatusPill> : f.warnings.length ? <StatusPill tone="warn">Periksa</StatusPill> : <StatusPill tone="ok">Tercatat</StatusPill>}
                        {f.apbdesEntry && f.status === "AKTIF" ? <span className="mt-1 block break-words text-xs text-muted-foreground">BKU {f.apbdesEntry.voucherNo}: {f.apbdesEntry.state === "OK" ? "cocok" : f.apbdesEntry.state === "HILANG" ? "catatan hilang" : "berbeda"}</span> : null}
                        {f.status === "DIBATALKAN" && f.voidReason ? <span className="mt-1 block break-words text-xs">Alasan: {f.voidReason}</span> : null}
                        {f.warnings.map((w) => (
                          <span key={w} className="mt-1 block break-words text-xs text-amber-900">{w}</span>
                        ))}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1 text-right">
                        {data.canVoid && f.status === "AKTIF" ? (
                          <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Batalkan ${f.kindLabel} ${fmtDate(f.flowDate)}`} onClick={() => setVoiding(f)}>
                            <Ban aria-hidden="true" />
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyNote>Belum ada penyertaan modal atau bagi hasil tercatat. Pastikan Musyawarah Desa sudah berberita acara final, lalu catat di sini.</EmptyNote>
          )}
          {addingRes ? <ResolutionDialog data={data} onClose={() => setAddingRes(false)} onDone={() => { setAddingRes(false); reload(); }} /> : null}
          {voidingRes ? (
            <ReasonDialog
              title="Batalkan keputusan ini?"
              description={`${voidingRes.kindLabel} ${rp(voidingRes.amount)}. Hanya dapat dibatalkan bila tidak ada catatan arus aktif yang bersandar padanya.`}
              confirmLabel="Batalkan keputusan"
              destructive
              url={`/api/bumdes/dana-desa/keputusan/${voidingRes.id}/batal`}
              onClose={() => setVoidingRes(null)}
              onDone={() => { setVoidingRes(null); reload(); }}
            />
          ) : null}
          {adding ? <FlowDialog kind={adding} data={data} onClose={() => setAdding(null)} onDone={() => { setAdding(null); reload(); }} /> : null}
          {voiding ? (
            <ReasonDialog
              title="Batalkan catatan ini?"
              description={`${voiding.kindLabel} ${rp(voiding.amount)} (${fmtDate(voiding.flowDate)}). Catatan Buku Kas Umum APB Desa yang dibuatnya ikut dihapus dan jurnal BUM Desa dibatalkan. Ditolak bila bulan Buku Kas Umum itu sudah ditutup.`}
              confirmLabel="Batalkan"
              destructive
              url={`/api/bumdes/dana-desa/${voiding.id}/batal`}
              onClose={() => setVoiding(null)}
              onDone={() => { setVoiding(null); reload(); }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function FlowDialog({ kind, data, onClose, onDone }: { kind: FlowKind; data: Resp; onClose: () => void; onDone: () => void }) {
  const capital = kind === "PENYERTAAN_MODAL";
  const options = data.resolutions.filter((r) => r.kind === kind && r.status === "AKTIF" && Number(r.remaining) > 0);
  const [date, setDate] = useState(localToday());
  const [amount, setAmount] = useState("");
  const [resolutionId, setResolutionId] = useState("");
  const [cash, setCash] = useState("");
  const [channel, setChannel] = useState("BANK");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const chosen = options.find((r) => String(r.id) === resolutionId);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (await submit("/api/bumdes/dana-desa", "POST", { kind, flowDate: date, amount, resolutionId, cashAccountCode: cash, villageChannel: channel, reference, note })) onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{FLOW_KIND[kind].label}</DialogTitle>
          <DialogDescription>{capital ? "Tercatat sebagai pengeluaran pembiayaan 6.2.2.01 di Buku Kas Umum APB Desa (harus ada di anggaran) dan menambah Penyertaan Modal Desa di ekuitas BUM Desa." : "Tercatat sebagai pendapatan 4.1.1.01 Bagi Hasil BUMDes di Buku Kas Umum APB Desa dan sebagai pengambilan oleh pemilik (3.2.01.01) di BUM Desa. Ditolak bila melebihi laba bersih tahun buku atau saldo kas BUM Desa."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="min-w-0 space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ flowDate: "Tanggal", amount: "Jumlah", resolutionId: "Keputusan Musyawarah Desa", cashAccountCode: "Akun kas BUM Desa", villageChannel: "Kas Desa", reference: "Nomor bukti", note: "Catatan" }} />
          <div className="space-y-1.5">
            <Label htmlFor="fl-res">Keputusan Musyawarah Desa *</Label>
            <SearchSelect id="fl-res" className={SELECT_CLASS} value={resolutionId} onChange={(e) => setResolutionId(e.target.value)} aria-invalid={Boolean(errors.resolutionId)} placeholder="Pilih keputusan">
              <option value="">Pilih keputusan</option>
              {options.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.meeting?.title ?? "Musyawarah"} · butir {r.decision?.seq ?? "?"}{r.fiscalYear ? ` · tahun buku ${r.fiscalYear}` : ""} · sisa {rp(r.remaining)}
                </option>
              ))}
            </SearchSelect>
            <p className="text-xs text-muted-foreground">{options.length ? "Jumlah kumulatif arus tidak boleh melebihi jumlah yang diputuskan." : "Belum ada keputusan dengan sisa jumlah. Catat dulu keputusan Musyawarah Desa di bagian atas tab ini."}</p>
            {chosen?.decision ? <p className="break-words rounded-md bg-muted p-2 text-xs">Butir {chosen.decision.seq}: {chosen.decision.text}</p> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="fl-date">{capital ? "Tanggal dibayar" : "Tanggal diterima"} *</Label>
              <Input id="fl-date" type="date" className={INPUT_CLASS} value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(errors.flowDate)} />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="fl-amt">Jumlah *</Label>
              <CurrencyInput id="fl-amt" inputClassName="h-11" value={amount} onValueChange={setAmount} aria-invalid={Boolean(errors.amount)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fl-cash">Akun kas BUM Desa *</Label>
            <AccountSelect id="fl-cash" only="cash" value={cash} onChange={setCash} invalid={Boolean(errors.cashAccountCode)} placeholder="Pilih akun kas atau bank" />
            <p className="text-xs text-muted-foreground">{capital ? "Uang penyertaan modal ditempatkan di rekening BUM Desa (Pasal 43 ayat 2)." : "Akun kas Kantor Pusat BUM Desa yang membayar bagi hasil."}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fl-ch">Kas Desa pada Buku Kas Umum *</Label>
            <SearchSelect id="fl-ch" className={SELECT_CLASS} value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="BANK">Rekening kas desa (bank)</option>
              <option value="TUNAI">Kas tunai</option>
            </SearchSelect>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="fl-ref">Nomor bukti</Label>
              <Input id="fl-ref" className={INPUT_CLASS} maxLength={150} value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="fl-note">Catatan</Label>
              <Input id="fl-note" className={INPUT_CLASS} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResolutionDialog({ data, onClose, onDone }: { data: Resp; onClose: () => void; onDone: () => void }) {
  const [kind, setKind] = useState<FlowKind>("PENYERTAAN_MODAL");
  const [meeting, setMeeting] = useState("");
  const [decision, setDecision] = useState("");
  const [amount, setAmount] = useState("");
  const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear() - 1));
  const [note, setNote] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const m = data.meetings.find((x) => String(x.id) === meeting);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (await submit("/api/bumdes/dana-desa/keputusan", "POST", { kind, musdesMeetingId: meeting, decisionId: decision, amount, ...(kind === "BAGI_HASIL" ? { fiscalYear } : {}), note })) onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Catat keputusan Musyawarah Desa</DialogTitle>
          <DialogDescription>Jumlah yang diputuskan menjadi batas kumulatif arus yang dapat dicatat. Pilih Musyawarah Desa berjenis “tentang BUM Desa” yang berita acaranya sudah final, lalu butir keputusannya.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="min-w-0 space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ kind: "Jenis", musdesMeetingId: "Musyawarah Desa", decisionId: "Butir keputusan", amount: "Jumlah yang diputuskan", fiscalYear: "Tahun buku", note: "Catatan" }} />
          <div className="space-y-1.5">
            <Label htmlFor="rs-kind">Jenis *</Label>
            <SearchSelect id="rs-kind" className={SELECT_CLASS} value={kind} onChange={(e) => setKind(e.target.value as FlowKind)}>
              {Object.entries(FLOW_KIND).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </SearchSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rs-meet">Musyawarah Desa *</Label>
            <SearchSelect id="rs-meet" className={SELECT_CLASS} value={meeting} onChange={(e) => { setMeeting(e.target.value); setDecision(""); }} aria-invalid={Boolean(errors.musdesMeetingId)} placeholder="Pilih Musyawarah Desa">
              <option value="">Pilih Musyawarah Desa</option>
              {data.meetings.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.title}
                  {x.heldOn ? ` (${fmtDate(x.heldOn)})` : ""}
                </option>
              ))}
            </SearchSelect>
            {!data.meetings.length ? <p className="text-xs text-muted-foreground">Belum ada. Buat Musyawarah Desa berjenis “Musyawarah Desa tentang BUM Desa” di menu Musyawarah Desa, catat keputusannya, lalu finalkan berita acaranya.</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rs-dec">Butir keputusan *</Label>
            <SearchSelect id="rs-dec" className={SELECT_CLASS} value={decision} onChange={(e) => setDecision(e.target.value)} aria-invalid={Boolean(errors.decisionId)} placeholder="Pilih butir keputusan" disabled={!m}>
              <option value="">Pilih butir keputusan</option>
              {(m?.decisions ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.seq}. {d.text.slice(0, 90)}
                </option>
              ))}
            </SearchSelect>
            {m && !m.decisions.length ? <p className="text-xs text-muted-foreground">Berita acara ini belum memuat butir keputusan.</p> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="rs-amt">Jumlah yang diputuskan *</Label>
              <CurrencyInput id="rs-amt" inputClassName="h-11" value={amount} onValueChange={setAmount} aria-invalid={Boolean(errors.amount)} />
            </div>
            {kind === "BAGI_HASIL" ? (
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="rs-fy">Tahun buku asal laba *</Label>
                <Input id="rs-fy" inputMode="numeric" className={INPUT_CLASS} maxLength={4} value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)} aria-invalid={Boolean(errors.fiscalYear)} />
              </div>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rs-note">Catatan</Label>
            <Input id="rs-note" className={INPUT_CLASS} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Simpan keputusan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
