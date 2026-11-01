"use client";

import { AlertTriangle, CheckCircle2, Loader2, Paperclip, Search } from "lucide-react";
import { useState } from "react";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Textarea } from "@/components/ui/textarea";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { dateId, rupiah, sqm, SELECT_CLASS, type AgreementDetail, type AgreementsResponse } from "./types";

type Can = AgreementsResponse["can"];
type Terms = AgreementsResponse["terms"];
const today = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);

const CHARGE_TEXT: Record<string, string> = { BELUM: "Belum diterima", DITERIMA: "Diterima", BATAL: "Dibatalkan" };

export function AgreementDetailDialog({ id, can, terms, onClose, onChanged, onEdit }: { id: number; can: Can; terms: Terms; onClose: () => void; onChanged: () => void; onEdit: (d: AgreementDetail) => void }) {
  const detail = useApiGet<AgreementDetail>(`/api/aset-desa/pemanfaatan/${id}`);
  const d = detail.data;
  const [receiving, setReceiving] = useState<AgreementDetail["charges"][number] | null>(null);
  const [reverting, setReverting] = useState<AgreementDetail["charges"][number] | null>(null);
  const [closing, setClosing] = useState<"akhiri" | "batalkan" | null>(null);
  const [adding, setAdding] = useState(false);
  const act = useFormSubmit();
  const a = d?.agreement;
  const reload = () => {
    detail.reload();
    onChanged();
  };

  async function activate() {
    if (await act.submit(`/api/aset-desa/pemanfaatan/${id}/aksi`, "POST", { action: "aktifkan" })) reload();
  }
  async function removeDoc(docId: number) {
    if (await act.submit(`/api/aset-desa/pemanfaatan/${id}/dokumen?docId=${docId}`, "DELETE")) reload();
  }
  const kindDef = a ? terms.kinds[a.kind] : null;

  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="break-words">{a ? `${a.kindLabel}: ${a.itemName}` : "Perjanjian"}</DialogTitle>
          <DialogDescription>{a ? `${a.lesseeName}. ${dateId(a.startOn)} sampai ${dateId(a.endOn)}.` : "Memuat…"}</DialogDescription>
        </DialogHeader>
        {detail.loading ? (
          <p role="status" className="flex items-center gap-2 p-4 text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-5 animate-spin" /> Memuat perjanjian…
          </p>
        ) : null}
        {detail.error ? (
          <p role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-destructive">
            {detail.error}
          </p>
        ) : null}
        {d && a ? (
          <div className="min-w-0 space-y-5">
            <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-2">
              <Item label="Status" value={a.status === "AKTIF" ? "Berlaku" : (terms.status[a.status] ?? a.status)} />
              <Item label="Nomor perjanjian" value={a.agreementNo ?? "belum diisi"} />
              <Item label="Besaran" value={`${rupiah(a.amount)} (${terms.periodUnits[a.periodUnit] ?? a.periodUnit})`} />
              <Item label="Rekening APB Desa" value={`${a.accountCode} ${terms.accounts.find((x) => x.code === a.accountCode)?.name ?? ""}`} />
              <Item label="Luas dimanfaatkan" value={a.leasedAreaSqm ? sqm(a.leasedAreaSqm) : `seluruh objek (${sqm(d.parcelAreaSqm)})`} />
              <Item label="Peraturan Desa" value={a.perdesNo ? `${a.perdesNo}, ${dateId(a.perdesDate)}` : "belum diisi"} />
              <Item label="Izin Bupati/Wali Kota" value={a.regencyPermitNo ? `${a.regencyPermitNo}, ${dateId(a.regencyPermitDate)}` : a.needsRegencyPermit ? "WAJIB, belum diisi" : "tidak diwajibkan untuk sewa"} />
              <Item label="Aset strategis" value={a.strategic ? "Ya" : "Bukan"} />
              {a.endedOn ? <Item label="Berakhir" value={`${dateId(a.endedOn)}: ${a.endedReason ?? ""}`} /> : null}
            </dl>
            {kindDef ? <p className="text-sm text-muted-foreground">Dasar: {kindDef.basis}.</p> : null}

            {d.blockers.length ? (
              <div role="status" className="space-y-1 rounded-md border border-amber-500 bg-amber-50 p-3 text-sm text-amber-950">
                <p className="flex items-center gap-2 font-medium">
                  <AlertTriangle aria-hidden="true" className="size-4" /> Belum dapat diberlakukan:
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  {d.blockers.map((b) => (
                    <li key={b} className="break-words">
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <FormErrorSummary innerRef={act.summaryRef} errors={act.errors} general={act.general} labels={{}} />

            <div className="flex flex-wrap gap-2">
              {a.status === "DRAF" && can.update ? (
                <Button type="button" variant="outline" className="min-h-11" onClick={() => onEdit(d)}>
                  Ubah draf
                </Button>
              ) : null}
              {a.status === "DRAF" && can.create ? (
                <Button type="button" className="min-h-11" disabled={act.busy || d.blockers.length > 0} onClick={activate}>
                  {act.busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : <CheckCircle2 aria-hidden="true" />}
                  Berlakukan dan buat jadwal tagihan
                </Button>
              ) : null}
              {a.status === "DRAF" && can.delete ? (
                <ConfirmDelete label="Hapus draf" buttonText="Hapus draf" title="Hapus draf perjanjian?" description="Draf ini dihapus permanen. Perjanjian yang sudah pernah berlaku tidak dapat dihapus." url={`/api/aset-desa/pemanfaatan/${id}`} onDone={() => { onChanged(); onClose(); }} />
              ) : null}
              {a.status === "AKTIF" && can.update ? (
                <>
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => setClosing("akhiri")}>
                    Akhiri perjanjian
                  </Button>
                  {d.charges.every((c) => c.status !== "DITERIMA") ? (
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setClosing("batalkan")}>
                      Batalkan perjanjian
                    </Button>
                  ) : null}
                </>
              ) : null}
            </div>

            {d.charges.length ? (
              <section aria-labelledby="tagihan-judul" className="min-w-0 space-y-2">
                <h3 id="tagihan-judul" className="text-base font-semibold">
                  Jadwal tagihan
                </h3>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[34rem] text-sm">
                    <caption className="sr-only">Jadwal tagihan perjanjian</caption>
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th scope="col" className="p-2">Ke</th>
                        <th scope="col" className="p-2">Jatuh tempo</th>
                        <th scope="col" className="p-2 text-right">Jumlah</th>
                        <th scope="col" className="p-2">Status</th>
                        <th scope="col" className="p-2">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.charges.map((c) => (
                        <tr key={c.id} className="border-t align-top">
                          <td className="p-2 tabular-nums">{c.seq}</td>
                          <td className="p-2">{dateId(c.dueOn)}</td>
                          <td className="p-2 text-right tabular-nums">{rupiah(c.amount)}</td>
                          <td className="p-2">
                            <span className="font-medium">{CHARGE_TEXT[c.status] ?? c.status}</span>
                            {c.status === "DITERIMA" ? (
                              <span className="block text-xs text-muted-foreground">
                                {dateId(c.receivedOn)}, {c.channel === "BANK" ? "rekening bank" : "kas tunai"}, bukti {c.voucherNo}
                              </span>
                            ) : null}
                            {c.entryMissing ? <span className="block text-xs font-medium text-destructive">Catatan Buku Kas Umum tidak ditemukan.</span> : null}
                            {c.entryAmountMismatch ? <span className="block text-xs font-medium text-amber-800">Jumlah di Buku Kas Umum berbeda.</span> : null}
                          </td>
                          <td className="p-2">
                            {c.status === "BELUM" && (a.status === "AKTIF" || a.status === "SELESAI") && can.receive ? (
                              <Button type="button" size="sm" className="min-h-11" aria-label={`Catat tagihan ke-${c.seq} jatuh tempo ${dateId(c.dueOn)} diterima`} onClick={() => setReceiving(c)}>
                                Catat diterima
                              </Button>
                            ) : null}
                            {c.status === "DITERIMA" && can.revert ? (
                              <Button type="button" size="sm" variant="outline" className="min-h-11" aria-label={`Batalkan penerimaan tagihan ke-${c.seq} jatuh tempo ${dateId(c.dueOn)}`} onClick={() => setReverting(c)}>
                                Batalkan penerimaan
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-muted-foreground">Mencatat penerimaan sekaligus menambah penerimaan Pendapatan Asli Desa di Buku Kas Umum. Hasil pemanfaatan wajib masuk rekening kas desa (Pasal 18).</p>
              </section>
            ) : null}

            <section aria-labelledby="lampiran-judul" className="min-w-0 space-y-2">
              <h3 id="lampiran-judul" className="text-base font-semibold">
                Dokumen lampiran
              </h3>
              {d.docs.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada lampiran. Unggah dokumen lebih dulu di Arsip Digital, lalu lampirkan di sini (surat perjanjian, Perdes, izin Bupati, laporan penilaian).</p> : null}
              <ul className="space-y-2">
                {d.docs.map((x) => (
                  <li key={x.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm">
                    <span className="min-w-0 break-words">
                      <span className="font-medium">{terms.docKinds[x.kind] ?? x.kind}</span>: {x.title ?? x.label}
                      {x.missing ? <span className="ml-2 text-destructive">(dokumen sudah dihapus dari arsip)</span> : null}
                    </span>
                    <span className="flex gap-1">
                      {!x.missing ? (
                        <Button asChild variant="outline" size="sm" className="min-h-11">
                          <a href={`/api/digital-archives/${x.archiveId}/file`} target="_blank" rel="noreferrer">
                            Buka
                          </a>
                        </Button>
                      ) : null}
                      {can.update ? (
                        <Button type="button" variant="ghost" size="sm" className="min-h-11" disabled={act.busy} onClick={() => removeDoc(x.id)}>
                          Lepas
                        </Button>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
              {can.update ? (
                <Button type="button" variant="outline" className="min-h-11" onClick={() => setAdding(true)}>
                  <Paperclip aria-hidden="true" /> Lampirkan dokumen
                </Button>
              ) : null}
            </section>

            {a.status === "AKTIF" && can.update ? <AmendForm detail={d} onSaved={reload} /> : null}
          </div>
        ) : null}

        {receiving && d ? <ReceiveDialog charge={receiving} onClose={() => setReceiving(null)} onDone={() => { setReceiving(null); reload(); }} /> : null}
        {reverting ? <RevertDialog chargeId={reverting.id} onClose={() => setReverting(null)} onDone={() => { setReverting(null); reload(); }} /> : null}
        {closing ? <CloseDialog id={id} mode={closing} onClose={() => setClosing(null)} onDone={() => { setClosing(null); reload(); }} /> : null}
        {adding ? <DocPicker id={id} terms={terms} onClose={() => setAdding(false)} onDone={() => { setAdding(false); reload(); }} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words font-medium">{value}</dd>
    </div>
  );
}

function ReceiveDialog({ charge, onClose, onDone }: { charge: AgreementDetail["charges"][number]; onClose: () => void; onDone: () => void }) {
  const [receivedOn, setReceivedOn] = useState(today());
  const [channel, setChannel] = useState("BANK");
  const [voucherNo, setVoucherNo] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (await submit(`/api/aset-desa/pemanfaatan/tagihan/${charge.id}/terima`, "POST", { receivedOn, channel, voucherNo: voucherNo || null })) onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Catat tagihan ke-{charge.seq} diterima</DialogTitle>
          <DialogDescription>
            {rupiah(charge.amount)}. Akan tercatat sebagai penerimaan di Buku Kas Umum.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="min-w-0 space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="rc-date">Tanggal diterima *</Label>
            <Input {...fieldA11y("rc-date", errors.receivedOn)} className="h-11" type="date" value={receivedOn} max={today()} onChange={(e) => setReceivedOn(e.target.value)} />
            <FieldError id="rc-date" message={errors.receivedOn} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rc-channel">Masuk ke *</Label>
            <SearchSelect {...fieldA11y("rc-channel", errors.channel)} className={SELECT_CLASS} value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="BANK">Rekening bank kas desa</option>
              <option value="TUNAI">Kas tunai (setor ke rekening kas desa)</option>
            </SearchSelect>
            <FieldError id="rc-channel" message={errors.channel} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rc-voucher">Nomor bukti</Label>
            <Input {...fieldA11y("rc-voucher", errors.voucherNo)} className="h-11" maxLength={60} value={voucherNo} onChange={(e) => setVoucherNo(e.target.value)} />
            <p className="text-sm text-muted-foreground">Kosongkan untuk nomor otomatis.</p>
            <FieldError id="rc-voucher" message={errors.voucherNo} />
          </div>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ receivedOn: "Tanggal diterima", channel: "Saluran", voucherNo: "Nomor bukti" }} />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {busy ? "Mencatat…" : "Catat penerimaan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RevertDialog({ chargeId, onClose, onDone }: { chargeId: number; onClose: () => void; onDone: () => void }) {
  const { busy, general, submit } = useFormSubmit();
  return (
    <AlertDialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Batalkan penerimaan ini?</AlertDialogTitle>
          <AlertDialogDescription>Catatan penerimaan di Buku Kas Umum ikut dihapus dan tagihan kembali berstatus belum diterima. Tidak bisa dilakukan bila bulannya sudah ditutup.</AlertDialogDescription>
        </AlertDialogHeader>
        {general ? (
          <p role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {general}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11" disabled={busy}>
            Kembali
          </AlertDialogCancel>
          <Button type="button" variant="destructive" className="min-h-11" disabled={busy} onClick={async () => { if (await submit(`/api/aset-desa/pemanfaatan/tagihan/${chargeId}/batal-terima`, "POST")) onDone(); }}>
            {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
            Batalkan penerimaan
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CloseDialog({ id, mode, onClose, onDone }: { id: number; mode: "akhiri" | "batalkan"; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [endedOn, setEndedOn] = useState(today());
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (await submit(`/api/aset-desa/pemanfaatan/${id}/aksi`, "POST", { action: mode, reason, endedOn })) onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "akhiri" ? "Akhiri perjanjian" : "Batalkan perjanjian"}</DialogTitle>
          <DialogDescription>{mode === "akhiri" ? "Tagihan yang belum jatuh tempo dibatalkan. Tagihan yang sudah jatuh tempo dan belum diterima tetap ditagih." : "Semua tagihan dibatalkan. Hanya bisa bila belum ada penerimaan."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="min-w-0 space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="cl-date">Tanggal berakhir</Label>
            <Input {...fieldA11y("cl-date", errors.endedOn)} className="h-11" type="date" value={endedOn} max={today()} onChange={(e) => setEndedOn(e.target.value)} />
            <FieldError id="cl-date" message={errors.endedOn} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cl-reason">Alasan *</Label>
            <Textarea {...fieldA11y("cl-reason", errors.reason)} rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
            <FieldError id="cl-reason" message={errors.reason} />
          </div>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ reason: "Alasan", endedOn: "Tanggal berakhir" }} />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>
              Kembali
            </Button>
            <Button type="submit" variant="destructive" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {mode === "akhiri" ? "Akhiri perjanjian" : "Batalkan perjanjian"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ArchiveRow {
  id: string | number;
  title: string;
  fileName: string;
  category?: string;
}

function DocPicker({ id, terms, onClose, onDone }: { id: number; terms: Terms; onClose: () => void; onDone: () => void }) {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("PERJANJIAN");
  const list = useApiGet<{ rows?: ArchiveRow[] }>(`/api/digital-archives?take=20${query ? `&search=${encodeURIComponent(query)}` : ""}`);
  const rows = list.data?.rows ?? [];
  const { busy, errors, general, submit } = useFormSubmit();
  async function attach(archiveId: string | number) {
    if (await submit(`/api/aset-desa/pemanfaatan/${id}/dokumen`, "POST", { kind, archiveId: String(archiveId) })) onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Lampirkan dokumen dari Arsip Digital</DialogTitle>
          <DialogDescription>Berkasnya tidak disalin; hanya ditautkan.</DialogDescription>
        </DialogHeader>
        <div className="min-w-0 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="dp-kind">Jenis dokumen</Label>
            <SearchSelect id="dp-kind" className={SELECT_CLASS} value={kind} onChange={(e) => setKind(e.target.value)}>
              {Object.entries(terms.docKinds).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </SearchSelect>
          </div>
          <form role="search" className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); }}>
            <div className="min-w-0 flex-1">
              <Label htmlFor="dp-q" className="sr-only">Cari dokumen</Label>
              <Input id="dp-q" className="h-11" value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul atau nama berkas" />
            </div>
            <Button type="submit" variant="outline" className="min-h-11">
              <Search aria-hidden="true" /> Cari
            </Button>
          </form>
          {list.loading ? <p role="status" className="text-sm text-muted-foreground">Memuat…</p> : null}
          {list.error ? <p role="alert" className="text-sm text-destructive">{list.error}</p> : null}
          {!list.loading && !list.error && rows.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada dokumen yang cocok. Unggah dulu di menu Arsip Digital.</p> : null}
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={String(r.id)} className="flex min-w-0 items-center justify-between gap-2 rounded-md border p-2 text-sm">
                <span className="min-w-0 break-words">{r.title || r.fileName}</span>
                <Button type="button" size="sm" className="min-h-11 shrink-0" disabled={busy} onClick={() => attach(r.id)}>
                  Lampirkan
                </Button>
              </li>
            ))}
          </ul>
          {errors.archiveId || general ? <p role="alert" className="text-sm text-destructive">{errors.archiveId ?? general}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AmendForm({ detail, onSaved }: { detail: AgreementDetail; onSaved: () => void }) {
  const a = detail.agreement;
  const [f, setF] = useState({ lesseeAddress: a.lesseeAddress ?? "", lesseeContact: a.lesseeContact ?? "", otherTerms: a.otherTerms ?? "", appraisalRef: a.appraisalRef ?? "", regencyPermitNo: a.regencyPermitNo ?? "", regencyPermitDate: a.regencyPermitDate ?? "" });
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const [saved, setSaved] = useState(false);
  const field = (k: keyof typeof f, label: string, type = "text", max = 255) => (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={`am-${k}`}>{label}</Label>
      <Input {...fieldA11y(`am-${k}`, errors[k])} className="h-11" type={type} maxLength={max} value={f[k]} onChange={(e) => { setSaved(false); setF((p) => ({ ...p, [k]: e.target.value })); }} />
      <FieldError id={`am-${k}`} message={errors[k]} />
    </div>
  );
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit(`/api/aset-desa/pemanfaatan/${a.id}`, "PATCH", { ...f, regencyPermitDate: f.regencyPermitDate || null });
    if (r) {
      setSaved(true);
      onSaved();
    }
  }
  return (
    <form onSubmit={go} noValidate className="min-w-0 space-y-3 rounded-lg border p-3">
      <h3 className="text-base font-semibold">Lengkapi data perjanjian yang berlaku</h3>
      <p className="text-sm text-muted-foreground">Isi pokok (tanggal, besaran, pihak) tidak dapat diubah. Bila salah, batalkan lalu buat perjanjian baru.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("lesseeAddress", "Alamat pihak")}
        {field("lesseeContact", "Kontak", "text", 40)}
        {field("regencyPermitNo", "Nomor izin Bupati/Wali Kota", "text", 100)}
        {field("regencyPermitDate", "Tanggal izin", "date")}
        {field("appraisalRef", "Rujukan penilaian", "text", 150)}
        {field("otherTerms", "Persyaratan lain", "text", 1000)}
      </div>
      <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ regencyPermitNo: "Nomor izin", regencyPermitDate: "Tanggal izin", general: "Perubahan" }} />
      <div className="flex items-center gap-3">
        <Button type="submit" variant="outline" className="min-h-11" disabled={busy}>
          {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
          Simpan kelengkapan
        </Button>
        {saved ? <span role="status" className="text-sm text-emerald-700">Tersimpan.</span> : null}
      </div>
    </form>
  );
}
