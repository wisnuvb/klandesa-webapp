import maplibregl from "maplibre-gl";
import { resolveMapCenter } from "./resolve-center";
import { createOsmRasterStyle } from "./style";
import type { LatLng, MapMarker } from "./types";
import type { VillageBoundaryPolygon } from "@/lib/gis/boundary";

export type CreateVillageMapOptions = {
  container: HTMLElement;
  center: LatLng | null;
  markers: MapMarker[];
  boundary: VillageBoundaryPolygon | null;
};

export function createVillageMap({
  container,
  center,
  markers,
  boundary,
}: CreateVillageMapOptions) {
  const view = resolveMapCenter(center, markers, boundary);

  const map = new maplibregl.Map({
    container,
    style: createOsmRasterStyle(),
    center: [view.lng, view.lat],
    zoom: 13,
    attributionControl: false,
  });

  map.addControl(new maplibregl.AttributionControl({ compact: true }));

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

  return map;
}

export { maplibregl };
