"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
// Impor langsung dari constants/types, BUKAN barrel "@/lib/gis/map": barrel itu mengekspor ulang
// create-map (maplibre-gl) & draw-control (mapbox-gl-draw) sehingga menyeret pustaka peta ke bundel awal.
import {
  MAP_DEFAULT_HEIGHT,
  MAP_DEFAULT_MIN_HEIGHT_PX,
} from "@/lib/gis/map/constants";
import type { VillageMapProps } from "@/lib/gis/map/types";

const VillageMapInner = dynamic(
  () => import("./map/VillageMap").then((m) => m.VillageMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="village-map-shell flex items-center justify-center border"
        style={{
          height: MAP_DEFAULT_HEIGHT,
          minHeight: MAP_DEFAULT_MIN_HEIGHT_PX,
        }}
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

export function VillageMap(props: VillageMapProps) {
  return <VillageMapInner {...props} />;
}
