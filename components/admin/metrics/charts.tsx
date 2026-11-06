"use client";

/**
 * Grafik recharts untuk konsol owner. Berkas ini HANYA diimpor lewat next/dynamic (chart-panel.tsx) agar recharts tidak
 * masuk bundel awal. Warna lewat token tema (--chart-*); seri dibedakan juga oleh bentuk (batang vs garis bertitik) dan legenda.
 */
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatNumberId, formatRupiah, formatRupiahCompact } from "@/lib/platform/metrics/format";

const revenueConfig = { amount: { label: "Pendapatan", color: "var(--chart-1)" } } satisfies ChartConfig;
const growthConfig = {
  registered: { label: "Desa mendaftar", color: "var(--chart-1)" },
  converted: { label: "Sudah berbayar", color: "var(--chart-4)" },
} satisfies ChartConfig;

export type RevenueChartPoint = { label: string; amount: number; count: number };
export type GrowthChartPoint = { label: string; registered: number; converted: number };

export function RevenueBarChart({ data }: { data: RevenueChartPoint[] }) {
  return (
    <ChartContainer config={revenueConfig} className="aspect-auto h-[260px] w-full">
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8 }} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={16} />
        <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => formatRupiahCompact(v)} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value, _name, item) => (
                <div className="flex w-full flex-col gap-0.5 tabular-nums">
                  <span className="font-medium">{formatRupiah(Number(value))}</span>
                  <span className="text-muted-foreground">{formatNumberId((item.payload as RevenueChartPoint).count)} tagihan lunas</span>
                </div>
              )}
            />
          }
        />
        <Bar dataKey="amount" fill="var(--color-amount)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function GrowthChart({ data }: { data: GrowthChartPoint[] }) {
  return (
    <ChartContainer config={growthConfig} className="aspect-auto h-[260px] w-full">
      <ComposedChart data={data} margin={{ left: 4, right: 8, top: 8 }} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={12} />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="registered" fill="var(--color-registered)" radius={[3, 3, 0, 0]} />
        <Line dataKey="converted" type="monotone" stroke="var(--color-converted)" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, fill: "var(--color-converted)" }} />
      </ComposedChart>
    </ChartContainer>
  );
}
