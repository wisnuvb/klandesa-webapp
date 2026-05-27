"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type MapboxDraw from "@mapbox/mapbox-gl-draw";
import type { Map as MapLibreMap, Popup } from "maplibre-gl";
import {
  MAP_LAYER_IDS,
  MARKER_TYPE_LABELS,
  boundaryToDrawFeature,
  clearDraw,
  collectMapPoints,
  createBoundaryDrawControl,
  createVillageMap,
  drawFeatureToBoundary,
  fitMapToContext,
  fitMapToPoints,
  maplibregl,
  readDrawBoundary,
  resolveMapCenter,
  setBoundaryLayersVisible,
  setBoundarySource,
  setMarkersSource,
  setPickSource,
  startDrawPolygon,
  startEditPolygon,
  ensureVillageMapLayers,
  type VillageMapProps,
} from "@/lib/gis/map";
import { MapShell } from "./MapShell";

export function VillageMap({
  center,
  markers,
  boundary = null,
  mode = "view",
  pickMarker = null,
  onPick,
  onBoundaryDraft,
  onBoundaryClick,
  className,
  height,
  minHeightPx,
}: VillageMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const handlersRef = useRef({ onPick, onBoundaryDraft, onBoundaryClick });
  const [mapReady, setMapReady] = useState(false);

  handlersRef.current = { onPick, onBoundaryDraft, onBoundaryClick };

  const markersKey = useMemo(
    () =>
      markers
        .map((m) => `${m.id}:${m.lat}:${m.lng}:${m.type}:${m.label}`)
        .join("|"),
    [markers],
  );

  const boundaryKey = useMemo(() => JSON.stringify(boundary), [boundary]);

  const pickKey = useMemo(
    () =>
      pickMarker
        ? `${pickMarker.lat.toFixed(6)},${pickMarker.lng.toFixed(6)}`
        : "",
    [pickMarker],
  );

  // ── Init map once ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = createVillageMap({ container, center, markers, boundary });
    const draw = createBoundaryDrawControl();

    mapRef.current = map;
    drawRef.current = draw;
    map.addControl(draw as unknown as maplibregl.IControl, "top-left");

    map.on("load", () => {
      ensureVillageMapLayers(map);
      setMarkersSource(map, markers);
      setBoundarySource(map, boundary);
      setPickSource(map, pickMarker);
      fitMapToContext(map, center, markers, boundary);
      setMapReady(true);
    });

    const emitDraftFromDraw = () => {
      const draw = drawRef.current;
      if (!draw) return;
      const feature = readDrawBoundary(draw);
      handlersRef.current.onBoundaryDraft?.(
        feature ? drawFeatureToBoundary(feature) : null,
      );
    };

    map.on("draw.create", emitDraftFromDraw);
    map.on("draw.update", emitDraftFromDraw);
    map.on("draw.delete", () => {
      handlersRef.current.onBoundaryDraft?.(null);
    });

    map.on("click", MAP_LAYER_IDS.markers, (e) => {
      const feature = e.features?.[0];
      if (!feature?.properties) return;
      const label = String(feature.properties.label ?? "");
      const type = String(feature.properties.type ?? "");
      const typeLabel = MARKER_TYPE_LABELS[type as keyof typeof MARKER_TYPE_LABELS] ?? type;

      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({ closeButton: true, offset: 12 })
        .setLngLat(e.lngLat)
        .setHTML(`<strong>${escapeHtml(label)}</strong><br/><small>${escapeHtml(typeLabel)}</small>`)
        .addTo(map);
    });

    map.on("click", (e) => {
      if (map.getCanvas().dataset.mapMode !== "pick") return;
      handlersRef.current.onPick?.(e.lngLat.lat, e.lngLat.lng);
    });

    map.on("click", MAP_LAYER_IDS.boundaryFill, () => {
      if (map.getCanvas().dataset.mapMode !== "view") return;
      handlersRef.current.onBoundaryClick?.();
    });

    map.on("mouseenter", MAP_LAYER_IDS.markers, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", MAP_LAYER_IDS.markers, () => {
      if (map.getCanvas().dataset.mapMode === "pick" || map.getCanvas().dataset.mapMode === "drawBoundary") {
        map.getCanvas().style.cursor = "crosshair";
      } else {
        map.getCanvas().style.cursor = "";
      }
    });
    map.on("mouseenter", MAP_LAYER_IDS.boundaryFill, () => {
      if (map.getCanvas().dataset.mapMode === "view" && handlersRef.current.onBoundaryClick) {
        map.getCanvas().style.cursor = "pointer";
      }
    });
    map.on("mouseleave", MAP_LAYER_IDS.boundaryFill, () => {
      if (map.getCanvas().dataset.mapMode === "pick" || map.getCanvas().dataset.mapMode === "drawBoundary") {
        map.getCanvas().style.cursor = "crosshair";
      } else {
        map.getCanvas().style.cursor = "";
      }
    });

    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container);

    return () => {
      observer.disconnect();
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Mode cursor ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().dataset.mapMode = mode;
    map.getCanvas().style.cursor =
      mode === "pick" || mode === "drawBoundary" ? "crosshair" : "";
  }, [mode]);

  // ── Draw / edit mode ──
  useEffect(() => {
    const map = mapRef.current;
    const draw = drawRef.current;
    if (!mapReady || !map || !draw) return;

    clearDraw(draw);
    setBoundaryLayersVisible(map, mode !== "drawBoundary" && mode !== "editBoundary");

    if (mode === "drawBoundary") {
      setBoundarySource(map, null);
      startDrawPolygon(draw);
      const view = resolveMapCenter(center, markers, boundary);
      map.jumpTo({ center: [view.lng, view.lat], zoom: 15 });
      return;
    }

    if (mode === "editBoundary" && boundary) {
      setBoundarySource(map, null);
      startEditPolygon(draw, boundaryToDrawFeature(boundary));
      const points = collectMapPoints([], boundary);
      if (points.length > 0) {
        fitMapToPoints(map, points, { padding: 60, maxZoom: 17 });
      }
      return;
    }

    clearDraw(draw);
  }, [mapReady, mode, boundaryKey, center?.lat, center?.lng, markersKey]);

  // ── Sync markers, boundary, pick ──
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    setMarkersSource(map, markers);

    if (mode !== "drawBoundary" && mode !== "editBoundary") {
      setBoundarySource(map, boundary);
    }

    setPickSource(map, pickMarker);
  }, [mapReady, markersKey, boundaryKey, pickKey, mode, markers, boundary, pickMarker]);

  // ── Fit bounds (view / pick) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    if (mode === "drawBoundary" || mode === "editBoundary") return;
    fitMapToContext(map, center, markers, boundary);
  }, [mapReady, mode, boundaryKey, center?.lat, center?.lng, markersKey]);

  return (
    <MapShell
      mapContainerRef={containerRef}
      className={className}
      height={height}
      minHeightPx={minHeightPx}
    />
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
