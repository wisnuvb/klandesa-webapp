"use client";

import { useEffect, useRef } from "react";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  type: "asset" | "project" | "disaster";
};

type VillageMapProps = {
  center: { lat: number; lng: number } | null;
  markers: MapMarker[];
  className?: string;
};

export function VillageMap({ center, markers, className }: VillageMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;

    (async () => {
      const L = (await import("leaflet")).default;

      if (!containerRef.current) return;

      const defaultCenter =
        center ??
        (markers[0]
          ? { lat: markers[0].lat, lng: markers[0].lng }
          : { lat: -6.2, lng: 106.816666 });

      map = L.map(containerRef.current).setView(
        [defaultCenter.lat, defaultCenter.lng],
        markers.length > 0 ? 14 : 12,
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      const iconColors: Record<MapMarker["type"], string> = {
        asset: "#2563eb",
        project: "#16a34a",
        disaster: "#dc2626",
      };

      for (const m of markers) {
        const circle = L.circleMarker([m.lat, m.lng], {
          radius: 8,
          color: iconColors[m.type],
          fillColor: iconColors[m.type],
          fillOpacity: 0.85,
        });
        circle.bindPopup(`<strong>${m.label}</strong><br/><small>${m.type}</small>`);
        circle.addTo(map);
      }

      if (markers.length > 1) {
        const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
      }
    })();

    return () => {
      map?.remove();
    };
  }, [center, markers]);

  return (
    <div
      ref={containerRef}
      className={className ?? "h-[420px] w-full rounded-lg border bg-muted/30"}
    />
  );
}
