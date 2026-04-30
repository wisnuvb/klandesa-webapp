"use client";

import { BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApbdesData, BelanjaItem, TrendItem } from "../../_lib/types";
import { formatRupiah, formatRupiahShort } from "../../_lib/formatting";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendKeuangan}>
                <defs>
                  <linearGradient
                    id="colorPendapatan"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#0f766e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorBelanja" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="bulan" stroke="#6b7280" />
                <YAxis
                  stroke="#6b7280"
                  width={80}
                  tickFormatter={(v) =>
                    typeof v === "number"
                      ? formatRupiahShort(v).replace(/^Rp\s?/, "")
                      : String(v)
                  }
                />
                <Tooltip
                  formatter={(value: number) => formatRupiah(Number(value))}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="pendapatan"
                  stroke="#0f766e"
                  fillOpacity={1}
                  fill="url(#colorPendapatan)"
                  strokeWidth={2}
                  name="Pendapatan"
                />
                <Area
                  type="monotone"
                  dataKey="belanja"
                  stroke="#f97316"
                  fillOpacity={1}
                  fill="url(#colorBelanja)"
                  strokeWidth={2}
                  name="Belanja"
                />
              </AreaChart>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={belanjaData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ persentase }) =>
                    `${Number(persentase).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="anggaran"
                >
                  {belanjaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatRupiah(Number(value))}
                />
              </RePieChart>
            </ResponsiveContainer>
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
