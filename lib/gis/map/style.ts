import type { StyleSpecification } from "maplibre-gl";
import { OSM_ATTRIBUTION } from "./constants";

/** Gratis — raster tiles OpenStreetMap. */
export function createOsmRasterStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: OSM_ATTRIBUTION,
        maxzoom: 19,
      },
    },
    layers: [
      {
        id: "osm-raster",
        type: "raster",
        source: "osm",
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  };
}
