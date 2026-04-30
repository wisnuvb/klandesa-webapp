import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import type { VillageBudget } from "../_lib/types";
import { formatCurrency } from "../_lib/currency";

type RevenueBreakdownCardProps = {
  latestData: VillageBudget | null;
};

export function RevenueBreakdownCard(props: RevenueBreakdownCardProps) {
  const { latestData } = props;

  const revenue = latestData?.revenue || 0;
  const percent = (value: number) => (revenue > 0 ? ((value / revenue) * 100).toFixed(1) : "0");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Rincian Pendapatan Tahun {latestData?.year}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Dana Pemerintah Pusat</p>
            <p className="text-xl font-semibold">
              {formatCurrency(latestData?.government_fund || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {percent(latestData?.government_fund || 0)}% dari total
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Dana Provinsi</p>
            <p className="text-xl font-semibold">
              {formatCurrency(latestData?.province_fund || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {percent(latestData?.province_fund || 0)}% dari total
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Dana Kabupaten</p>
            <p className="text-xl font-semibold">
              {formatCurrency(latestData?.district_fund || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {percent(latestData?.district_fund || 0)}% dari total
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Pendapatan Asli Desa</p>
            <p className="text-xl font-semibold">
              {formatCurrency(latestData?.local_income || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {percent(latestData?.local_income || 0)}% dari total
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Kontribusi Masyarakat</p>
            <p className="text-xl font-semibold">
              {formatCurrency(latestData?.community_contribution || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {percent(latestData?.community_contribution || 0)}% dari total
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Kontribusi Swasta</p>
            <p className="text-xl font-semibold">
              {formatCurrency(latestData?.private_sector_contribution || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {percent(latestData?.private_sector_contribution || 0)}% dari total
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

