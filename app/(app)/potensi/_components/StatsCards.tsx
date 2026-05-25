import { Home, MapPin, MapPinned, Users } from "lucide-react";
import { MetricGrid, type MetricItem } from "@/components/app/patterns";
import type { VillagePotential } from "../_lib/types";

type StatsCardsProps = {
  isLoading: boolean;
  latestData: VillagePotential | undefined;
};

export function StatsCards(props: StatsCardsProps) {
  const { isLoading, latestData } = props;

  const items: MetricItem[] = [
    {
      title: "Populasi",
      value: latestData?.population.toLocaleString() || "-",
      subtitle: `Tahun ${latestData?.year || "-"}`,
      icon: Users,
      accent: "blue",
      loading: isLoading,
    },
    {
      title: "Kepala Keluarga",
      value: latestData?.households.toLocaleString() || "-",
      subtitle: "KK",
      icon: Home,
      accent: "green",
      loading: isLoading,
    },
    {
      title: "Luas Wilayah",
      value: latestData?.area.toLocaleString() || "-",
      subtitle: "Hektar",
      icon: MapPin,
      accent: "amber",
      loading: isLoading,
    },
    {
      title: "Objek Wisata",
      value: latestData?.tourismSpots || "-",
      subtitle: "Lokasi",
      icon: MapPinned,
      accent: "purple",
      loading: isLoading,
    },
  ];

  return <MetricGrid items={items} animate={false} />;
}
