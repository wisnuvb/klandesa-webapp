"use client";

import { useState } from "react";
import { ArrowLeftRight, Plus, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { Pill } from "@/components/app/perencanaan/shared";
import { ErrorBox, Loading } from "@/components/app/incident/common";
import { useApiGet } from "@/hooks/useApiGet";
import type { GroupView } from "@/lib/keamanan/ronda";
import { addDays } from "@/lib/keamanan/calc";
import { ActionError, Check, Field, FormShell, Pick, fmtDayShort, useAction } from "./shared";
import type { GenerateResult, ScheduleResp } from "./types";

const ATT_TONE: Record<string, string> = { PENDING: "neutral", PRESENT: "done", LATE: "soon", ABSENT: "overdue", EXCUSED: "info" };
const MARK_TEXT: Record<string, string> = { PRESENT: "Hadir", LATE: "Terlambat", ABSENT: "Tidak hadir", EXCUSED: "Izin", PENDING: "Kosongkan" };

export function ScheduleDialog({ group, onClose, onChanged }: { group: GroupView; onClose: () => void; onChanged: () => void }) {
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const q = from && to ? `?from=${from}&to=${to}` : "";
  const { data, loading, error, reload } = useApiGet<ScheduleResp>(`/api/keamanan/regu/${group.id}/jadwal${q}`);
  const refresh = () => {
    reload();
    onChanged();
  };
  const act = useAction(refresh);
  const [generating, setGenerating] = useState(false);
  const [addFor, setAddFor] = useState<string | null>(null);
  const [swapFor, setSwapFor] = useState<{ id: number; date: string; residentId: number; name: string } | null>(null);
  const today = data?.today ?? "";
  const people = group.people.filter((p) => p.active);

  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="break-words">Jadwal dan kehadiran: {group.name}</DialogTitle>
          <DialogDescription>
            {group.perShift} petugas per malam, {group.startTime} sampai {group.endTime}. Kehadiran dicatat oleh petugas desa di sini (tanpa QR/GPS).
          </DialogDescription>
        </DialogHeader>
        {loading && !data ? <Loading text="Memuat jadwal…" /> : null}
        {error ? <ErrorBox message={error} /> : null}
        <ActionError message={act.error} />

        {data ? (
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1 basis-36">
                <Field id="sc-from" label="Dari" type="date" value={from ?? data.from} onChange={setFrom} />
              </div>
              <div className="min-w-0 flex-1 basis-36">
                <Field id="sc-to" label="Sampai" type="date" value={to ?? data.to} onChange={setTo} />
              </div>
              {data.can.create && group.active ? (
                <Button type="button" className="min-h-11" onClick={() => setGenerating(true)}>
                  <Wand2 aria-hidden="true" />
                  Buat jadwal otomatis
                </Button>
              ) : null}
            </div>
            <ul className="space-y-2">
              {data.nights.map((n) => {
                const past = n.date < today;
                const isToday = n.date === today;
                return (
                  <li key={n.date} className={`min-w-0 rounded-lg border p-3 ${isToday ? "border-primary" : ""}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">
                        {fmtDayShort(n.date)}
                        {isToday ? " (malam ini)" : ""}
                      </p>
                      {n.short > 0 && !past && data.can.create && group.active ? (
                        <Button type="button" variant="outline" className="min-h-11" onClick={() => setAddFor(n.date)}>
                          <Plus aria-hidden="true" />
                          Tambah petugas ({n.shifts.length}/{data.group.perShift})
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {n.shifts.length}/{data.group.perShift} petugas
                        </span>
                      )}
                    </div>
                    {n.shifts.length ? (
                      <ul className="mt-2 divide-y">
                        {n.shifts.map((s) => (
                          <li key={s.id} className="min-w-0 space-y-2 py-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="min-w-0 break-words text-sm">
                                <span className="font-medium">{s.name}</span>
                                {s.replacedName ? <span className="text-muted-foreground"> (menggantikan {s.replacedName})</span> : null}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Pill tone={ATT_TONE[s.attendance]}>{s.attendanceLabel}</Pill>
                                {s.pendingSwap ? <Pill tone="soon">Tukar menunggu keputusan</Pill> : null}
                              </div>
                            </div>
                            {s.attendanceNote ? <p className="break-words text-xs text-muted-foreground">{s.attendanceNote}</p> : null}
                            <div className="flex flex-wrap gap-1.5">
                              {n.date <= today && data.can.update
                                ? data.markable
                                    .filter((m) => m !== s.attendance && (m !== "PENDING" || s.attendance !== "PENDING"))
                                    .map((m) => (
                                      <Button key={m} type="button" variant="outline" className="min-h-11" disabled={act.busy !== null} aria-label={`${MARK_TEXT[m]}: ${s.name}`} onClick={() => act.run(`m${s.id}${m}`, `/api/keamanan/jadwal/${s.id}/kehadiran`, "POST", { attendance: m })}>
                                        {MARK_TEXT[m]}
                                      </Button>
                                    ))
                                : null}
                              {!past && s.attendance === "PENDING" && !s.pendingSwap && data.can.create ? (
                                <Button type="button" variant="outline" className="min-h-11" onClick={() => setSwapFor({ id: s.id, date: n.date, residentId: s.residentId, name: s.name })}>
                                  <ArrowLeftRight aria-hidden="true" />
                                  Tukar/ganti
                                </Button>
                              ) : null}
                              {!past && s.attendance === "PENDING" && data.can.delete ? <ConfirmDelete label={`Hapus giliran ${s.name} ${n.date}`} title="Hapus giliran ini?" description="Giliran mendatang ini dihapus dari jadwal." url={`/api/keamanan/jadwal/${s.id}`} onDone={refresh} /> : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">Belum ada petugas.</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {generating ? <GenerateDialog group={group} people={people} today={today} onClose={() => setGenerating(false)} onDone={() => { setGenerating(false); refresh(); }} /> : null}
        {addFor ? <AddShiftDialog group={group} people={people} date={addFor} onClose={() => setAddFor(null)} onDone={() => { setAddFor(null); refresh(); }} /> : null}
        {swapFor && data ? <SwapDialog group={group} data={data} shift={swapFor} onClose={() => setSwapFor(null)} onDone={() => { setSwapFor(null); refresh(); }} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function AddShiftDialog({ group, people, date, onClose, onDone }: { group: GroupView; people: GroupView["people"]; date: string; onClose: () => void; onDone: () => void }) {
  const [res, setRes] = useState("");
  return (
    <FormShell title={`Tambah petugas: ${fmtDayShort(date)}`} labels={{ residentId: "Petugas", shiftDate: "Tanggal" }} url={`/api/keamanan/regu/${group.id}/jadwal`} body={() => ({ shiftDate: date, residentId: res ? Number(res) : "" })} onClose={onClose} onDone={() => onDone()}>
      {(errors) => <Pick id="ad-res" label="Petugas" value={res} onChange={setRes} options={[["", "Pilih petugas"], ...people.map((p): [string, string] => [String(p.residentId), p.name])]} error={errors.residentId ?? errors.shiftDate} required />}
    </FormShell>
  );
}

function GenerateDialog({ group, people, today, onClose, onDone }: { group: GroupView; people: GroupView["people"]; today: string; onClose: () => void; onDone: () => void }) {
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(addDays(today || "2026-01-01", 13));
  const [exclude, setExclude] = useState<number[]>([]);
  const [preview, setPreview] = useState<GenerateResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);

  async function call(isPreview: boolean) {
    setBusy(true);
    setErr({});
    setGeneral(null);
    try {
      const res = await fetch(`/api/keamanan/regu/${group.id}/jadwal/buat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from, to, excludeResidentIds: exclude, preview: isPreview }) });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setErr((j?.fieldErrors ?? {}) as Record<string, string>);
        setGeneral(typeof j?.error === "string" ? j.error : "Gagal membuat jadwal.");
        return;
      }
      if (isPreview) setPreview(j as GenerateResult);
      else onDone();
    } catch {
      setGeneral("Tidak bisa terhubung. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Buat jadwal otomatis</DialogTitle>
          <DialogDescription>Giliran dibagi adil: yang paling sedikit bertugas didahulukan, riwayat 90 hari ikut dihitung, malam berturut-turut dihindari bila memungkinkan. Malam yang sudah punya jadwal dilewati. Lihat pratinjau dulu sebelum menerapkan.</DialogDescription>
        </DialogHeader>
        <div className="min-w-0 space-y-4">
          <ActionError message={general} />
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <Field id="gn-from" label="Mulai malam" type="date" value={from} onChange={(v) => { setFrom(v); setPreview(null); }} error={err.from} required />
            <Field id="gn-to" label="Sampai malam" type="date" value={to} onChange={(v) => { setTo(v); setPreview(null); }} error={err.to} hint="Paling lama 62 malam." required />
          </div>
          <fieldset className="min-w-0 space-y-1">
            <legend className="text-sm font-medium">Tidak ikut periode ini (cuti/sakit)</legend>
            {people.length ? (
              people.map((p) => <Check key={p.id} id={`gn-ex-${p.id}`} label={p.name} checked={exclude.includes(p.residentId)} onChange={(c) => { setExclude((x) => (c ? [...x, p.residentId] : x.filter((i) => i !== p.residentId))); setPreview(null); }} />)
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada peserta aktif.</p>
            )}
          </fieldset>
          <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => call(true)}>
            Lihat pratinjau
          </Button>
          {preview ? (
            <div className="min-w-0 space-y-3 rounded-lg border p-3">
              <p className="text-sm">
                {preview.nights.length} malam akan diisi
                {preview.skippedDates.length ? `, ${preview.skippedDates.length} malam dilewati karena sudah terisi` : ""}. Selisih giliran terbanyak dan tersedikit: {preview.spread}. Malam berturut-turut: {preview.consecutive}.
              </p>
              {preview.warnings.length ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">
                  {preview.warnings.slice(0, 6).map((w) => (
                    <li key={w} className="break-words">
                      {w}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="max-w-full overflow-x-auto">
                <table className="w-full min-w-0 text-sm">
                  <caption className="sr-only">Jumlah giliran per petugas</caption>
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th scope="col" className="py-1 pr-2">Petugas</th>
                      <th scope="col" className="py-1 pr-2 text-right">Baru</th>
                      <th scope="col" className="py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.perPerson.map((p) => (
                      <tr key={p.residentId} className="border-t">
                        <td className="break-words py-1 pr-2">{p.name}</td>
                        <td className="py-1 pr-2 text-right tabular-nums">{p.newShifts}</td>
                        <td className="py-1 text-right tabular-nums">{p.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button type="button" className="min-h-11" disabled={busy || !preview || preview.nights.length === 0} onClick={() => call(false)}>
            Terapkan jadwal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SwapDialog({ group, data, shift, onClose, onDone }: { group: GroupView; data: ScheduleResp; shift: { id: number; date: string; residentId: number; name: string }; onClose: () => void; onDone: () => void }) {
  const [cp, setCp] = useState("");
  const [mode, setMode] = useState("replace");
  const [cpShift, setCpShift] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [reason, setReason] = useState("");
  const others = group.people.filter((p) => p.active && p.residentId !== shift.residentId);
  const cpShifts = data.nights.flatMap((n) => n.shifts.filter((s) => String(s.residentId) === cp && s.attendance === "PENDING" && n.date >= data.today && n.date !== shift.date).map((s) => [String(s.id), fmtDayShort(n.date)] as [string, string]));
  return (
    <FormShell
      title={`Tukar/ganti giliran ${fmtDayShort(shift.date)}`}
      description={`Giliran milik ${shift.name}. Permintaan baru berlaku setelah diputuskan petugas desa; catat bahwa pihak kedua setuju.`}
      labels={{ shiftId: "Giliran", counterpartResidentId: "Pihak kedua", counterpartShiftId: "Giliran pihak kedua", counterpartAgreed: "Persetujuan", reason: "Alasan" }}
      url="/api/keamanan/tukar"
      body={() => ({ shiftId: shift.id, counterpartResidentId: cp ? Number(cp) : "", counterpartShiftId: mode === "swap" && cpShift ? Number(cpShift) : null, counterpartAgreed: agreed, reason })}
      submitText="Ajukan"
      onClose={onClose}
      onDone={() => onDone()}
    >
      {(errors) => (
        <>
          <Pick id="sw-cp" label="Pihak kedua" value={cp} onChange={(v) => { setCp(v); setCpShift(""); }} options={[["", "Pilih peserta"], ...others.map((p): [string, string] => [String(p.residentId), p.name])]} error={errors.counterpartResidentId} required />
          <Pick id="sw-mode" label="Bentuk" value={mode} onChange={setMode} options={[["replace", "Digantikan saja (pihak kedua mengambil giliran ini)"], ["swap", "Bertukar (saling mengambil giliran lain)"]]} />
          {mode === "swap" ? <Pick id="sw-shift" label="Giliran pihak kedua yang ditukar" value={cpShift} onChange={setCpShift} options={[["", cp ? (cpShifts.length ? "Pilih giliran" : "Tidak ada giliran mendatang") : "Pilih pihak kedua dulu"], ...cpShifts]} error={errors.counterpartShiftId} required /> : null}
          <Check id="sw-ok" label="Pihak kedua sudah menyatakan setuju" checked={agreed} onChange={setAgreed} />
          {errors.counterpartAgreed ? <p className="text-sm text-destructive">{errors.counterpartAgreed}</p> : null}
          <Field id="sw-reason" label="Alasan" type="textarea" rows={2} max={300} value={reason} onChange={setReason} error={errors.reason} />
        </>
      )}
    </FormShell>
  );
}

