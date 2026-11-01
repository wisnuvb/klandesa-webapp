"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pill, rupiah } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { ConfigTab } from "./ConfigTab";
import { DaysTab } from "./DaysTab";
import { Gauge } from "./Gauge";
import { WorkersTab } from "./WorkersTab";
import type { DetailResponse } from "./types";

type Tab = "ringkasan" | "pekerja" | "hari";

export function PktdDetail({ id }: { id: number }) {
  const router = useRouter();
  const { data, loading, error, reload } = useApiGet<DetailResponse>(Number.isInteger(id) && id > 0 ? `/api/pktd/${id}` : null);
  const [tab, setTab] = useState<Tab>("ringkasan");
  const [deleting, setDeleting] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  if (loading) {
    return (
      <p role="status" className="flex items-center gap-2 text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        Memuat kegiatan…
      </p>
    );
  }
  if (error || !data) {
    return (
      <div className="space-y-3">
        <div role="alert" className="rounded-md border border-destructive p-4 text-destructive">
          {error ?? "Kegiatan PKTD tidak ditemukan."}
        </div>
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/pktd">Kembali ke daftar</Link>
        </Button>
      </div>
    );
  }

  const a = data.activity;

  async function remove() {
    setDeleting(true);
    setDelError(null);
    const res = await fetch(`/api/pktd/${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) return router.push("/pktd");
    const j = await res?.json().catch(() => null);
    setDelError(typeof j?.error === "string" ? j.error : "Gagal menghapus.");
    setDeleting(false);
  }

  return (
    <div className="space-y-6 pb-24">
      <Button asChild variant="ghost" className="min-h-11">
        <Link href="/pktd">
          <ArrowLeft aria-hidden="true" />
          Padat Karya Tunai Desa
        </Link>
      </Button>

      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{a.title}</h1>
            <p className="text-muted-foreground">
              Tahun {a.year}
              {a.location ? ` · ${a.location}` : ""}
              {a.activityName ? ` · ${a.activityCode} ${a.activityName}` : ""}
            </p>
          </div>
          <Pill tone={a.status === "SELESAI" ? "done" : "info"}>{a.statusLabel}</Pill>
        </div>
        <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
          <Gauge label="Rencana upah dalam RAB" bps={a.plannedShareBps} minPct={a.minPct} />
          <Gauge label="Upah terealisasi" bps={a.recordedShareBps} minPct={a.minPct} />
        </div>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Total biaya", rupiah(a.cost)],
            ["Upah tercatat", rupiah(a.recordedWage)],
            ["Sudah dibayarkan", rupiah(a.paidWage)],
            ["Pekerja · hari kerja", `${a.stats.workers} · ${a.stats.workDays}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="text-lg font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        {(["ERROR", "WARN", "INFO"] as const).map((lv) => {
          const items = a.warnings.filter((w) => w.level === lv);
          if (!items.length) return null;
          const box = lv === "ERROR" ? "border-destructive/50 bg-destructive/10 text-destructive" : lv === "WARN" ? "border-amber-600/50 bg-amber-50 text-amber-950" : "border-sky-600/40 bg-sky-50 text-sky-950";
          return (
            <div key={lv} role={lv === "ERROR" ? "alert" : "status"} className={`rounded-md border p-3 text-sm ${box}`}>
              <p className="font-medium">{lv === "ERROR" ? "Perlu diperbaiki" : lv === "WARN" ? "Perlu diperiksa" : "Catatan"}</p>
              <ul className="mt-1 list-disc space-y-1 pl-6">
                {items.map((w) => (
                  <li key={w.message}>{w.message}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="ringkasan" className="min-h-11">Biaya dan batas upah</TabsTrigger>
          <TabsTrigger value="pekerja" className="min-h-11">Pekerja ({a.stats.workers})</TabsTrigger>
          <TabsTrigger value="hari" className="min-h-11">Hari kerja dan upah</TabsTrigger>
        </TabsList>
        <TabsContent value="ringkasan" className="space-y-6 pt-4">
          <ConfigTab data={data} reload={reload} />
        </TabsContent>
        <TabsContent value="pekerja" className="space-y-6 pt-4">
          <WorkersTab data={data} reload={reload} />
        </TabsContent>
        <TabsContent value="hari" className="space-y-6 pt-4">
          <DaysTab data={data} reload={reload} />
        </TabsContent>
      </Tabs>

      <section aria-labelledby="pk-cetak-h" className="space-y-2 border-t pt-4">
        <h2 id="pk-cetak-h" className="text-lg font-semibold">
          Cetak
        </h2>
        <Button asChild variant="outline" className="min-h-11">
          <Link href={`/pktd/cetak?id=${id}`} target="_blank">
            <Printer aria-hidden="true" />
            Lembar hari kerja dan tanda terima upah
          </Link>
        </Button>
      </section>

      {a.stats.workDays === 0 && data.can.delete ? (
        <div className="border-t pt-4">
          {delError ? (
            <p role="alert" className="mb-2 text-sm text-destructive">
              {delError}
            </p>
          ) : null}
          <Button type="button" variant="outline" className="min-h-11 text-destructive" disabled={deleting} onClick={remove}>
            {deleting ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Trash2 aria-hidden="true" />}
            Hapus kegiatan
          </Button>
        </div>
      ) : null}
    </div>
  );
}
