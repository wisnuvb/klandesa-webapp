"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { MapMarker } from "./VillageMap";

const VillageMapInner = dynamic(
  () => import("./VillageMap").then((m) => m.VillageMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-lg border bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

export function VillageMap(props: {
  center: { lat: number; lng: number } | null;
  markers: MapMarker[];
  className?: string;
}) {
  return <VillageMapInner {...props} />;
}
