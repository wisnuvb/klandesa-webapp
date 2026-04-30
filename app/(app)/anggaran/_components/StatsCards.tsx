import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, PieChart, TrendingUp, Wallet } from "lucide-react";
import type { VillageBudget } from "../_lib/types";
import { formatShortCurrency } from "../_lib/currency";

type StatsCardsProps = {
  latestData: VillageBudget | null;
  totalBudget: number;
  totalRealization: number;
  realizationPercentage: number;
};

export function StatsCards(props: StatsCardsProps) {
  const { latestData, totalBudget, totalRealization, realizationPercentage } = props;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-l-4 border-l-green-500">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Pendapatan</p>
              <p className="text-2xl font-semibold">
                {formatShortCurrency(latestData?.revenue || 0)}
              </p>
              <p className="text-xs text-muted-foreground">
                Tahun {latestData?.year}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Anggaran</p>
              <p className="text-2xl font-semibold">{formatShortCurrency(totalBudget)}</p>
              <p className="text-xs text-muted-foreground">Dianggarkan</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-orange-500">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <PieChart className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Realisasi</p>
              <p className="text-2xl font-semibold">{formatShortCurrency(totalRealization)}</p>
              <p className="text-xs text-green-600">
                {realizationPercentage.toFixed(1)}% dari anggaran
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-purple-500">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sisa Anggaran</p>
              <p className="text-2xl font-semibold">
                {formatShortCurrency(latestData?.remaining_budget || 0)}
              </p>
              <p className="text-xs text-muted-foreground">Tersisa</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

