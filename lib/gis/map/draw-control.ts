import MapboxDraw from "@mapbox/mapbox-gl-draw";
import type { Map as MapLibreMap } from "maplibre-gl";
import { BOUNDARY_DRAW_PAINT } from "./constants";

/** Patch MapboxDraw agar kompatibel dengan MapLibre GL. */
export function patchDrawForMapLibre() {
  const classes = MapboxDraw.constants.classes as Record<string, string>;
  classes.CANVAS = "maplibregl-canvas";
  classes.CONTROL_BASE = "maplibregl-ctrl";
  classes.CONTROL_PREFIX = "maplibregl-ctrl-";
  classes.CONTROL_GROUP = "maplibregl-ctrl-group";
  classes.ATTRIBUTION = "maplibregl-ctrl-attrib";
}

export function createBoundaryDrawControl() {
  patchDrawForMapLibre();

  return new MapboxDraw({
    displayControlsDefault: false,
    controls: {
      polygon: false,
      trash: false,
      line_string: false,
      point: false,
      combine_features: false,
      uncombine_features: false,
    },
    defaultMode: "simple_select",
    styles: buildDrawStyles(),
  });
}

function buildDrawStyles(): object[] {
  const c = BOUNDARY_DRAW_PAINT;
  const vertex = {
    "circle-radius": 6,
    "circle-color": c.line,
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 2,
  };

  return [
    {
      id: "gl-draw-polygon-fill",
      type: "fill",
      filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
      paint: {
        "fill-color": c.fill,
        "fill-opacity": c.fillOpacity,
      },
    },
    {
      id: "gl-draw-polygon-stroke-active",
      type: "line",
      filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
      paint: {
        "line-color": c.line,
        "line-width": c.lineWidth,
      },
    },
    {
      id: "gl-draw-line-active",
      type: "line",
      filter: ["all", ["==", "$type", "LineString"], ["!=", "mode", "static"]],
      paint: {
        "line-color": c.line,
        "line-width": c.lineWidth,
        "line-dasharray": [2, 2],
      },
    },
    {
      id: "gl-draw-point-active",
      type: "circle",
      filter: ["all", ["==", "$type", "Point"], ["==", "meta", "vertex"]],
      paint: vertex,
    },
    {
      id: "gl-draw-point-midpoint",
      type: "circle",
      filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
      paint: {
        "circle-radius": 4,
        "circle-color": "#ffffff",
        "circle-stroke-color": c.line,
        "circle-stroke-width": 2,
      },
    },
  ];
}

export function startDrawPolygon(draw: MapboxDraw) {
  draw.deleteAll();
  draw.changeMode("draw_polygon");
}

export function startEditPolygon(draw: MapboxDraw, feature: GeoJSON.Feature) {
  draw.deleteAll();
  const ids = draw.add(feature);
  const featureId = Array.isArray(ids) ? ids[0] : ids;
  if (featureId) {
    draw.changeMode("direct_select", { featureId: String(featureId) });
  }
}

export function readDrawBoundary(draw: MapboxDraw) {
  const collection = draw.getAll();
  const feature = collection.features[0];
  return feature ?? null;
}

export function clearDraw(draw: MapboxDraw) {
  draw.deleteAll();
  draw.changeMode("simple_select");
}

export type BoundaryDrawControl = MapboxDraw;

export type { MapLibreMap };
