import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Droplets, Heart, TreePine, Wheat } from "lucide-react";
import type { VillagePotential } from "../_lib/types";

type DetailedStatsProps = {
  isLoading: boolean;
  latestData: VillagePotential | undefined;
};

function formatPct(part: number, total: number) {
  if (!total) return "-";
  return `${((part / total) * 100).toFixed(1)}% dari total wilayah`;
}

export function DetailedStats(props: DetailedStatsProps) {
  const { isLoading, latestData } = props;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wheat className="h-4 w-4 text-green-600" />
            Lahan Pertanian
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            {isLoading ? "..." : latestData ? `${latestData.agricultureLand} Ha` : "-"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {latestData ? formatPct(latestData.agricultureLand, latestData.area) : "-"}
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TreePine className="h-4 w-4 text-emerald-600" />
            Lahan Perkebunan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            {isLoading ? "..." : latestData ? `${latestData.plantationLand} Ha` : "-"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {latestData ? formatPct(latestData.plantationLand, latestData.area) : "-"}
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-teal-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TreePine className="h-4 w-4 text-teal-600" />
            Hutan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            {isLoading ? "..." : latestData ? `${latestData.forestArea} Ha` : "-"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {latestData ? formatPct(latestData.forestArea, latestData.area) : "-"}
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            Fasilitas Pendidikan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            {isLoading ? "..." : latestData?.educationFacilities || "-"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Sekolah/Lembaga Pendidikan</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-600" />
            Fasilitas Kesehatan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            {isLoading ? "..." : latestData?.healthFacilities || "-"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Puskesmas/Posyandu/Klinik</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-cyan-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Droplets className="h-4 w-4 text-cyan-600" />
            Sumber Air
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium line-clamp-2">
            {isLoading ? "..." : latestData?.waterResources || "-"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Sumber daya air</p>
        </CardContent>
      </Card>
    </div>
  );
}

