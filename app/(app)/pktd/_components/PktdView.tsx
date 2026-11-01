"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { Pill, SELECT_CLASS, rupiah } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { Gauge } from "./Gauge";
import type { ActivityListItem, Can } from "./types";

interface ListResponse {
  year: number;
  activities: ActivityListItem[];
  minPct: number;
  can: Can;
}

export function PktdView() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const { data, loading, error } = useApiGet<ListResponse>(`/api/pktd?year=${year}`);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6 pb-24">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Padat Karya Tunai Desa</h1>
          <p className="max-w-3xl text-muted-foreground">
            Kegiatan swakelola Dana Desa yang mengutamakan tenaga kerja warga: daftar pekerja prioritas, hari kerja, upah harian, dan pemeriksaan bahwa upah paling sedikit {data?.minPct ?? 50}% dari biaya kegiatan (Permendesa PDT 16/2025 Lampiran II.F).
          </p>
        </div>
        {data?.can.create ? (
          <Button type="button" className="min-h-11" onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            Kegiatan baru
          </Button>
        ) : null}
      </header>

      <div className="space-y-1.5">
        <Label htmlFor="pk-year">Tahun anggaran</Label>
        <SearchSelect id="pk-year" className={`${SELECT_CLASS} w-32`} value={String(year)} onChange={(e) => setYear(Number(e.target.value))}>
          {[thisYear - 2, thisYear - 1, thisYear, thisYear + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </SearchSelect>
      </div>

      {loading && !data ? (
        <p role="status" className="flex items-center gap-2 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Memuat kegiatan…
        </p>
      ) : null}
      {error ? (
        <div role="alert" className="rounded-md border border-destructive p-4 text-destructive">
          {error}
        </div>
      ) : null}
      {data && !data.activities.length ? <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Belum ada kegiatan PKTD untuk tahun {year}. Buat satu kegiatan per pekerjaan fisik (mis. rabat jalan dusun), lalu daftarkan pekerja dan catat hari kerjanya.</p> : null}

      {data?.activities.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.activities.map((a) => (
            <li key={a.id}>
              <Link href={`/pktd/${a.id}`} className="block space-y-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold">{a.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {a.location ? `${a.location} · ` : ""}Biaya {rupiah(a.cost)}
                    </p>
                  </div>
                  <Pill tone={a.status === "SELESAI" ? "done" : "info"}>{a.statusLabel}</Pill>
                </div>
                <Gauge label="Rencana upah" bps={a.plannedShareBps} minPct={data.minPct} />
                <Gauge label="Upah terealisasi" bps={a.recordedShareBps} minPct={data.minPct} />
                <p className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span>
                    {a.workers} pekerja · {a.workDays} hari kerja{a.unpaidDays ? ` · ${a.unpaidDays} belum dibayar` : ""}
                  </span>
                  <span className="inline-flex items-center">
                    Buka <ChevronRight aria-hidden="true" className="size-4" />
                  </span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {creating ? <CreateDialog year={year} onClose={() => setCreating(false)} /> : null}
    </div>
  );
}

function CreateDialog({ year, onClose }: { year: number; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [cost, setCost] = useState("");
  const [wage, setWage] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();

  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit<{ id: number }>("/api/pktd", "POST", { year, title, location, cost, plannedWage: wage });
    if (r) router.push(`/pktd/${r.id}`);
  }

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kegiatan PKTD baru ({year})</DialogTitle>
          <DialogDescription>Isi biaya dan rencana upah dari RAB. Batas upah harian dan tanggal pelaksanaan dapat dilengkapi sesudahnya.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ title: "Nama kegiatan", cost: "Total biaya", plannedWage: "Rencana upah", location: "Lokasi" }} />
          <div className="space-y-1.5">
            <Label htmlFor="pk-title">Nama kegiatan *</Label>
            <Input id="pk-title" className="h-11" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={Boolean(errors.title)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pk-loc">Lokasi</Label>
            <Input id="pk-loc" className="h-11" maxLength={200} value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pk-cost">Total biaya kegiatan *</Label>
              <CurrencyInput id="pk-cost" inputClassName="h-11" value={cost} onValueChange={setCost} aria-invalid={Boolean(errors.cost)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pk-wage">Rencana upah (dari RAB)</Label>
              <CurrencyInput id="pk-wage" inputClassName="h-11" value={wage} onValueChange={setWage} aria-invalid={Boolean(errors.plannedWage)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Buat kegiatan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
