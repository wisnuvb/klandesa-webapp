"use client";

/**
 * Grafik halaman Statistik (recharts). Dipisah dari page.tsx agar recharts hanya diunduh
 * lewat next/dynamic; tidak ikut bundel awal halaman.
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";
import type { StatisticsData } from "@/lib/statistics/types";
import { COLORS } from "./chart-colors";

const TOOLTIP_STYLE = {
  backgroundColor: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
};

export function PerubahanPendudukChart({ data }: { data: NonNullable<StatisticsData["perubahanPenduduk"]>["perBulan"] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="bulan" stroke="#6b7280" />
        <YAxis stroke="#6b7280" allowDecimals={false} />
        <Tooltip
          formatter={(value, name) => [value, name]}
          labelFormatter={(_label, payload) => {
            const m = payload?.[0]?.payload;
            return m
              ? `${m.bulan} ${String(m.key).slice(0, 4)} · selisih ${m.selisih > 0 ? "+" : ""}${m.selisih}`
              : "";
          }}
        />
        <Legend />
        <Bar dataKey="bertambah" name="Lahir + datang" fill="#0f766e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="berkurang" name="Meninggal + pindah" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function JenisKelaminOverviewPie({ data }: { data: StatisticsData["jenisKelamin"] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RePieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percentage }) => `${name}: ${percentage}%`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={index === 0 ? "#3b82f6" : "#ec4899"} />
          ))}
        </Pie>
        <Tooltip />
      </RePieChart>
    </ResponsiveContainer>
  );
}

export function UsiaChart({ data }: { data: StatisticsData["usia"] }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="range" stroke="#6b7280" />
        <YAxis stroke="#6b7280" />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend />
        <Bar dataKey="lakilaki" fill="#3b82f6" name="Laki-laki" radius={[4, 4, 0, 0]} />
        <Bar dataKey="perempuan" fill="#ec4899" name="Perempuan" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function JenisKelaminDetailPie({ data }: { data: StatisticsData["jenisKelamin"] }) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <RePieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={true}
          label={({ name, value, percentage }) => `${name}: ${value} (${percentage}%)`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={index === 0 ? "#3b82f6" : "#ec4899"} />
          ))}
        </Pie>
        <Tooltip />
      </RePieChart>
    </ResponsiveContainer>
  );
}

export function PendidikanChart({ data }: { data: StatisticsData["pendidikan"] }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" stroke="#6b7280" />
        <YAxis dataKey="tingkat" type="category" stroke="#6b7280" width={120} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="jumlah" fill="#0f766e" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PekerjaanChart({ data }: { data: StatisticsData["pekerjaan"] }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="pekerjaan" stroke="#6b7280" angle={-45} textAnchor="end" height={100} />
        <YAxis stroke="#6b7280" />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="jumlah" fill="#0f766e" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PerkawinanPie({ data }: { data: StatisticsData["perkawinan"] }) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <RePieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={true}
          label={({ status, jumlah }) => `${status}: ${jumlah}`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="jumlah"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </RePieChart>
    </ResponsiveContainer>
  );
}

export function AgamaChart({ data }: { data: StatisticsData["agama"] }) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="agama" stroke="#6b7280" />
        <YAxis stroke="#6b7280" />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="jumlah" fill="#0f766e" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function WilayahChart({ data }: { data: StatisticsData["wilayah"] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="wilayah" stroke="#6b7280" />
        <YAxis stroke="#6b7280" />
        <Tooltip />
        <Bar dataKey="jumlah" fill="#0f766e" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
