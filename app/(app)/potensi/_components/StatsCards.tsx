import { Card, CardContent } from "@/components/ui/card";
import { Home, MapPin, MapPinned, Users } from "lucide-react";
import type { VillagePotential } from "../_lib/types";

type StatsCardsProps = {
  isLoading: boolean;
  latestData: VillagePotential | undefined;
};

export function StatsCards(props: StatsCardsProps) {
  const { isLoading, latestData } = props;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Populasi</p>
              <p className="text-2xl font-semibold">
                {isLoading ? "..." : latestData?.population.toLocaleString() || "-"}
              </p>
              <p className="text-xs text-muted-foreground">Tahun {latestData?.year || "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Home className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Kepala Keluarga</p>
              <p className="text-2xl font-semibold">
                {isLoading ? "..." : latestData?.households.toLocaleString() || "-"}
              </p>
              <p className="text-xs text-muted-foreground">KK</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Luas Wilayah</p>
              <p className="text-2xl font-semibold">
                {isLoading ? "..." : latestData?.area.toLocaleString() || "-"}
              </p>
              <p className="text-xs text-muted-foreground">Hektar</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <MapPinned className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Objek Wisata</p>
              <p className="text-2xl font-semibold">
                {isLoading ? "..." : latestData?.tourismSpots || "-"}
              </p>
              <p className="text-xs text-muted-foreground">Lokasi</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

