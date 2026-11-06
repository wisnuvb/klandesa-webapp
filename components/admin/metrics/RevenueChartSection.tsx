"use client";

import { RevenueBarChart, ChartPanel } from "./chart-panel";
import { formatNumberId, formatRupiah, formatDeltaPercent } from "@/lib/platform/metrics/format";
import { REVENUE_RANGE_LABEL } from "@/lib/platform/metrics/period";
import type { RevenueReport } from "@/lib/platform/metrics/revenue";

/** Grafik + ringkasan + tabel alternatif untuk satu laporan pendapatan (dipakai dasbor dan halaman Pendapatan). */
export function RevenueChartSection({ report }: { report: RevenueReport }) {
  const unit = report.granularity === "day" ? "hari" : "bulan";
  const best = report.series.reduce((a, b) => (b.amount > a.amount ? b : a), report.series[0]);
  const change = report.changePct == null ? "belum ada pembanding periode sebelumnya" : `${formatDeltaPercent(report.changePct)} dibanding periode sebelumnya (${formatRupiah(report.previous.amount)})`;
  const summary =
    report.total.count === 0
      ? `Tidak ada pembayaran lunas pada ${REVENUE_RANGE_LABEL[report.range].toLowerCase()}.`
      : `Total ${formatRupiah(report.total.amount)} dari ${formatNumberId(report.total.count)} tagihan lunas pada ${REVENUE_RANGE_LABEL[report.range].toLowerCase()}, ${change}. Per ${unit} tertinggi: ${best.label} (${formatRupiah(best.amount)}). Waktu dalam WIB.`;
  return (
    <ChartPanel
      summary={summary}
      rows={report.series}
      rowKey={(r) => r.key}
      isEmpty={report.total.count === 0}
      emptyTitle="Belum ada pembayaran"
      emptyHint="Pembayaran yang lunas akan muncul di sini setelah desa membayar tagihan."
      tableCaption={`Pendapatan per ${unit} (WIB)`}
      columns={[
        { header: report.granularity === "day" ? "Tanggal" : "Bulan", cell: (r) => r.label },
        { header: "Tagihan lunas", align: "right", cell: (r) => formatNumberId(r.count) },
        { header: "Pendapatan", align: "right", cell: (r) => formatRupiah(r.amount) },
      ]}
      chart={<RevenueBarChart data={report.series} />}
    />
  );
}
