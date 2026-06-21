"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MARKER_COLORS,
  MARKER_TYPE_LABELS,
} from "@/lib/gis/map/constants";
import type { RegionalGisPoint } from "@/lib/gis/map/regional-popup";
import { cn } from "@/components/ui/utils";

const TYPE_ICONS: Record<RegionalGisPoint["type"], string> = {
  asset: "🏛️",
  project: "🏗️",
  disaster: "⚠️",
};

type Props = {
  point: RegionalGisPoint;
  style: React.CSSProperties;
  onClose: () => void;
};

export function RegionalMapPointPopup({ point, style, onClose }: Props) {
  const color = MARKER_COLORS[point.type];
  const typeLabel = MARKER_TYPE_LABELS[point.type];

  return (
    <div
      className="absolute z-50 w-[min(280px,calc(100%-16px))] pointer-events-auto"
      style={style}
      role="dialog"
      aria-label={`Detail ${point.name}`}
    >
      <div
        className={cn(
          "rounded-xl border bg-card text-card-foreground shadow-lg",
          "border-l-4 animate-in fade-in-0 zoom-in-95 duration-150",
        )}
        style={{ borderLeftColor: color }}
      >
        <div className="flex items-start justify-between gap-2 p-3 pb-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg leading-none" aria-hidden>
              {TYPE_ICONS[point.type]}
            </span>
            <Badge
              className="shrink-0 text-[10px] uppercase tracking-wide text-white border-0"
              style={{ backgroundColor: color }}
            >
              {typeLabel}
            </Badge>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 -mr-1 -mt-1"
            onClick={onClose}
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-3 pt-2 pb-3">
          <h3 className="font-semibold text-sm leading-snug">{point.name}</h3>
          <dl className="mt-2 space-y-1.5 text-xs">
            <div className="grid grid-cols-[72px_1fr] gap-2">
              <dt className="text-muted-foreground">Desa</dt>
              <dd className="font-medium">{point.villageName}</dd>
            </div>
            <div className="grid grid-cols-[72px_1fr] gap-2">
              <dt className="text-muted-foreground">Kecamatan</dt>
              <dd className="font-medium">{point.district}</dd>
            </div>
            {point.status ? (
              <div className="grid grid-cols-[72px_1fr] gap-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium">{point.status}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
      <div
        className="mx-auto h-2.5 w-2.5 rotate-45 border-r border-b bg-card shadow-sm -mt-1.5 relative z-[-1]"
        aria-hidden
      />
    </div>
  );
}

export function resolveRegionalPointFromFeature(
  properties: GeoJSON.GeoJsonProperties,
  points: RegionalGisPoint[],
): RegionalGisPoint | null {
  if (!properties) return null;
  const id = String(properties.id ?? "");
  const fromList = points.find((p) => p.id === id);
  if (fromList) return fromList;

  const typeRaw = String(properties.type ?? "asset");
  const type: RegionalGisPoint["type"] =
    typeRaw === "project" || typeRaw === "disaster" ? typeRaw : "asset";

  const name = String(properties.name ?? properties.label ?? "").trim();
  if (!name) return null;

  return {
    id: id || `${type}-${name}`,
    type,
    name,
    villageName: String(properties.villageName ?? "—"),
    district: String(properties.district ?? "—"),
    lat: 0,
    lng: 0,
    status: properties.status ? String(properties.status) : undefined,
  };
}
