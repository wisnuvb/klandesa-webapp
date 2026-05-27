import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import {
  BOUNDARY_PAINT,
  MAP_LAYER_IDS,
  MAP_SOURCE_IDS,
  MARKER_COLORS,
  PICK_MARKER_PAINT,
} from "./constants";
import {
  boundaryToFeatureCollection,
  markersToFeatureCollection,
  pickMarkerToFeatureCollection,
} from "./geojson";
import type { MapMarker } from "./types";

export function ensureVillageMapLayers(map: MapLibreMap) {
  if (!map.getSource(MAP_SOURCE_IDS.markers)) {
    map.addSource(MAP_SOURCE_IDS.markers, {
      type: "geojson",
      data: markersToFeatureCollection([]),
    });
    map.addLayer({
      id: MAP_LAYER_IDS.markers,
      type: "circle",
      source: MAP_SOURCE_IDS.markers,
      paint: {
        "circle-radius": 10,
        "circle-color": [
          "match",
          ["get", "type"],
          "asset",
          MARKER_COLORS.asset,
          "project",
          MARKER_COLORS.project,
          "disaster",
          MARKER_COLORS.disaster,
          MARKER_COLORS.asset,
        ],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-opacity": 0.95,
      },
    });
  }

  if (!map.getSource(MAP_SOURCE_IDS.boundary)) {
    map.addSource(MAP_SOURCE_IDS.boundary, {
      type: "geojson",
      data: boundaryToFeatureCollection(null),
    });
    map.addLayer({
      id: MAP_LAYER_IDS.boundaryFill,
      type: "fill",
      source: MAP_SOURCE_IDS.boundary,
      paint: {
        "fill-color": BOUNDARY_PAINT.fill,
        "fill-opacity": BOUNDARY_PAINT.fillOpacity,
      },
    });
    map.addLayer({
      id: MAP_LAYER_IDS.boundaryLine,
      type: "line",
      source: MAP_SOURCE_IDS.boundary,
      paint: {
        "line-color": BOUNDARY_PAINT.line,
        "line-width": BOUNDARY_PAINT.lineWidth,
      },
    });
  }

  if (!map.getSource(MAP_SOURCE_IDS.pick)) {
    map.addSource(MAP_SOURCE_IDS.pick, {
      type: "geojson",
      data: pickMarkerToFeatureCollection(null),
    });
    map.addLayer({
      id: MAP_LAYER_IDS.pick,
      type: "circle",
      source: MAP_SOURCE_IDS.pick,
      paint: {
        "circle-radius": PICK_MARKER_PAINT.radius,
        "circle-color": PICK_MARKER_PAINT.color,
        "circle-stroke-color": PICK_MARKER_PAINT.stroke,
        "circle-stroke-width": PICK_MARKER_PAINT.strokeWidth,
        "circle-opacity": 0.95,
      },
    });
  }
}

export function setMarkersSource(map: MapLibreMap, markers: MapMarker[]) {
  const source = map.getSource(MAP_SOURCE_IDS.markers) as GeoJSONSource | undefined;
  source?.setData(markersToFeatureCollection(markers));
}

export function setBoundarySource(
  map: MapLibreMap,
  boundary: Parameters<typeof boundaryToFeatureCollection>[0],
) {
  const source = map.getSource(MAP_SOURCE_IDS.boundary) as GeoJSONSource | undefined;
  source?.setData(boundaryToFeatureCollection(boundary));
}

export function setPickSource(
  map: MapLibreMap,
  pick: { lat: number; lng: number } | null,
) {
  const source = map.getSource(MAP_SOURCE_IDS.pick) as GeoJSONSource | undefined;
  source?.setData(pickMarkerToFeatureCollection(pick));
}

export function setBoundaryLayersVisible(map: MapLibreMap, visible: boolean) {
  const visibility = visible ? "visible" : "none";
  for (const layerId of [MAP_LAYER_IDS.boundaryFill, MAP_LAYER_IDS.boundaryLine]) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  }
}
