import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Building,
  GraduationCap,
  HandHeart,
  Heart,
  PieChart,
  Users,
  Wheat,
} from "lucide-react";
import type { VillageBudget } from "../_lib/types";
import { formatCurrency } from "../_lib/currency";
import { getPercentage } from "../_lib/calculations";

type SectorProgressCardProps = {
  latestData: VillageBudget | null;
};

export function SectorProgressCard(props: SectorProgressCardProps) {
  const { latestData } = props;

  const rows = [
    {
      key: "employee",
      label: "Belanja Pegawai",
      icon: Users,
      colorClass: "text-blue-600",
      budget: latestData?.employee_budget || 0,
      realization: latestData?.employee_realization || 0,
    },
    {
      key: "infrastructure",
      label: "Infrastruktur & Pembangunan",
      icon: Building,
      colorClass: "text-amber-600",
      budget: latestData?.infrastructure_budget || 0,
      realization: latestData?.infrastructure_realization || 0,
    },
    {
      key: "health",
      label: "Kesehatan",
      icon: Heart,
      colorClass: "text-red-600",
      budget: latestData?.health_budget || 0,
      realization: latestData?.health_realization || 0,
    },
    {
      key: "education",
      label: "Pendidikan",
      icon: GraduationCap,
      colorClass: "text-purple-600",
      budget: latestData?.education_budget || 0,
      realization: latestData?.education_realization || 0,
    },
    {
      key: "agriculture",
      label: "Pertanian & Ekonomi",
      icon: Wheat,
      colorClass: "text-green-600",
      budget: latestData?.agriculture_budget || 0,
      realization: latestData?.agriculture_realization || 0,
    },
    {
      key: "social",
      label: "Sosial & Kemasyarakatan",
      icon: HandHeart,
      colorClass: "text-pink-600",
      budget: latestData?.social_budget || 0,
      realization: latestData?.social_realization || 0,
    },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-blue-600" />
          Anggaran vs Realisasi Per Sektor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {rows.map((row) => {
            const Icon = row.icon;
            const percentage = getPercentage(row.realization, row.budget);
            return (
              <div key={row.key}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${row.colorClass}`} />
                    <span className="font-medium">{row.label}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(row.realization)} / {formatCurrency(row.budget)}
                  </div>
                </div>
                <Progress value={percentage} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {percentage.toFixed(1)}% terealisasi
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

