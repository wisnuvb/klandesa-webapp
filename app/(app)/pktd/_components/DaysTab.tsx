"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { FundingPanel } from "@/components/app/apbdes/FundingPanel";
import { Pill, SELECT_CLASS, fmtDate, rupiah } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { localToday } from "@/lib/form-input";
import type { TabProps } from "./types";

export function DaysTab({ data, reload }: TabProps) {
  const a = data.activity;
  const [date, setDate] = useState(() => localToday());
  const [task, setTask] = useState("PELAKSANAAN");
  const [wage, setWage] = useState<string | null>(null);
  const [paid, setPaid] = useState(() => Number(data.activity.funding.available) > 0);
  const [picked, setPicked] = useState<number[]>([]);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busyDate, setBusyDate] = useState<string | null>(null);
  const form = useFormSubmit();
  const canAdd = data.can.create && a.status === "AKTIF" && a.workers.length > 0;
  const wageValue = wage ?? (a.wageMax ? String(Math.round(Number(a.wageMax))) : "");
  const total = Number(wageValue || 0) * picked.length;

  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const r = await form.submit(`/api/pktd/${a.id}/hari`, "POST", { workDate: date, task, wage: wageValue, workerIds: picked, paid, note });
    if (r) {
      setPicked([]);
      setNote("");
      reload();
    }
  }
  async function pay(d: string) {
    setBusyDate(d);
    setErr(null);
    const res = await fetch(`/api/pktd/${a.id}/hari`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workDate: d, paidOn: localToday() }) }).catch(() => null);
    setBusyDate(null);
    if (res?.ok) return reload();
    const j = await res?.json().catch(() => null);
    setErr(typeof j?.error === "string" ? j.error : "Gagal menandai dibayar.");
  }
  async function del(d: string) {
    setBusyDate(d);
    setErr(null);
    const res = await fetch(`/api/pktd/${a.id}/hari?date=${d}`, { method: "DELETE" }).catch(() => null);
    setBusyDate(null);
    if (res?.ok) return reload();
    const j = await res?.json().catch(() => null);
    setErr(typeof j?.error === "string" ? j.error : "Gagal menghapus.");
  }

  return (
    <>
      <FundingPanel kind="PKTD" funding={a.funding} canRequest={data.can.create && a.status === "AKTIF"} year={a.year} title="Ajukan SPP upah PKTD" summary={`${a.title}. Rencana upah ${rupiah(a.plannedWage)}, sudah dibayar ${rupiah(a.paidWage)}.`} url={`/api/pktd/${a.id}/spp`} defaultActivityCode={a.activityCode} noun="Upah PKTD" reload={reload} />
      {canAdd ? (
        <form onSubmit={add} className="space-y-3 rounded-lg border p-4" noValidate>
          <h2 className="text-lg font-semibold">Catat hari kerja</h2>
          <FormErrorSummary innerRef={form.summaryRef} errors={form.errors} general={form.general} labels={{ workDate: "Tanggal kerja", task: "Jenis pekerjaan", wage: "Upah harian", workerIds: "Pekerja", note: "Catatan" }} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="dy-date">Tanggal kerja *</Label>
              <Input id="dy-date" type="date" className="h-11" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(form.errors.workDate)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dy-task">Jenis pekerjaan *</Label>
              <SearchSelect id="dy-task" className={SELECT_CLASS} value={task} onChange={(e) => setTask(e.target.value)}>
                {Object.entries(a.terms.tasks).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </SearchSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dy-wage">Upah per hari *{a.wageMin && a.wageMax ? ` (${rupiah(a.wageMin)}–${rupiah(a.wageMax)})` : ""}</Label>
              <CurrencyInput id="dy-wage" inputClassName="h-11" value={wageValue} onValueChange={setWage} aria-invalid={Boolean(form.errors.wage)} />
            </div>
          </div>
          <fieldset className="space-y-1">
            <legend className="flex w-full flex-wrap items-center justify-between gap-2 text-sm font-medium">
              <span>Pekerja yang hadir ({picked.length} dipilih)</span>
              <button type="button" className="min-h-11 rounded-md px-2 text-sm font-normal underline underline-offset-4" onClick={() => setPicked(picked.length === a.workers.length ? [] : a.workers.map((w) => w.id))}>
                {picked.length === a.workers.length ? "Kosongkan pilihan" : "Pilih semua"}
              </button>
            </legend>
            <ul className="grid max-h-64 gap-x-4 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
              {a.workers.map((w) => (
                <li key={w.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" className="size-5 shrink-0" checked={picked.includes(w.id)} onChange={() => toggle(w.id)} />
                    <span>{w.name}</span>
                  </label>
                </li>
              ))}
            </ul>
            {form.errors.workerIds ? <p className="text-sm text-destructive">{form.errors.workerIds}</p> : null}
          </fieldset>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="size-5" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
            Upah dibayarkan hari ini juga (upah dibayar setiap hari; dari dana SPP, tersedia {rupiah(a.funding.available)})
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="dy-note">Catatan</Label>
            <Input id="dy-note" className="h-11" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <p role="status" className="rounded-md border bg-muted p-3 text-sm">
            Jumlah upah hari ini: <strong className="tabular-nums">{rupiah(total)}</strong>
          </p>
          <Button type="submit" className="min-h-11" disabled={form.busy || !picked.length}>
            {form.busy ? "Menyimpan…" : "Catat hari kerja"}
          </Button>
        </form>
      ) : !a.workers.length ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Daftarkan pekerja lebih dulu di tab Pekerja.</p>
      ) : a.status === "SELESAI" ? (
        <p className="text-sm text-muted-foreground">Kegiatan sudah selesai; pencatatan hari kerja terkunci.</p>
      ) : null}

      <section aria-labelledby="dy-h" className="space-y-3">
        <h2 id="dy-h" className="text-lg font-semibold">
          Riwayat per tanggal
        </h2>
        {err ? (
          <p role="alert" className="text-sm text-destructive">
            {err}
          </p>
        ) : null}
        {a.dayGroups.length ? (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[36rem] text-sm">
              <caption className="sr-only">Hari kerja dan upah per tanggal</caption>
              <thead className="bg-muted text-left">
                <tr>
                  <th scope="col" className="px-3 py-2">Tanggal</th>
                  <th scope="col" className="px-3 py-2 text-right">Pekerja</th>
                  <th scope="col" className="px-3 py-2 text-right">Upah</th>
                  <th scope="col" className="px-3 py-2">Pembayaran</th>
                  <th scope="col" className="px-3 py-2">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {a.dayGroups.map((g) => (
                  <tr key={g.date}>
                    <td className="whitespace-nowrap px-3 py-2">{fmtDate(g.date)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{g.count}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{rupiah(g.total)}</td>
                    <td className="px-3 py-2">{g.unpaid ? <Pill tone="soon">{g.unpaid} belum dibayar</Pill> : <Pill tone="done">Sudah dibayar</Pill>}</td>
                    <td className="px-3 py-1">
                      <div className="flex justify-end gap-1">
                        {g.unpaid && data.can.update ? (
                          <Button type="button" variant="outline" className="min-h-11" disabled={busyDate === g.date} onClick={() => pay(g.date)}>
                            Tandai dibayar
                          </Button>
                        ) : null}
                        {data.can.delete && a.status === "AKTIF" ? (
                          <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Hapus catatan hari kerja ${fmtDate(g.date)}`} disabled={busyDate === g.date} onClick={() => del(g.date)}>
                            <Trash2 aria-hidden="true" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada hari kerja tercatat.</p>
        )}
      </section>
    </>
  );
}
