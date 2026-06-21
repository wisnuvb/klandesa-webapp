import {
  MARKER_COLORS,
  MARKER_TYPE_LABELS,
} from "@/lib/gis/map/constants";

export type RegionalGisPoint = {
  id: string;
  type: "asset" | "project" | "disaster";
  name: string;
  villageName: string;
  district: string;
  lat: number;
  lng: number;
  status?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const TYPE_ICONS: Record<RegionalGisPoint["type"], string> = {
  asset: "🏛️",
  project: "🏗️",
  disaster: "⚠️",
};

export function regionalPointsToFeatureCollection(
  points: RegionalGisPoint[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: points.map((p) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
      properties: {
        id: p.id,
        name: p.name,
        type: p.type,
        villageName: p.villageName,
        district: p.district,
        status: p.status ?? "",
      },
    })),
  };
}

export function buildRegionalGisPopupHtml(props: {
  name: string;
  type: RegionalGisPoint["type"];
  villageName: string;
  district: string;
  status?: string;
}): string {
  const color = MARKER_COLORS[props.type];
  const typeLabel = MARKER_TYPE_LABELS[props.type];
  const icon = TYPE_ICONS[props.type];
  const statusRow = props.status
    ? `<div class="regional-map-popup-row">
        <span class="regional-map-popup-label">Status</span>
        <span class="regional-map-popup-value">${escapeHtml(props.status)}</span>
      </div>`
    : "";

  return `<article class="regional-map-popup-card" style="--accent:${color}">
    <header class="regional-map-popup-header">
      <span class="regional-map-popup-icon" aria-hidden="true">${icon}</span>
      <span class="regional-map-popup-badge" style="background:${color}">${escapeHtml(typeLabel)}</span>
    </header>
    <h3 class="regional-map-popup-title">${escapeHtml(props.name)}</h3>
    <div class="regional-map-popup-meta">
      <div class="regional-map-popup-row">
        <span class="regional-map-popup-label">Desa</span>
        <span class="regional-map-popup-value">${escapeHtml(props.villageName)}</span>
      </div>
      <div class="regional-map-popup-row">
        <span class="regional-map-popup-label">Kecamatan</span>
        <span class="regional-map-popup-value">${escapeHtml(props.district)}</span>
      </div>
      ${statusRow}
    </div>
  </article>`;
}
