"use client";

/**
 * Grafik dashboard (recharts). Dipisah dari page.tsx agar recharts hanya diunduh
 * lewat next/dynamic setelah halaman tampil — grafik berada di bawah lipatan.
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type NameValue = { name: string; value: number; color?: string };

export function IdmTrendChart({ data }: { data: { year: string | number; score: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="year" className="text-xs" />
        <YAxis className="text-xs" domain={[0, 1]} />
        <Tooltip />
        <Bar dataKey="score" fill="#0f766e" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GenderPieChart({ data }: { data: NameValue[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function AgeBarChart({ data }: { data: NameValue[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" className="text-xs" />
        <YAxis className="text-xs" />
        <Tooltip />
        <Bar dataKey="value" fill="#0f766e" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EducationBarChart({ data }: { data: NameValue[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis type="number" className="text-xs" />
        <YAxis dataKey="name" type="category" width={100} className="text-xs" />
        <Tooltip />
        <Bar dataKey="value" fill="#14b8a6" radius={[0, 8, 8, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
