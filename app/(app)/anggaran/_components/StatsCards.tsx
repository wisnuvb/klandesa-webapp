"use client";

import { DollarSign, PieChart, TrendingUp, Wallet } from "lucide-react";
import { MetricGrid, type MetricItem } from "@/components/app/patterns";
import type { VillageBudget } from "../_lib/types";
import { formatShortCurrency } from "../_lib/currency";

type StatsCardsProps = {
  latestData: VillageBudget | null;
  totalBudget: number;
  totalRealization: number;
  realizationPercentage: number;
  loading?: boolean;
};

export function StatsCards(props: StatsCardsProps) {
  const { latestData, totalBudget, totalRealization, realizationPercentage, loading } =
    props;

  const items: MetricItem[] = [
    {
      title: "Total Pendapatan",
      value: formatShortCurrency(latestData?.revenue || 0),
      subtitle: latestData ? `Tahun ${latestData.year}` : undefined,
      icon: TrendingUp,
      accent: "green",
      loading,
    },
    {
      title: "Total Anggaran",
      value: formatShortCurrency(totalBudget),
      subtitle: "Dianggarkan",
      icon: Wallet,
      accent: "info",
      loading,
    },
    {
      title: "Total Realisasi",
      value: formatShortCurrency(totalRealization),
      subtitle: `${realizationPercentage.toFixed(1)}% dari anggaran`,
      icon: PieChart,
      accent: "orange",
      loading,
    },
    {
      title: "Sisa Anggaran",
      value: formatShortCurrency(latestData?.remaining_budget || 0),
      subtitle: "Tersisa",
      icon: DollarSign,
      accent: "purple",
      loading,
    },
  ];

  return <MetricGrid items={items} />;
}
