"use client";

/** Grafik "Komisi menurut tipe" (recharts), dimuat lazy lewat next/dynamic dari page.tsx. */
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";
import { formatIdr } from "@/lib/billing/catalog";

export function KomisiTypeChart({ data }: { data: { label: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="4 8" opacity={0.3} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis
          tickFormatter={(v: number | string) => `${Math.round(Number(v) / 1000)}rb`}
          tick={{ fontSize: 11 }}
          width={40}
        />
        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
        <RechartsTooltip
          formatter={(value: unknown) => {
            const v = typeof value === "number" ? value : Number(value);
            return [Number.isFinite(v) ? formatIdr(v) : String(value), "Jumlah"];
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
