import { Card, CardContent } from "@/components/ui/card";
import { Award, Shield } from "lucide-react";
import { formatNumber } from "../_lib/formatting";

type StatsCardsProps = {
  isLoading: boolean;
  totalPerangkat: number;
  activePerangkat: number;
  positionCount: number;
};

export function StatsCards(props: StatsCardsProps) {
  const { isLoading, totalPerangkat, activePerangkat, positionCount } = props;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Perangkat</p>
              <p className="text-2xl font-semibold">
                {isLoading ? "Memuat..." : formatNumber(totalPerangkat)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Award className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Perangkat Aktif</p>
              <p className="text-2xl font-semibold">
                {isLoading ? "Memuat..." : formatNumber(activePerangkat)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Award className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Jabatan</p>
              <p className="text-2xl font-semibold">
                {isLoading ? "Memuat..." : formatNumber(positionCount)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

