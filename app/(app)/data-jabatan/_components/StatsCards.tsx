import { Card, CardContent } from "@/components/ui/card";
import { Award, TrendingUp, Users } from "lucide-react";

type StatsCardsProps = {
  isLoading: boolean;
  totalJabatan: number;
  filledPositions: number;
  totalStaff: number;
};

export function StatsCards(props: StatsCardsProps) {
  const { isLoading, totalJabatan, filledPositions, totalStaff } = props;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Jabatan</p>
              <p className="text-2xl font-semibold">
                {isLoading ? "Memuat..." : totalJabatan}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Jabatan Terisi</p>
              <p className="text-2xl font-semibold">{filledPositions}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Pegawai</p>
              <p className="text-2xl font-semibold">{totalStaff}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

