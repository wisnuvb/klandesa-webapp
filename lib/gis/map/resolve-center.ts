import { geoJsonToLatLngPoints } from "@/lib/gis/boundary";
import type { VillageBoundaryPolygon } from "@/lib/gis/boundary";
import type { LatLng, MapMarker } from "./types";

const FALLBACK_CENTER: LatLng = { lat: -6.2, lng: 106.816666 };

export function resolveMapCenter(
  center: LatLng | null,
  markers: MapMarker[],
  boundary: VillageBoundaryPolygon | null,
): LatLng {
  if (center) return center;
  const boundaryPoints = geoJsonToLatLngPoints(boundary);
  if (boundaryPoints[0]) return boundaryPoints[0];
  if (markers[0]) return { lat: markers[0].lat, lng: markers[0].lng };
  return FALLBACK_CENTER;
}
