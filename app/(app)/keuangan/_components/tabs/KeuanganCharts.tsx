"use client";

/**
 * Grafik tab Keuangan (recharts). Dipisah dari OverviewTab/BelanjaTab agar recharts hanya
 * diunduh lewat next/dynamic, bukan bagian dari bundel awal halaman keuangan.
 */
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
import type { BelanjaItem, TrendItem } from "../../_lib/types";
import { formatRupiah, formatRupiahShort } from "../../_lib/formatting";

export function TrendKeuanganChart({ data }: { data: TrendItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorPendapatan" x1="0" y1="0" x2="0" y2="1">
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
  );
}

export function KomposisiBelanjaPie({ data }: { data: BelanjaItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RePieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ persentase }) => `${Number(persentase).toFixed(0)}%`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="anggaran"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatRupiah(Number(value))} />
      </RePieChart>
    </ResponsiveContainer>
  );
}

export function AnggaranRealisasiChart({ data }: { data: BelanjaItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="bidang"
          stroke="#6b7280"
          angle={-20}
          textAnchor="end"
          height={120}
        />
        <YAxis stroke="#6b7280" />
        <Tooltip
          formatter={(value: number) => formatRupiah(Number(value))}
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
          }}
        />
        <Legend />
        <Bar dataKey="anggaran" fill="#94a3b8" name="Anggaran" radius={[4, 4, 0, 0]} />
        <Bar dataKey="realisasi" fill="#0f766e" name="Realisasi" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
