"use client";

import { useState } from "react";
import { History, Loader2, Pencil, Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { Pill, SELECT_CLASS, fmtDate, rupiah } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { localToday } from "@/lib/form-input";
import { Bar } from "./Bar";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import type { Facility, TabProps } from "./types";

const TONE: Record<string, string> = { RENCANA: "neutral", PEMBANGUNAN: "info", SELESAI: "soon", BEROPERASI: "done" };

export function FacilitiesTab({ data, reload }: TabProps) {
  const [editing, setEditing] = useState<Facility | "new" | null>(null);
  const [progressFor, setProgressFor] = useState<Facility | null>(null);
  const [historyFor, setHistoryFor] = useState<Facility | null>(null);

  return (
    <section aria-labelledby="kd-fas-h" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="kd-fas-h" className="text-lg font-semibold">
            Gerai, pergudangan, dan kelengkapan
          </h2>
          <p className="text-sm text-muted-foreground">Bandingkan angsuran yang sudah dibayar dengan kemajuan pembangunan fisiknya.</p>
        </div>
        {data.can.create ? (
          <Button type="button" className="min-h-11" onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" />
            Tambah
          </Button>
        ) : null}
      </div>

      {data.facilities.length ? (
        <ul className="grid gap-3 lg:grid-cols-2">
          {data.facilities.map((f) => {
            const ahead = f.paidBps !== null && f.paidBps / 100 - f.progressPct > 20;
            return (
              <li key={f.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-lg font-semibold">{f.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {f.kindLabel}
                      {f.location ? ` · ${f.location}` : ""}
                    </p>
                  </div>
                  <Pill tone={TONE[f.status] ?? "neutral"}>{f.statusLabel}</Pill>
                </div>
                <Bar label="Progres fisik" pct={f.progressPct} detail={f.progressOn ? `Dicatat ${fmtDate(f.progressOn)}` : "Belum ada catatan progres"} />
                <Bar label="Angsuran terbayar dari nilai pekerjaan" pct={f.paidBps === null ? null : f.paidBps / 100} tone={ahead ? "warn" : "ok"} detail={f.contract ? `${rupiah(f.paid)} dari ${rupiah(f.contract)}` : `${rupiah(f.paid)} terbayar; nilai pekerjaan belum diisi`} />
                {f.operatingOn ? <p className="text-sm">Beroperasi sejak {fmtDate(f.operatingOn)}.</p> : null}
                <div className="flex flex-wrap gap-2">
                  {data.can.create ? (
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setProgressFor(f)}>
                      <TrendingUp aria-hidden="true" />
                      Catat progres
                    </Button>
                  ) : null}
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => setHistoryFor(f)}>
                    <History aria-hidden="true" />
                    Riwayat
                  </Button>
                  {data.can.update ? (
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setEditing(f)}>
                      <Pencil aria-hidden="true" />
                      Ubah
                    </Button>
                  ) : null}
                  {data.can.delete ? <ConfirmDelete label={`Hapus ${f.name}`} title={`Hapus ${f.name}?`} description="Riwayat progresnya ikut terhapus. Gerai/gudang yang sudah punya angsuran tidak dapat dihapus sebelum angsurannya dikoreksi." url={`/api/kdmp/fasilitas/${f.id}`} onDone={reload} /> : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Belum ada gerai, gudang, atau kelengkapan untuk tahun {data.year}. Tambahkan agar angsuran dan progres fisiknya dapat dipantau.</p>
      )}

      {editing ? <FacilityDialog year={data.year} kinds={data.kinds} facility={editing === "new" ? null : editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} /> : null}
      {progressFor ? <ProgressDialog facility={progressFor} onClose={() => setProgressFor(null)} onDone={() => { setProgressFor(null); reload(); }} /> : null}
      {historyFor ? <HistoryDialog facility={historyFor} canDelete={data.can.delete} onClose={() => setHistoryFor(null)} onChanged={reload} /> : null}
    </section>
  );
}

function FacilityDialog({ year, kinds, facility, onClose, onDone }: { year: number; kinds: Record<string, string>; facility: Facility | null; onClose: () => void; onDone: () => void }) {
  const [kind, setKind] = useState(facility?.kind ?? "GERAI");
  const [name, setName] = useState(facility?.name ?? "");
  const [location, setLocation] = useState(facility?.location ?? "");
  const [contract, setContract] = useState(facility?.contract ? String(Math.round(Number(facility.contract))) : "");
  const [operatingOn, setOperatingOn] = useState(facility?.operatingOn ?? "");
  const [note, setNote] = useState(facility?.note ?? "");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const body = { kind, name, location, contract, note };
    const r = facility ? await submit(`/api/kdmp/fasilitas/${facility.id}`, "PATCH", { ...body, operatingOn }) : await submit("/api/kdmp/fasilitas", "POST", { ...body, year });
    if (r) onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{facility ? "Ubah gerai/gudang" : `Tambah gerai/gudang (${year})`}</DialogTitle>
          <DialogDescription>Nilai pekerjaan menjadi batas atas jumlah angsuran yang dapat dicatat untuk item ini.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ kind: "Jenis", name: "Nama", location: "Lokasi", contract: "Nilai pekerjaan", operatingOn: "Tanggal beroperasi", note: "Catatan", year: "Tahun" }} />
          <div className="space-y-1.5">
            <Label htmlFor="kd-f-kind">Jenis *</Label>
            <SearchSelect id="kd-f-kind" className={SELECT_CLASS} value={kind} onChange={(e) => setKind(e.target.value)}>
              {Object.entries(kinds).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </SearchSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kd-f-name">Nama *</Label>
            <Input id="kd-f-name" className="h-11" maxLength={200} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(errors.name)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kd-f-loc">Lokasi</Label>
            <Input id="kd-f-loc" className="h-11" maxLength={200} value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kd-f-contract">Nilai pekerjaan</Label>
            <CurrencyInput id="kd-f-contract" inputClassName="h-11" value={contract} onValueChange={setContract} aria-invalid={Boolean(errors.contract)} />
          </div>
          {facility ? (
            <div className="space-y-1.5">
              <Label htmlFor="kd-f-op">Tanggal mulai beroperasi</Label>
              <Input id="kd-f-op" type="date" className="h-11" value={operatingOn} onChange={(e) => setOperatingOn(e.target.value)} aria-invalid={Boolean(errors.operatingOn)} aria-describedby="kd-f-op-h" />
              <p id="kd-f-op-h" className="text-xs text-muted-foreground">
                Dapat diisi setelah progres fisik 100%. Kosongkan bila belum beroperasi.
              </p>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="kd-f-note">Catatan</Label>
            <Input id="kd-f-note" className="h-11" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
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

function ProgressDialog({ facility, onClose, onDone }: { facility: Facility; onClose: () => void; onDone: () => void }) {
  const [date, setDate] = useState(() => localToday());
  const [pct, setPct] = useState(String(facility.progressPct));
  const [note, setNote] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (await submit(`/api/kdmp/fasilitas/${facility.id}/progres`, "POST", { recordedOn: date, progressPct: pct, note })) onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Catat progres: {facility.name}</DialogTitle>
          <DialogDescription>Progres fisik terakhir {facility.progressPct}%. Progres tidak dapat lebih rendah dari catatan sebelumnya.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ recordedOn: "Tanggal", progressPct: "Progres fisik", note: "Catatan" }} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="kd-p-date">Tanggal pemeriksaan *</Label>
              <Input id="kd-p-date" type="date" className="h-11" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(errors.recordedOn)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kd-p-pct">Progres fisik (%) *</Label>
              <Input id="kd-p-pct" type="number" inputMode="numeric" min={0} max={100} step={1} className="h-11" value={pct} onChange={(e) => setPct(e.target.value)} aria-invalid={Boolean(errors.progressPct)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kd-p-note">Catatan lapangan</Label>
            <Input id="kd-p-note" className="h-11" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
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

function HistoryDialog({ facility, canDelete, onClose, onChanged }: { facility: Facility; canDelete: boolean; onClose: () => void; onChanged: () => void }) {
  const { data, loading, error, reload } = useApiGet<{ name: string; rows: { id: number; recordedOn: string; progressPct: number; note: string | null }[] }>(`/api/kdmp/fasilitas/${facility.id}/progres`);
  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Riwayat progres: {facility.name}</DialogTitle>
          <DialogDescription>Terbaru di atas. Hapus hanya untuk mengoreksi salah input.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Memuat riwayat…
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {data && !data.rows.length ? <p className="text-sm text-muted-foreground">Belum ada catatan progres.</p> : null}
        {data?.rows.length ? (
          <ul className="max-h-80 divide-y overflow-y-auto rounded-md border">
            {data.rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-1">
                <div className="min-w-0 py-1">
                  <p className="text-sm">
                    <span className="font-semibold tabular-nums">{r.progressPct}%</span> · {fmtDate(r.recordedOn)}
                  </p>
                  {r.note ? <p className="break-words text-xs text-muted-foreground">{r.note}</p> : null}
                </div>
                {canDelete ? (
                  <ConfirmDelete label={`Hapus catatan progres ${r.progressPct}% ${fmtDate(r.recordedOn)}`} title="Hapus catatan progres?" description={`Catatan progres ${r.progressPct}% tanggal ${fmtDate(r.recordedOn)} akan dihapus dan progres terakhir dihitung ulang.`} url={`/api/kdmp/fasilitas/${facility.id}/progres/${r.id}`} onDone={() => { reload(); onChanged(); }} />
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
