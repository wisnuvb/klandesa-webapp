"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Info, Loader2, XCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SELECT_CLASS, rupiah } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { Bar } from "./Bar";
import { DisbursementsTab } from "./DisbursementsTab";
import { FacilitiesTab } from "./FacilitiesTab";
import { InstallmentsTab } from "./InstallmentsTab";
import type { Resp } from "./types";

type Tab = "fasilitas" | "penyaluran" | "angsuran";

const LEVELS = {
  ERROR: { title: "Perlu diperbaiki", box: "border-destructive/50 bg-destructive/10 text-destructive", Icon: XCircle, role: "alert" },
  WARN: { title: "Perlu diperiksa", box: "border-amber-600/50 bg-amber-50 text-amber-950", Icon: AlertTriangle, role: "status" },
  INFO: { title: "Catatan", box: "border-sky-600/40 bg-sky-50 text-sky-950", Icon: Info, role: "status" },
} as const;

export function KdmpView() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [tab, setTab] = useState<Tab>("fasilitas");
  const { data, loading, error, reload } = useApiGet<Resp>(`/api/kdmp?year=${year}`);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Dukungan KDMP</h1>
        <p className="max-w-3xl text-muted-foreground">Memantau dana dukungan Koperasi Desa Merah Putih: penyaluran yang diterima, angsuran pembangunan gerai dan gudang, kemajuan fisiknya, dan kesesuaiannya dengan APB Desa.</p>
      </header>

      <div className="space-y-1.5">
        <Label htmlFor="kd-year">Tahun anggaran</Label>
        <SearchSelect id="kd-year" className={`${SELECT_CLASS} w-32`} value={String(year)} onChange={(e) => setYear(Number(e.target.value))}>
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
          Memuat dukungan KDMP…
        </p>
      ) : null}
      {error ? (
        <div role="alert" className="rounded-md border border-destructive p-4 text-destructive">
          {error}
        </div>
      ) : null}

      {data ? (
        <>
          {(["ERROR", "WARN", "INFO"] as const).map((lv) => {
            const items = data.findings.filter((f) => f.level === lv);
            if (!items.length) return null;
            const { title, box, Icon, role } = LEVELS[lv];
            return (
              <div key={lv} role={role} className={`rounded-md border p-3 text-sm ${box}`}>
                <p className="flex items-center gap-2 font-medium">
                  <Icon aria-hidden="true" className="size-4" />
                  {title}
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-6">
                  {items.map((f) => (
                    <li key={f.code + f.message}>
                      {f.message}
                      {f.ref ? <span className="block text-xs opacity-80">{f.ref}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          <dl className="grid grid-cols-2 gap-2 lg:grid-cols-5">
            {[
              ["Pagu KDMP", data.pagu.kdmp ? rupiah(data.pagu.kdmp) : "Belum diisi"],
              ["Sudah diterima", rupiah(data.totals.received)],
              ["Dianggarkan di APB Desa", data.totals.budgeted === null ? "Belum ada APB Desa" : rupiah(data.totals.budgeted)],
              ["Sudah diangsurkan", rupiah(data.totals.paid)],
              ["Saldo belum diangsurkan", rupiah(data.totals.balance)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="break-words text-lg font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
            <Bar label="Diterima dari pagu KDMP" pct={data.totals.receivedBps === null ? null : data.totals.receivedBps / 100} detail={data.pagu.kdmp ? undefined : "Isi pagu KDMP di halaman Dana Desa."} />
            <Bar label="Diangsurkan dari dana yang diterima" pct={data.totals.paidBps === null ? null : data.totals.paidBps / 100} />
          </div>
          <p className="text-sm text-muted-foreground">
            Pagu KDMP diisi di halaman{" "}
            <Link href="/dana-desa" className="underline underline-offset-4">
              Dana Desa
            </Link>
            . Acuan aturan {data.rules.sharePct.toLocaleString("id-ID")}% dari pagu Dana Desa{data.rules.exact ? "" : ` (memakai aturan tahun ${data.rules.basisYear}; periksa aturan tahun ${data.year})`}
            {data.apbdes ? `. Anggaran dibaca dari ${data.apbdes.label} (${data.apbdes.status === "DITETAPKAN" ? "ditetapkan" : "draf"}).` : "."}
          </p>

          <section aria-labelledby="kd-kop-h" className="rounded-lg border p-4">
            <h2 id="kd-kop-h" className="text-lg font-semibold">
              Koperasi Desa Merah Putih
            </h2>
            {data.cooperative ? (
              <div className="mt-1 space-y-2 text-sm">
                <p>
                  <strong>{data.cooperative.name}</strong> · pembentukan {data.cooperative.stepsDone} dari {data.cooperative.stepsTotal} langkah
                  {data.cooperative.nextStep ? <> · berikutnya: {data.cooperative.nextStep}</> : <> · semua langkah selesai</>}
                </p>
                <Link href="/koperasi/pembentukan" className="inline-flex min-h-11 items-center gap-0.5 underline underline-offset-4">
                  Buka pelacak pembentukan
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Koperasi desa belum didaftarkan di Klandesa.{" "}
                <Link href="/koperasi" className="inline-flex min-h-11 items-center underline underline-offset-4">
                  Daftarkan di menu Koperasi
                </Link>
              </p>
            )}
          </section>

          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="fasilitas" className="min-h-11">Gerai dan gudang ({data.facilities.length})</TabsTrigger>
              <TabsTrigger value="penyaluran" className="min-h-11">Penyaluran dana ({data.disbursements.length})</TabsTrigger>
              <TabsTrigger value="angsuran" className="min-h-11">Angsuran ({data.installments.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="fasilitas" className="pt-4">
              <FacilitiesTab data={data} reload={reload} />
            </TabsContent>
            <TabsContent value="penyaluran" className="pt-4">
              <DisbursementsTab data={data} reload={reload} />
            </TabsContent>
            <TabsContent value="angsuran" className="pt-4">
              <InstallmentsTab data={data} reload={reload} />
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </div>
  );
}
