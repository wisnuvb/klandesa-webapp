export const MAP_DEFAULT_HEIGHT = "calc(100vh - 280px)";
export const MAP_DEFAULT_MIN_HEIGHT_PX = 380;

export const MAP_LAYER_IDS = {
  markers: "village-markers-circle",
  boundaryFill: "village-boundary-fill",
  boundaryLine: "village-boundary-line",
  pick: "village-pick-marker",
} as const;

export const MAP_SOURCE_IDS = {
  markers: "village-markers",
  boundary: "village-boundary",
  pick: "village-pick",
} as const;

export const MARKER_COLORS: Record<"asset" | "project" | "disaster", string> = {
  asset: "#2563eb",
  project: "#16a34a",
  disaster: "#dc2626",
};

export const MARKER_TYPE_LABELS: Record<"asset" | "project" | "disaster", string> = {
  asset: "Aset",
  project: "Proyek",
  disaster: "Bencana",
};

export const BOUNDARY_PAINT = {
  fill: "#7c3aed",
  fillOpacity: 0.15,
  line: "#7c3aed",
  lineWidth: 3,
} as const;

export const BOUNDARY_DRAW_PAINT = {
  fill: "#7c3aed",
  fillOpacity: 0.2,
  line: "#7c3aed",
  lineWidth: 3,
} as const;

export const PICK_MARKER_PAINT = {
  color: "#14b8a6",
  radius: 11,
  stroke: "#ffffff",
  strokeWidth: 2,
} as const;

export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
