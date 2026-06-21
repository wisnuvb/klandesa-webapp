"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { RegionalGisPoint } from "@/lib/gis/map/regional-popup";

export type { RegionalGisPoint } from "@/lib/gis/map/regional-popup";

const RegionalGisMapInner = dynamic(
  () =>
    import("@/components/regional/RegionalGisMapInner").then(
      (m) => m.RegionalGisMapInner,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center rounded-lg border bg-muted/20"
        style={{ height: 480, minHeight: 320 }}
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

type Props = {
  points: RegionalGisPoint[];
};

function resolveCenter(points: RegionalGisPoint[]): { lat: number; lng: number } | null {
  if (points.length === 0) return null;
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 },
  );
  return {
    lat: sum.lat / points.length,
    lng: sum.lng / points.length,
  };
}

export function RegionalGisMap({ points }: Props) {
  const center = useMemo(() => resolveCenter(points), [points]);

  if (points.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-12 text-center">
        Belum ada titik GIS dengan koordinat di desa wilayah ini.
      </p>
    );
  }

  return (
    <RegionalGisMapInner
      points={points}
      center={center}
      height="480px"
      minHeightPx={320}
      className="rounded-lg overflow-hidden"
    />
  );
}
