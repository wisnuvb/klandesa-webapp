import type { VillageBoundaryPolygon } from "@/lib/gis/boundary";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  type: "asset" | "project" | "disaster";
};

export type VillageMapMode = "view" | "pick" | "drawBoundary" | "editBoundary";

export type VillageMapProps = {
  center: { lat: number; lng: number } | null;
  markers: MapMarker[];
  boundary?: VillageBoundaryPolygon | null;
  mode?: VillageMapMode;
  pickMarker?: { lat: number; lng: number } | null;
  onPick?: (lat: number, lng: number) => void;
  onBoundaryDraft?: (boundary: VillageBoundaryPolygon | null) => void;
  onBoundaryClick?: () => void;
  className?: string;
  height?: string;
  minHeightPx?: number;
};

export type LatLng = { lat: number; lng: number };
