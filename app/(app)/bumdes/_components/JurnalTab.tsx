"use client";

import { useState } from "react";
import { Ban, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Textarea } from "@/components/ui/textarea";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { fmtDate } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { localToday } from "@/lib/form-input";
import { JOURNAL_SOURCE } from "@/lib/bumdes/catalog";
import type { JournalView } from "@/lib/bumdes/service";
import { AccountSelect } from "./AccountSelect";
import { Busy, EmptyNote, INPUT_CLASS, ReasonDialog, SELECT_CLASS, StatusPill, rp } from "./shared";

type Resp = { items: JournalView[]; total: number; page: number; pageSize: number; canManage: boolean };
type Unit = { id: number; name: string };

export function JurnalTab({ units }: { units: Unit[] }) {
  const [page, setPage] = useState(1);
  const [unit, setUnit] = useState("");
  const [status, setStatus] = useState("AKTIF");
  const [source, setSource] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const qs = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (unit) qs.set("unitId", unit);
  if (status) qs.set("status", status);
  if (source) qs.set("source", source);
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const { data, loading, error, reload } = useApiGet<Resp>(`/api/bumdes/jurnal?${qs}`);
  const [editing, setEditing] = useState<JournalView | "new" | null>(null);
  const [voiding, setVoiding] = useState<JournalView | null>(null);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-sm text-muted-foreground">Buku jurnal berpasangan: setiap jurnal memiliki jumlah debit yang sama dengan kredit. Jurnal dari transaksi kas dan arus APB Desa dikoreksi lewat sumbernya; jurnal manual (saldo awal, piutang, penyusutan, pindahan antar unit) dikoreksi di sini dan tidak pernah dihapus.</p>
        {data?.canManage ? (
          <Button type="button" className="min-h-11" onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" />
            Jurnal manual
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="jr-unit">Unit</Label>
          <SearchSelect id="jr-unit" className={SELECT_CLASS} value={unit} onChange={(e) => reset(setUnit)(e.target.value)}>
            <option value="">Semua</option>
            <option value="PUSAT">Kantor Pusat</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </SearchSelect>
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="jr-status">Status</Label>
          <SearchSelect id="jr-status" className={SELECT_CLASS} value={status} onChange={(e) => reset(setStatus)(e.target.value)}>
            <option value="AKTIF">Aktif</option>
            <option value="DIBATALKAN">Dibatalkan</option>
            <option value="">Semua</option>
          </SearchSelect>
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="jr-src">Sumber</Label>
          <SearchSelect id="jr-src" className={SELECT_CLASS} value={source} onChange={(e) => reset(setSource)(e.target.value)}>
            <option value="">Semua</option>
            {Object.entries(JOURNAL_SOURCE).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </SearchSelect>
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="jr-from">Dari tanggal</Label>
          <Input id="jr-from" type="date" className={INPUT_CLASS} value={from} onChange={(e) => reset(setFrom)(e.target.value)} />
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="jr-to">Sampai tanggal</Label>
          <Input id="jr-to" type="date" className={INPUT_CLASS} value={to} onChange={(e) => reset(setTo)(e.target.value)} />
        </div>
      </div>

      {loading && !data ? <Busy>Memuat jurnal…</Busy> : null}
      {error ? (
        <div role="alert" className="rounded-md border border-destructive p-4 text-destructive">
          {error}
        </div>
      ) : null}
      {data && !data.items.length ? <EmptyNote>Belum ada jurnal untuk penyaringan ini.</EmptyNote> : null}
      <ul className="min-w-0 space-y-2">
        {data?.items.map((j) => (
          <li key={j.id} className="min-w-0 rounded-lg border">
            <details className="group">
              <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm">
                <span className="whitespace-nowrap font-medium">{fmtDate(j.entryDate)}</span>
                <span className="whitespace-nowrap text-xs text-muted-foreground">{j.voucherNo}</span>
                <span className="min-w-0 flex-1 break-words">{j.description}</span>
                <span className="whitespace-nowrap tabular-nums">{rp(j.total)}</span>
                {j.status === "DIBATALKAN" ? <StatusPill tone="off">Dibatalkan</StatusPill> : <StatusPill tone="ok">Aktif</StatusPill>}
              </summary>
              <div className="min-w-0 space-y-2 border-t px-3 py-3 text-sm">
                <p className="text-muted-foreground">
                  {j.unitName} · {j.sourceLabel}
                  {j.reference ? ` · bukti ${j.reference}` : ""}
                  {j.correctsId ? ` · menggantikan jurnal #${j.correctsId}` : ""}
                </p>
                {j.status === "DIBATALKAN" && j.voidReason ? <p className="break-words">Alasan batal: {j.voidReason}</p> : null}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[26rem] text-sm">
                    <caption className="sr-only">Baris jurnal {j.voucherNo}</caption>
                    <thead className="text-left text-muted-foreground">
                      <tr>
                        <th scope="col" className="py-1 pr-2">Akun</th>
                        <th scope="col" className="py-1 pr-2 text-right">Debit</th>
                        <th scope="col" className="py-1 text-right">Kredit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {j.lines.map((l) => (
                        <tr key={l.lineNo}>
                          <td className="break-words py-1 pr-2">
                            {l.accountCode} {l.accountName}
                            {l.memo ? <span className="block text-xs text-muted-foreground">{l.memo}</span> : null}
                          </td>
                          <td className="py-1 pr-2 text-right tabular-nums">{l.debit !== "0.00" ? rp(l.debit) : ""}</td>
                          <td className="py-1 text-right tabular-nums">{l.credit !== "0.00" ? rp(l.credit) : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {data.canManage && j.editable ? (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setEditing(j)}>
                      <Pencil aria-hidden="true" />
                      Koreksi
                    </Button>
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setVoiding(j)}>
                      <Ban aria-hidden="true" />
                      Batalkan
                    </Button>
                  </div>
                ) : null}
              </div>
            </details>
          </li>
        ))}
      </ul>
      {data && pages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" className="min-h-11" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">
            Halaman {page} dari {pages}
          </span>
          <Button type="button" variant="outline" className="min-h-11" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Berikutnya
          </Button>
        </div>
      ) : null}

      {editing ? <JournalDialog journal={editing === "new" ? null : editing} units={units} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} /> : null}
      {voiding ? (
        <ReasonDialog title="Batalkan jurnal?" description={`Jurnal ${voiding.voucherNo} (${voiding.description}) dibatalkan dan tidak lagi masuk laporan. Jurnal tetap tersimpan berstatus Dibatalkan.`} confirmLabel="Batalkan jurnal" destructive url={`/api/bumdes/jurnal/${voiding.id}/batal`} onClose={() => setVoiding(null)} onDone={() => { setVoiding(null); reload(); }} />
      ) : null}
    </div>
  );
}

type Row = { key: number; accountCode: string; debit: string; credit: string; memo: string };
let rowKey = 0;
const blankRow = (): Row => ({ key: ++rowKey, accountCode: "", debit: "", credit: "", memo: "" });
const cents = (digits: string): bigint => BigInt(digits || "0") * 100n;

function JournalDialog({ journal, units, onClose, onDone }: { journal: JournalView | null; units: Unit[]; onClose: () => void; onDone: () => void }) {
  const edit = journal !== null;
  const [unitId, setUnitId] = useState(journal ? (journal.unitId === null ? "PUSAT" : String(journal.unitId)) : "PUSAT");
  const [date, setDate] = useState(journal ? journal.entryDate : localToday());
  const [description, setDescription] = useState(journal?.description ?? "");
  const [reference, setReference] = useState(journal?.reference ?? "");
  const [reason, setReason] = useState("");
  const [opening, setOpening] = useState(journal?.source === "SALDO_AWAL");
  const [rows, setRows] = useState<Row[]>(() =>
    journal
      ? journal.lines.map((l) => ({ key: ++rowKey, accountCode: l.accountCode, debit: l.debit !== "0.00" ? String(Math.round(Number(l.debit))) : "", credit: l.credit !== "0.00" ? String(Math.round(Number(l.credit))) : "", memo: l.memo ?? "" }))
      : [blankRow(), blankRow()],
  );
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const debit = rows.reduce((t, r) => t + cents(r.debit), 0n);
  const credit = rows.reduce((t, r) => t + cents(r.credit), 0n);
  const balanced = debit === credit && debit > 0n;
  const patch = (key: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  async function go(e: React.FormEvent) {
    e.preventDefault();
    const body = { unitId, entryDate: date, description, reference, opening, lines: rows.filter((r) => r.accountCode || r.debit || r.credit).map((r) => ({ accountCode: r.accountCode, debit: r.debit, credit: r.credit, memo: r.memo })), ...(edit ? { reason } : {}) };
    if (await submit(edit ? `/api/bumdes/jurnal/${journal.id}/koreksi` : "/api/bumdes/jurnal", "POST", body)) onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{edit ? `Koreksi jurnal ${journal.voucherNo}` : "Jurnal manual"}</DialogTitle>
          <DialogDescription>{edit ? "Jurnal lama dibatalkan (tetap tersimpan) dan diganti jurnal baru berikut." : "Isi tepat satu sisi (debit atau kredit) pada tiap baris. Jurnal hanya dapat disimpan bila total debit sama dengan total kredit."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="min-w-0 space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ unitId: "Entitas", entryDate: "Tanggal", description: "Uraian", reference: "Nomor bukti", lines: "Baris jurnal", reason: "Alasan" }} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="jm-unit">Entitas *</Label>
              <SearchSelect id="jm-unit" className={SELECT_CLASS} value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="PUSAT">Kantor Pusat</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </SearchSelect>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="jm-date">Tanggal *</Label>
              <Input id="jm-date" type="date" className={INPUT_CLASS} value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(errors.entryDate)} />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="jm-ref">Nomor bukti luar</Label>
              <Input id="jm-ref" className={INPUT_CLASS} maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>
          <label className={`flex min-h-11 items-start gap-2 rounded-md border p-3 text-sm ${edit ? "opacity-70" : "cursor-pointer"}`}>
            <input type="checkbox" className="mt-0.5 size-4" checked={opening} disabled={edit} onChange={(e) => { setOpening(e.target.checked); if (e.target.checked) setUnitId("PUSAT"); }} />
            <span>
              <strong>Jurnal pembukaan (saldo awal)</strong>
              <span className="block text-muted-foreground">Hanya untuk saldo yang sudah ada sebelum pembukuan di aplikasi ini, pada Kantor Pusat. Satu-satunya jurnal manual yang boleh memuat Penyertaan Modal Desa (3.1.01.01); penyertaan modal baru dicatat di tab Dana Desa.</span>
            </span>
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="jm-desc">Uraian *</Label>
            <Input id="jm-desc" className={INPUT_CLASS} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} aria-invalid={Boolean(errors.description)} />
          </div>

          <fieldset className="min-w-0 space-y-2" aria-describedby="jm-lines-help">
            <legend className="text-sm font-medium">Baris jurnal *</legend>
            <p id="jm-lines-help" className="text-xs text-muted-foreground">
              Pindahan dana antara Kantor Pusat dan unit dijurnal di kedua sisi memakai akun RK (1.1.99.01 RK Unit Usaha di pusat, 3.8.01.01 RK Pusat di unit).
            </p>
            <ul className="min-w-0 space-y-3">
              {rows.map((r, i) => (
                <li key={r.key} className="grid min-w-0 gap-2 rounded-md border p-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <div className="min-w-0 space-y-1">
                    <Label htmlFor={`jm-acc-${r.key}`} className="text-xs">Akun baris {i + 1}</Label>
                    <AccountSelect id={`jm-acc-${r.key}`} value={r.accountCode} onChange={(v) => patch(r.key, { accountCode: v })} />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <Label htmlFor={`jm-d-${r.key}`} className="text-xs">Debit</Label>
                    <CurrencyInput id={`jm-d-${r.key}`} inputClassName="h-11" value={r.debit} onValueChange={(v) => patch(r.key, { debit: v, credit: v ? "" : r.credit })} />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <Label htmlFor={`jm-c-${r.key}`} className="text-xs">Kredit</Label>
                    <CurrencyInput id={`jm-c-${r.key}`} inputClassName="h-11" value={r.credit} onValueChange={(v) => patch(r.key, { credit: v, debit: v ? "" : r.debit })} />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Hapus baris ${i + 1}`} disabled={rows.length <= 2} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setRows((rs) => [...rs, blankRow()])} disabled={rows.length >= 40}>
              <Plus aria-hidden="true" />
              Tambah baris
            </Button>
          </fieldset>

          <p role="status" className={`rounded-md border p-3 text-sm ${balanced ? "border-emerald-600/40 bg-emerald-50 text-emerald-950" : "border-amber-600/50 bg-amber-50 text-amber-950"}`}>
            Total debit <strong className="tabular-nums">{rp(Number(debit) / 100)}</strong> · total kredit <strong className="tabular-nums">{rp(Number(credit) / 100)}</strong> ·{" "}
            {balanced ? "Seimbang" : debit === credit ? "Isi jumlah" : `Selisih ${rp(Math.abs(Number(debit - credit)) / 100)} (belum seimbang)`}
          </p>
          {edit ? (
            <div className="space-y-1.5">
              <Label htmlFor="jm-reason">Alasan koreksi *</Label>
              <Textarea id="jm-reason" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={Boolean(errors.reason)} />
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy || !balanced}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Simpan jurnal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
