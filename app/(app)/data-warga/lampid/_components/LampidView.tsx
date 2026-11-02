"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Baby, ChevronLeft, ChevronRight, Download, FileSpreadsheet, Flower2, Info, LogIn, LogOut, Printer, TriangleAlert, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/ui/search-select";
import { AsyncState } from "@/components/app/patterns";
import { useApiGet } from "@/hooks/useApiGet";
import {
  currentMonthKey,
  isMonthKey,
  LAMPID_KINDS,
  LAMPID_LABEL,
  MONTH_NAMES,
  monthLabel,
  shiftMonth,
  tallyTotal,
  type LampidGroup,
  type LampidKind,
  type LampidResponse,
  type Tally,
} from "@/lib/kependudukan/lampid";
import { genderNationalityTable, listTable, regionTable } from "@/lib/kependudukan/lampid-export";
import { exportLampid } from "@/lib/kependudukan/lampid-client";
import { LampidTableView } from "./LampidTableView";

const GROUPS: Array<{ value: LampidGroup; label: string }> = [
  { value: "dusun", label: "Per dusun" },
  { value: "rtrw", label: "Per RW/RT" },
];

const n = (v: number) => v.toLocaleString("id-ID");

function Card({ icon: Icon, label, sign, tally, tone }: { icon: LucideIcon; label: string; sign?: "+" | "−"; tally: Tally; tone: string }) {
  const lk = tally.wniL + tally.wnaL;
  const pr = tally.wniP + tally.wnaP;
  const wna = tally.wnaL + tally.wnaP + tally.wnaX;
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">
          {sign ? <span aria-hidden="true" className="mr-1 font-semibold text-foreground">{sign}</span> : null}
          {label}
        </p>
        <span className={`rounded-md p-1.5 ${tone}`}>
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <p className="pt-2 text-3xl font-semibold tabular-nums">{n(tallyTotal(tally))}</p>
      <p className="pt-1 text-xs text-muted-foreground">
        L {n(lk)} · P {n(pr)}
        {wna > 0 ? ` · WNA ${n(wna)}` : ""}
      </p>
    </div>
  );
}

const KIND_ICON: Record<LampidKind, LucideIcon> = { LAHIR: Baby, MATI: Flower2, PINDAH: LogOut, DATANG: LogIn };
const KIND_TONE: Record<LampidKind, string> = {
  LAHIR: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  MATI: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  PINDAH: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  DATANG: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

export function LampidView() {
  const router = useRouter();
  const params = useSearchParams();
  const [thisMonth] = useState(() => currentMonthKey(new Date()));
  const qMonth = params.get("month");
  const month = isMonthKey(qMonth) && qMonth <= thisMonth ? qMonth : thisMonth;
  const group: LampidGroup = params.get("group") === "rtrw" ? "rtrw" : "dusun";
  const [kind, setKind] = useState<LampidKind>("LAHIR");
  const [busy, setBusy] = useState<"excel" | "csv" | null>(null);

  const { data, loading, error, reload } = useApiGet<LampidResponse>(`/api/kependudukan/lampid?month=${month}&group=${group}`);
  const report = data?.report;

  const go = (next: { month?: string; group?: LampidGroup }) => {
    const sp = new URLSearchParams({ month: next.month ?? month, group: next.group ?? group });
    router.replace(`/data-warga/lampid?${sp.toString()}`, { scroll: false });
  };

  const year = Number(month.slice(0, 4));
  const thisYear = Number(thisMonth.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const maxMonth = year === thisYear ? Number(thisMonth.slice(5, 7)) : 12;
  const years = Array.from({ length: 6 }, (_, i) => thisYear - i);

  const pick = (y: number, m: number) => {
    const clamped = y === thisYear ? Math.min(m, Number(thisMonth.slice(5, 7))) : m;
    go({ month: `${y}-${String(clamped).padStart(2, "0")}` });
  };

  async function download(format: "excel" | "csv") {
    if (!data) return;
    setBusy(format);
    try {
      await exportLampid(format, data);
    } catch {
      toast.error("Gagal membuat berkas. Coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  const printHref = `/data-warga/lampid/cetak?month=${month}&group=${group}`;
  const list = report ? listTable(report, kind) : null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link href="/data-warga" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:underline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Kembali ke Data Warga
        </Link>
        <h1 className="text-2xl font-semibold">Laporan Bulanan LAMPID</h1>
        <p className="max-w-prose text-muted-foreground">Lahir, Mati, Pindah, dan Datang penduduk desa dalam satu bulan, lengkap dengan jumlah penduduk awal dan akhir bulan.</p>
      </header>

      <section aria-label="Pilih periode" className="flex flex-col gap-3 rounded-lg border bg-card p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-2">
          <Button type="button" variant="outline" size="icon" className="size-11" aria-label="Bulan sebelumnya" onClick={() => go({ month: shiftMonth(month, -1) })}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <div className="space-y-1">
            <label htmlFor="lampid-bulan" className="text-sm text-muted-foreground">
              Bulan
            </label>
            <SearchSelect id="lampid-bulan" className="h-11 w-40 rounded-md border border-input bg-input-background px-3 text-base md:text-sm" value={String(monthNumber)} onChange={(e) => pick(year, Number(e.target.value))}>
              {MONTH_NAMES.slice(0, maxMonth).map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </SearchSelect>
          </div>
          <div className="space-y-1">
            <label htmlFor="lampid-tahun" className="text-sm text-muted-foreground">
              Tahun
            </label>
            <SearchSelect id="lampid-tahun" className="h-11 w-28 rounded-md border border-input bg-input-background px-3 text-base md:text-sm" value={String(year)} onChange={(e) => pick(Number(e.target.value), monthNumber)}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </SearchSelect>
          </div>
          <Button type="button" variant="outline" size="icon" className="size-11" aria-label="Bulan berikutnya" disabled={month >= thisMonth} onClick={() => go({ month: shiftMonth(month, 1) })}>
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="min-h-11" aria-disabled={!data}>
            <Link href={printHref} tabIndex={data ? undefined : -1}>
              <Printer aria-hidden="true" />
              Cetak
            </Link>
          </Button>
          <Button type="button" variant="outline" className="min-h-11" disabled={!data || busy !== null} onClick={() => void download("excel")}>
            <FileSpreadsheet aria-hidden="true" />
            {busy === "excel" ? "Membuat…" : "Excel"}
          </Button>
          <Button type="button" variant="outline" className="min-h-11" disabled={!data || busy !== null} onClick={() => void download("csv")}>
            <Download aria-hidden="true" />
            {busy === "csv" ? "Membuat…" : "CSV daftar"}
          </Button>
        </div>
      </section>

      <AsyncState loading={loading} error={error} onRetry={reload} loadingMessage="Menyusun laporan…" minHeight="40vh">
        {report ? (
          <>
            <div>
              <h2 className="text-lg font-semibold">{monthLabel(report.month)}</h2>
              <p className="text-sm text-muted-foreground">
                Penduduk akhir = awal + lahir − mati − pindah + datang.
              </p>
            </div>

            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6" aria-label="Ringkasan bulan ini">
              <li>
                <Card icon={Users} label="Penduduk awal" tally={report.totals.awal} tone="bg-primary/10 text-primary" />
              </li>
              {LAMPID_KINDS.map((k) => (
                <li key={k}>
                  <Card icon={KIND_ICON[k]} label={LAMPID_LABEL[k]} sign={k === "LAHIR" || k === "DATANG" ? "+" : "−"} tally={report.totals[k.toLowerCase() as "lahir" | "mati" | "pindah" | "datang"]} tone={KIND_TONE[k]} />
                </li>
              ))}
              <li>
                <Card icon={Users} label="Penduduk akhir" tally={report.totals.akhir} tone="bg-primary/10 text-primary" />
              </li>
            </ul>

            {report.warnings.length ? (
              <div role="note" className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50">
                <p className="flex items-center gap-2 font-semibold">
                  <TriangleAlert aria-hidden="true" className="size-4" />
                  Periksa sebelum laporan dikirim
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  {report.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <section aria-labelledby="lampid-wilayah" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="lampid-wilayah" className="text-lg font-semibold">
                  Rincian {group === "dusun" ? "per dusun" : "per RW/RT"}
                </h2>
                <div role="group" aria-label="Kelompokkan menurut" className="flex gap-2">
                  {GROUPS.map((g) => (
                    <Chip key={g.value} active={group === g.value} label={g.label} onClick={() => go({ group: g.value })} />
                  ))}
                </div>
              </div>
              {report.lines.length ? <LampidTableView table={regionTable(report)} /> : <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada data penduduk untuk dirinci.</p>}
            </section>

            <section aria-labelledby="lampid-rincian" className="space-y-3">
              <h2 id="lampid-rincian" className="text-lg font-semibold">
                Menurut jenis kelamin dan kewarganegaraan
              </h2>
              <LampidTableView table={genderNationalityTable(report)} />
            </section>

            <section aria-labelledby="lampid-daftar" className="space-y-3">
              <h2 id="lampid-daftar" className="text-lg font-semibold">
                Daftar nama
              </h2>
              <div role="group" aria-label="Pilih kategori" className="flex flex-wrap gap-2">
                {LAMPID_KINDS.map((k) => (
                  <Chip key={k} active={kind === k} label={`${LAMPID_LABEL[k]} (${report.list[k].length})`} onClick={() => setKind(k)} />
                ))}
              </div>
              {list && report.list[kind].length ? (
                <LampidTableView table={list} muteZero={false} />
              ) : (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Tidak ada yang tercatat {LAMPID_LABEL[kind].toLowerCase()} pada {monthLabel(report.month)}.</p>
              )}
              <p className="flex gap-2 text-xs text-muted-foreground">
                <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                NIK hanya menampilkan 4 digit terakhir. Daftar mencakup {report.sources.mutasi} kejadian dari Buku Mutasi dan {report.sources.data} dari tanggal pada data warga.
              </p>
            </section>
          </>
        ) : null}
      </AsyncState>
    </div>
  );
}
