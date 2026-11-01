"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { Pill, rupiah } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { useRouter } from "next/navigation";
import type { Can, ProgramListItem } from "./types";

interface ListResponse {
  programs: ProgramListItem[];
  can: Can;
  defaults: { year: number; monthlyMax: string; monthsAtOnce: number };
}

const TONE: Record<string, string> = { DRAFT: "open", DITETAPKAN: "info", SELESAI: "done" };

export function BltView() {
  const { data, loading, error, reload } = useApiGet<ListResponse>("/api/blt");
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">BLT Desa</h1>
          <p className="max-w-3xl text-muted-foreground">
            Bantuan Langsung Tunai dari Dana Desa untuk keluarga miskin ekstrem: penetapan penerima lewat Musyawarah Desa, Keputusan Kepala Desa, pembayaran, dan penggantian penerima (Permendesa PDT 16/2025).
          </p>
        </div>
        {data?.can.create ? (
          <Button type="button" className="min-h-11" onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            Program BLT baru
          </Button>
        ) : null}
      </header>

      {loading ? (
        <p role="status" className="flex items-center gap-2 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Memuat BLT Desa…
        </p>
      ) : null}
      {error ? (
        <div role="alert" className="rounded-md border border-destructive p-4 text-destructive">
          {error}
        </div>
      ) : null}

      {data && !data.programs.length ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Belum ada program BLT.</p>
          <p className="mt-1">Mulai dari program tahun ini. Urutannya: data calon penerima, Musyawarah Desa, Keputusan Kepala Desa, lalu pembayaran. Besaran per keluarga paling banyak {rupiah(data.defaults.monthlyMax)} per bulan dan dibayarkan paling banyak {data.defaults.monthsAtOnce} bulan sekaligus.</p>
        </div>
      ) : null}

      {data?.programs.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.programs.map((p) => (
            <li key={p.id}>
              <Link href={`/blt/${p.id}`} className="block min-h-11 rounded-lg border p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold">{p.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Tahun {p.year} · {rupiah(p.monthly)} per bulan · {p.totalMonths} bulan
                    </p>
                  </div>
                  <Pill tone={TONE[p.status] ?? "neutral"}>{p.statusLabel}</Pill>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Keluarga penerima</dt>
                    <dd className="font-medium tabular-nums">{p.activeCount}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Kebutuhan</dt>
                    <dd className="font-medium tabular-nums">{rupiah(p.needAmount)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Sudah dibayar</dt>
                    <dd className="font-medium tabular-nums">{rupiah(p.paidAmount)}</dd>
                  </div>
                </dl>
                <p className="mt-2 flex items-center justify-end text-sm text-muted-foreground">
                  Buka <ChevronRight aria-hidden="true" className="size-4" />
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {creating && data ? (
        <CreateDialog
          defaults={data.defaults}
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            reload();
          }}
        />
      ) : null}
    </div>
  );
}

function CreateDialog({ defaults, onClose, onDone }: { defaults: ListResponse["defaults"]; onClose: () => void; onDone: () => void }) {
  const router = useRouter();
  const [year, setYear] = useState(String(defaults.year));
  const [title, setTitle] = useState(`BLT Desa ${defaults.year}`);
  const [monthly, setMonthly] = useState(String(Math.round(Number(defaults.monthlyMax))));
  const [months, setMonths] = useState("12");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();

  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit<{ id: number }>("/api/blt", "POST", { year: Number(year), title, monthly, totalMonths: Number(months) });
    if (r) {
      onDone();
      router.push(`/blt/${r.id}`);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Program BLT baru</DialogTitle>
          <DialogDescription>Satu program per tahun. Nilai per bulan paling banyak {rupiah(defaults.monthlyMax)} per keluarga.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ year: "Tahun", title: "Judul", monthly: "Nilai per bulan", totalMonths: "Jumlah bulan" }} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bl-year">Tahun *</Label>
              <Input id="bl-year" inputMode="numeric" className="h-11" value={year} onChange={(e) => setYear(e.target.value)} aria-invalid={Boolean(errors.year)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bl-months">Jumlah bulan *</Label>
              <Input id="bl-months" inputMode="numeric" className="h-11" value={months} onChange={(e) => setMonths(e.target.value)} aria-invalid={Boolean(errors.totalMonths)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bl-title">Judul *</Label>
            <Input id="bl-title" className="h-11" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={Boolean(errors.title)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bl-monthly">Nilai per keluarga per bulan *</Label>
            <CurrencyInput id="bl-monthly" inputClassName="h-11" value={monthly} onValueChange={setMonthly} aria-invalid={Boolean(errors.monthly)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Buat program
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
