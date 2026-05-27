import maplibregl from "maplibre-gl";
import { geoJsonToLatLngPoints } from "@/lib/gis/boundary";
import type { VillageBoundaryPolygon } from "@/lib/gis/boundary";
import { resolveMapCenter } from "./resolve-center";
import type { LatLng, MapMarker } from "./types";

export function collectMapPoints(
  markers: MapMarker[],
  boundary: VillageBoundaryPolygon | null,
): [number, number][] {
  const points: [number, number][] = markers.map(
    (m) => [m.lng, m.lat] as [number, number],
  );
  for (const p of geoJsonToLatLngPoints(boundary)) {
    points.push([p.lng, p.lat]);
  }
  return points;
}

export function fitMapToPoints(
  map: maplibregl.Map,
  points: [number, number][],
  options?: { padding?: number; maxZoom?: number },
) {
  const padding = options?.padding ?? 48;
  const maxZoom = options?.maxZoom ?? 16;

  if (points.length > 1) {
    const bounds = points.reduce(
      (b, coord) => b.extend(coord),
      new maplibregl.LngLatBounds(points[0], points[0]),
    );
    map.fitBounds(bounds, { padding, maxZoom, duration: 0 });
    return;
  }

  if (points.length === 1) {
    map.jumpTo({ center: points[0], zoom: 16 });
  }
}

export function fitMapToContext(
  map: maplibregl.Map,
  center: LatLng | null,
  markers: MapMarker[],
  boundary: VillageBoundaryPolygon | null,
) {
  const points = collectMapPoints(markers, boundary);
  if (points.length > 0) {
    fitMapToPoints(map, points);
    return;
  }
  const view = resolveMapCenter(center, markers, boundary);
  map.jumpTo({ center: [view.lng, view.lat], zoom: 13 });
}
