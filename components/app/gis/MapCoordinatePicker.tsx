"use client";

import { VillageMap } from "./VillageMapClient";
import type { MapMarker, VillageMapProps } from "@/lib/gis/map";
import type { VillageBoundaryPolygon } from "@/lib/gis/boundary";

type MapCoordinatePickerProps = {
  center: VillageMapProps["center"];
  markers?: MapMarker[];
  boundary?: VillageBoundaryPolygon | null;
  lat: string;
  lng: string;
  onChange: (lat: string, lng: string) => void;
};

export function MapCoordinatePicker({
  center,
  markers = [],
  boundary = null,
  lat,
  lng,
  onChange,
}: MapCoordinatePickerProps) {
  const pickMarker =
    lat && lng && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))
      ? { lat: Number(lat), lng: Number(lng) }
      : null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Klik pada peta untuk mengisi koordinat secara otomatis.
      </p>
      <VillageMap
        center={center}
        markers={markers}
        boundary={boundary}
        mode="pick"
        pickMarker={pickMarker}
        height="240px"
        minHeightPx={240}
        onPick={(pickLat, pickLng) => {
          onChange(pickLat.toFixed(6), pickLng.toFixed(6));
        }}
      />
    </div>
  );
}
