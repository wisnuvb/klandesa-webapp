"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import { MapShell } from "@/components/app/gis/map/MapShell";
import { cn } from "@/components/ui/utils";
import { MAP_LAYER_IDS, MAP_SOURCE_IDS } from "@/lib/gis/map/constants";
import { createVillageMap, fitMapToPoints, maplibregl } from "@/lib/gis/map";
import { ensureVillageMapLayers } from "@/lib/gis/map/layers";
import { regionalPointsToFeatureCollection } from "@/lib/gis/map/regional-popup";
import type { RegionalGisPoint } from "@/lib/gis/map/regional-popup";
import {
  RegionalMapPointPopup,
  resolveRegionalPointFromFeature,
} from "@/components/regional/RegionalMapPointPopup";

type Props = {
  points: RegionalGisPoint[];
  center: { lat: number; lng: number } | null;
  className?: string;
  height?: string;
  minHeightPx?: number;
};

type PopupState = {
  point: RegionalGisPoint;
  lngLat: [number, number];
};

function setRegionalMarkers(map: MapLibreMap, points: RegionalGisPoint[]) {
  const source = map.getSource(MAP_SOURCE_IDS.markers);
  if (source && "setData" in source) {
    source.setData(regionalPointsToFeatureCollection(points));
  }
}

function popupStyleFromLngLat(
  map: MapLibreMap,
  lngLat: [number, number],
): React.CSSProperties {
  const { x, y } = map.project(lngLat);
  return {
    left: x,
    top: y,
    transform: "translate(-50%, calc(-100% - 14px))",
  };
}

export function RegionalGisMapInner({
  points,
  center,
  className,
  height = "480px",
  minHeightPx = 320,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const pointsRef = useRef(points);
  const popupRef = useRef<PopupState | null>(null);
  const interactionsBoundRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties | null>(
    null,
  );

  pointsRef.current = points;

  const pointsKey = useMemo(
    () =>
      points
        .map(
          (p) =>
            `${p.id}:${p.lat}:${p.lng}:${p.type}:${p.name}:${p.villageName}`,
        )
        .join("|"),
    [points],
  );

  const syncPopupPosition = useCallback((map: MapLibreMap) => {
    const current = popupRef.current;
    if (!current) {
      setPopupStyle(null);
      return;
    }
    setPopupStyle(popupStyleFromLngLat(map, current.lngLat));
  }, []);

  const openPopup = useCallback(
    (map: MapLibreMap, point: RegionalGisPoint, lngLat: [number, number]) => {
      const next: PopupState = { point, lngLat };
      popupRef.current = next;
      setPopup(next);
      setPopupStyle(popupStyleFromLngLat(map, lngLat));
    },
    [],
  );

  const closePopup = useCallback(() => {
    popupRef.current = null;
    setPopup(null);
    setPopupStyle(null);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = createVillageMap({
      container,
      center,
      markers: points.map((p) => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        type: p.type,
        label: p.name,
      })),
      boundary: null,
    });

    mapRef.current = map;

    const handleMapClick = (e: MapMouseEvent) => {
      const pad = 12;
      const box: [maplibregl.PointLike, maplibregl.PointLike] = [
        [e.point.x - pad, e.point.y - pad],
        [e.point.x + pad, e.point.y + pad],
      ];
      const features = map.queryRenderedFeatures(box, {
        layers: [MAP_LAYER_IDS.markers],
      });

      if (features.length === 0) {
        closePopup();
        return;
      }

      const point = resolveRegionalPointFromFeature(
        features[0].properties,
        pointsRef.current,
      );
      if (!point) return;

      openPopup(map, point, [e.lngLat.lng, e.lngLat.lat]);
    };

    const handleMove = () => {
      syncPopupPosition(map);
    };

    const bindInteractions = () => {
      if (interactionsBoundRef.current) return;
      map.on("click", handleMapClick);
      map.on("move", handleMove);
      map.on("zoom", handleMove);
      map.on("mouseenter", MAP_LAYER_IDS.markers, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", MAP_LAYER_IDS.markers, () => {
        map.getCanvas().style.cursor = "";
      });
      interactionsBoundRef.current = true;
    };

    const initLayers = () => {
      ensureVillageMapLayers(map);
      setRegionalMarkers(map, pointsRef.current);
      bindInteractions();
      const coords = pointsRef.current.map(
        (p) => [p.lng, p.lat] as [number, number],
      );
      if (coords.length > 0) {
        fitMapToPoints(map, coords, { padding: 56, maxZoom: 15 });
      }
      setMapReady(true);
    };

    if (map.loaded()) {
      initLayers();
    } else {
      map.once("load", initLayers);
    }

    const observer = new ResizeObserver(() => {
      map.resize();
      syncPopupPosition(map);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      interactionsBoundRef.current = false;
      popupRef.current = null;
      setMapReady(false);
      setPopup(null);
      setPopupStyle(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    setRegionalMarkers(map, points);
    const coords = points.map((p) => [p.lng, p.lat] as [number, number]);
    if (coords.length > 0) {
      fitMapToPoints(map, coords, { padding: 56, maxZoom: 15 });
    }
  }, [mapReady, pointsKey, points]);

  return (
    <MapShell
      mapContainerRef={containerRef}
      className={cn("regional-map-shell", className)}
      height={height}
      minHeightPx={minHeightPx}
    >
      {popup && popupStyle ? (
        <RegionalMapPointPopup
          point={popup.point}
          style={popupStyle}
          onClose={closePopup}
        />
      ) : null}
    </MapShell>
  );
}
