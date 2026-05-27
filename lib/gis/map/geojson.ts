import type { VillageBoundaryPolygon } from "@/lib/gis/boundary";
import { latLngRingToGeoJson } from "@/lib/gis/boundary";
import type { MapMarker } from "./types";

export function markersToFeatureCollection(
  markers: MapMarker[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: markers.map((m) => ({
      type: "Feature",
      id: m.id,
      geometry: { type: "Point", coordinates: [m.lng, m.lat] },
      properties: {
        id: m.id,
        label: m.label,
        type: m.type,
      },
    })),
  };
}

export function boundaryToFeatureCollection(
  boundary: VillageBoundaryPolygon | null,
): GeoJSON.FeatureCollection {
  if (!boundary) {
    return { type: "FeatureCollection", features: [] };
  }
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: "village-boundary",
        geometry: boundary,
        properties: { kind: "boundary" },
      },
    ],
  };
}

export function pickMarkerToFeatureCollection(
  pick: { lat: number; lng: number } | null,
): GeoJSON.FeatureCollection {
  if (!pick) {
    return { type: "FeatureCollection", features: [] };
  }
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: "pick-marker",
        geometry: { type: "Point", coordinates: [pick.lng, pick.lat] },
        properties: {},
      },
    ],
  };
}

export function drawFeatureToBoundary(
  feature: GeoJSON.Feature,
): VillageBoundaryPolygon | null {
  if (feature.geometry.type !== "Polygon") return null;
  const ring = feature.geometry.coordinates[0];
  if (!ring?.length) return null;
  const openRing =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
  const points = openRing.map(([lng, lat]) => ({ lat, lng }));
  return latLngRingToGeoJson(points);
}

export function boundaryToDrawFeature(
  boundary: VillageBoundaryPolygon,
): GeoJSON.Feature {
  return {
    type: "Feature",
    id: "village-boundary-edit",
    geometry: boundary,
    properties: {},
  };
}
