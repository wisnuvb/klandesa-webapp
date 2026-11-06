"use client";

import Link from "next/link";
import { Building2, CalendarClock, Hourglass, LineChart, RefreshCw, Target, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTimeWib, formatNumberId, formatPercent, formatRupiah } from "@/lib/platform/metrics/format";
import type { OverviewPayload } from "@/lib/platform/metrics/overview";
import { AttentionList, GrowthSection, MrrBreakdown, OriginTabs, PartnerSection, StatusDistribution, UsageSection } from "./DashboardSections";
import { RevenueChartSection } from "./RevenueChartSection";
import { DeltaBadge, ErrorState, KpiCard, SectionCard } from "./shared";
import { useAdminData } from "./use-admin-data";

function Kpis({ data, loading }: { data: OverviewPayload | null; loading: boolean }) {
  const k = data?.kpis;
  return (
    <section aria-label="Indikator utama" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      <KpiCard
        title="Pendapatan bulan ini" icon={<Wallet className="size-4" />} loading={loading || !k}
        value={k ? formatRupiah(k.revenueThisMonth.amount) : null}
        footer={k ? (
          <span className="flex flex-col gap-0.5">
            <DeltaBadge change={k.revenueChangePct} label="vs periode sama bulan lalu" />
            <span>Bulan lalu penuh: {formatRupiah(k.revenueLastMonth.amount)}</span>
          </span>
        ) : null}
      />
      <KpiCard
        title="MRR perkiraan" icon={<LineChart className="size-4" />} loading={loading || !k}
        badge={<Badge variant="outline" className="text-[11px]">Perkiraan</Badge>}
        value={k ? formatRupiah(k.mrr) : null}
        footer={k ? <span>ARR ≈ {formatRupiah(k.arr)}. Rumus & asumsi ada di bagian bawah.</span> : null}
      />
      <KpiCard
        title="Desa aktif" icon={<Building2 className="size-4" />} loading={loading || !k}
        value={k ? formatNumberId(k.activeVillages) : null}
        footer={data ? <span>Berlangganan aktif dari {formatNumberId(data.villages.total)} desa terdaftar</span> : null}
      />
      <KpiCard
        title="Trial berjalan" icon={<Hourglass className="size-4" />} loading={loading || !k}
        value={k ? formatNumberId(k.trialRunning) : null}
        footer={data ? <span>+ {formatNumberId(data.villages.byStatus.tenggang)} dalam masa tenggang</span> : null}
      />
      <KpiCard
        title="Segera berakhir" icon={<CalendarClock className="size-4" />} loading={loading || !k}
        value={k ? <>{formatNumberId(k.expiringSoon.d7)} <span className="text-sm font-normal text-muted-foreground">dalam ≤ 7 hari</span></> : null}
        footer={k ? <span>≤ 14 hari: {k.expiringSoon.d14} · ≤ 30 hari: {k.expiringSoon.d30}</span> : null}
      />
      <KpiCard
        title="Konversi trial" icon={<Target className="size-4" />} loading={loading || !k}
        value={k ? (k.trialConversionRate == null ? "—" : formatPercent(k.trialConversionRate)) : null}
        footer={data ? (
          <span>
            {data.villages.conversion.eligible === 0
              ? "Belum cukup data (90 hari terakhir)"
              : `${data.villages.conversion.converted} dari ${data.villages.conversion.eligible} desa, 90 hari terakhir`}
          </span>
        ) : null}
      />
    </section>
  );
}

function LoadingBlock({ h = "h-64" }: { h?: string }) {
  return <Skeleton className={`${h} w-full`} />;
}

export function OwnerDashboard() {
  const { data, loading, error, reload } = useAdminData<OverviewPayload>("/api/admin/overview");

  return (
    <div className="space-y-4 p-4 md:space-y-6 md:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold md:text-2xl">Dasbor Owner</h1>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Kesehatan bisnis Klandesa dalam satu layar.{" "}
            {data ? <span className="tabular-nums">Diperbarui {formatDateTimeWib(data.generatedAt)} (data di-cache hingga 1 menit).</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="min-h-10 flex-1 sm:flex-none"><Link href="/admin/desa">Kelola desa</Link></Button>
          <Button asChild variant="outline" className="min-h-10 flex-1 sm:flex-none"><Link href="/admin/pendapatan">Pendapatan</Link></Button>
          <Button asChild variant="outline" className="min-h-10 flex-1 sm:flex-none"><Link href="/admin/mitra">Kelola mitra</Link></Button>
          <Button asChild variant="outline" className="min-h-10 flex-1 sm:flex-none"><Link href="/admin/pemda">Akun pemda</Link></Button>
          <Button asChild variant="outline" className="min-h-10 flex-1 sm:flex-none"><Link href="/admin/mitra?tab=referral">Referral</Link></Button>
          <Button type="button" variant="ghost" className="min-h-10 gap-1.5" onClick={reload} disabled={loading} aria-label="Muat ulang dasbor">
            <RefreshCw className={`size-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
            <span className="hidden sm:inline">Muat ulang</span>
          </Button>
        </div>
      </div>

      {error && !data ? <ErrorState message={error} onRetry={reload} /> : null}
      {error && data ? <ErrorState message={`Pembaruan gagal: ${error} Data yang tampil bisa sudah lama.`} onRetry={reload} /> : null}

      <Kpis data={data} loading={loading && !data} />

      <SectionCard title="Perlu perhatian" description="Daftar kerja ringkas, paling mendesak di atas.">
        {data ? <AttentionList items={data.attention} /> : error ? <p className="text-sm text-muted-foreground">Tidak dapat ditampilkan.</p> : <LoadingBlock h="h-24" />}
      </SectionCard>

      <div className="grid gap-4 md:gap-6 xl:grid-cols-2">
        <SectionCard title="Pendapatan 12 bulan terakhir" description="Pembayaran lunas per bulan (WIB).">
          {data ? <RevenueChartSection report={data.revenue12m} /> : error ? null : <LoadingBlock h="h-[300px]" />}
        </SectionCard>
        <SectionCard title="Pertumbuhan desa" description="Pendaftaran per bulan dan yang sudah berbayar.">
          {data ? <GrowthSection data={data.villages.growth} /> : error ? null : <LoadingBlock h="h-[300px]" />}
        </SectionCard>
      </div>

      <div className="grid gap-4 md:gap-6 xl:grid-cols-2">
        <SectionCard title="Status langganan desa" description="Berdasarkan status dan tanggal berakhir saat ini.">
          {data ? <StatusDistribution villages={data.villages} /> : error ? null : <LoadingBlock />}
        </SectionCard>
        <SectionCard title="Asal desa" description="Sebaran 10 teratas dan sumber akuisisi.">
          {data ? <OriginTabs villages={data.villages} /> : error ? null : <LoadingBlock />}
        </SectionCard>
      </div>

      <SectionCard title="Mitra & komisi">
        {data ? <PartnerSection partners={data.partners} /> : error ? null : <LoadingBlock />}
      </SectionCard>

      <SectionCard title="Penggunaan" description="Aktivitas pengguna dan add-on berlaku.">
        {data ? <UsageSection usage={data.usage} /> : error ? null : <LoadingBlock />}
      </SectionCard>

      <SectionCard
        title="Pembayaran terbaru"
        action={<Button asChild variant="outline" size="sm" className="min-h-10"><Link href="/admin/pendapatan">Semua tagihan</Link></Button>}
      >
        {data ? (
          data.revenue12m.latest.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada pembayaran.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {data.revenue12m.latest.map((p) => (
                <li key={p.id} className="flex flex-col gap-0.5 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="min-w-0">
                    <Link href={`/admin/desa/${p.villageId}`} className="font-medium underline-offset-4 hover:underline">{p.villageName}</Link>
                    <span className="block text-xs text-muted-foreground">{p.product} · {p.invoiceNumber} · {formatDateTimeWib(p.paidAt)}</span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">{formatRupiah(p.amount)}</span>
                </li>
              ))}
            </ul>
          )
        ) : error ? null : <LoadingBlock h="h-32" />}
      </SectionCard>

      {data ? <MrrBreakdown mrr={data.villages.mrr} /> : null}
    </div>
  );
}
