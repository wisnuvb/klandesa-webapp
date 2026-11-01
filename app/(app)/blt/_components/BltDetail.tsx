"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pill, WarningList, rupiah } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { BeneficiariesTab } from "./BeneficiariesTab";
import { PaymentsTab } from "./PaymentsTab";
import { ProgramTab } from "./ProgramTab";
import type { DetailResponse } from "./types";

type Tab = "program" | "penerima" | "pembayaran";
const TONE: Record<string, string> = { DRAFT: "open", DITETAPKAN: "info", SELESAI: "done" };

export function BltDetail({ id }: { id: number }) {
  const router = useRouter();
  const { data, loading, error, reload } = useApiGet<DetailResponse>(Number.isInteger(id) && id > 0 ? `/api/blt/${id}` : null);
  const [tab, setTab] = useState<Tab>("program");
  const [deleting, setDeleting] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  if (loading) {
    return (
      <p role="status" className="flex items-center gap-2 text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        Memuat program BLT…
      </p>
    );
  }
  if (error || !data) {
    return (
      <div className="space-y-3">
        <div role="alert" className="rounded-md border border-destructive p-4 text-destructive">
          {error ?? "Program BLT tidak ditemukan."}
        </div>
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/blt">Kembali ke daftar</Link>
        </Button>
      </div>
    );
  }

  const p = data.program;
  const active = p.beneficiaries.filter((b) => b.status === "AKTIF").length;

  async function remove() {
    setDeleting(true);
    setDelError(null);
    const res = await fetch(`/api/blt/${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) return router.push("/blt");
    const j = await res?.json().catch(() => null);
    setDelError(typeof j?.error === "string" ? j.error : "Gagal menghapus.");
    setDeleting(false);
  }

  return (
    <div className="space-y-6 pb-24">
      <Button asChild variant="ghost" className="min-h-11">
        <Link href="/blt">
          <ArrowLeft aria-hidden="true" />
          BLT Desa
        </Link>
      </Button>

      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{p.title}</h1>
            <p className="text-muted-foreground">
              Tahun {p.year} · {rupiah(p.monthly)} per keluarga per bulan · {p.totalMonths} bulan
            </p>
          </div>
          <Pill tone={TONE[p.status] ?? "neutral"}>{p.statusLabel}</Pill>
        </div>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Keluarga penerima aktif", String(active)],
            ["Kebutuhan anggaran", rupiah(p.summary.needAmount)],
            ["Sudah dibayarkan", rupiah(p.summary.paidAmount)],
            ["Sisa", rupiah(p.summary.remainingAmount)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="text-lg font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <WarningList title="Perlu diperhatikan" items={p.warnings} />
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="program" className="min-h-11">Program dan SK</TabsTrigger>
          <TabsTrigger value="penerima" className="min-h-11">Penerima ({active})</TabsTrigger>
          <TabsTrigger value="pembayaran" className="min-h-11">Pembayaran ({p.payments.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="program" className="space-y-6 pt-4">
          <ProgramTab data={data} reload={reload} />
        </TabsContent>
        <TabsContent value="penerima" className="space-y-6 pt-4">
          <BeneficiariesTab data={data} reload={reload} />
        </TabsContent>
        <TabsContent value="pembayaran" className="space-y-6 pt-4">
          <PaymentsTab data={data} reload={reload} />
        </TabsContent>
      </Tabs>

      {data.can.export ? (
        <section aria-labelledby="bl-cetak-h" className="space-y-2 border-t pt-4">
          <h2 id="bl-cetak-h" className="text-lg font-semibold">
            Cetak
          </h2>
          <p className="text-sm text-muted-foreground">Dokumen memuat NIK lengkap warga. Setiap pencetakan tercatat di log audit; simpan dan bagikan seperlunya.</p>
          <div className="flex flex-wrap gap-2">
            {[
              ["sk", "Lampiran daftar penerima (untuk SK)"],
              ["tandaterima", "Daftar tanda terima pembayaran"],
              ["rekap", "Rekap pembayaran"],
            ].map(([k, label]) => (
              <Button key={k} asChild variant="outline" className="min-h-11">
                <Link href={`/blt/cetak?id=${id}&kind=${k}`} target="_blank">
                  <Printer aria-hidden="true" />
                  {label}
                </Link>
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      {p.status === "DRAFT" && data.can.delete ? (
        <div className="border-t pt-4">
          {delError ? (
            <p role="alert" className="mb-2 text-sm text-destructive">
              {delError}
            </p>
          ) : null}
          <Button type="button" variant="outline" className="min-h-11 text-destructive" disabled={deleting} onClick={remove}>
            {deleting ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Trash2 aria-hidden="true" />}
            Hapus program draf
          </Button>
        </div>
      ) : null}
    </div>
  );
}
