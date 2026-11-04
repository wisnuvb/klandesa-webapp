"use client";

import { BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApbdesData, BelanjaItem, TrendItem } from "../../_lib/types";
import { formatRupiahShort } from "../../_lib/formatting";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// recharts dimuat lazy; Skeleton setinggi grafik asli (300px) agar tidak ada lonjakan tata letak.
const TrendKeuanganChart = dynamic(
  () => import("./KeuanganCharts").then((m) => m.TrendKeuanganChart),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> },
);
const KomposisiBelanjaPie = dynamic(
  () => import("./KeuanganCharts").then((m) => m.KomposisiBelanjaPie),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> },
);

type OverviewTabProps = {
  selectedYear: string;
  trendKeuangan: TrendItem[];
  belanjaData: BelanjaItem[];
  sisaAnggaran: number;
  apbdesData: ApbdesData;
};

export function OverviewTab(props: OverviewTabProps) {
  const { selectedYear, trendKeuangan, belanjaData, sisaAnggaran, apbdesData } =
    props;

  const sisaBelanja = apbdesData.totalBelanja - apbdesData.realisasiBelanja;
  const sisaBelanjaPct = apbdesData.totalBelanja
    ? (sisaBelanja / apbdesData.totalBelanja) * 100
    : 0;
  const sisaTargetPendapatan =
    apbdesData.totalPendapatan - apbdesData.realisasiPendapatan;

  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Trend Pendapatan & Belanja {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TrendKeuanganChart data={trendKeuangan} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Komposisi Belanja per Bidang
            </CardTitle>
          </CardHeader>
          <CardContent>
            <KomposisiBelanjaPie data={belanjaData} />
            <div className="mt-4 space-y-2">
              {belanjaData.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="flex-1 text-muted-foreground">
                    {item.bidang}
                  </span>
                  <span className="font-medium">
                    {formatRupiahShort(item.anggaran)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Surplus/(Defisit)</p>
            <p className="text-2xl font-semibold mt-1">
              {formatRupiahShort(sisaAnggaran)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Selisih Pendapatan - Belanja
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Sisa Anggaran Belanja
            </p>
            <p className="text-2xl font-semibold mt-1">
              {formatRupiahShort(sisaBelanja)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {sisaBelanjaPct.toFixed(1)}% dari total anggaran
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Target Pendapatan</p>
            <p className="text-2xl font-semibold mt-1">
              {formatRupiahShort(sisaTargetPendapatan)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Sisa target tahun ini
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
