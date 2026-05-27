import { z } from "zod";

/** GeoJSON Polygon ring: [lng, lat][] */
export type BoundaryRing = [number, number][];

export type VillageBoundaryPolygon = {
  type: "Polygon";
  coordinates: [BoundaryRing];
};

const coordSchema = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);

const ringSchema = z
  .array(coordSchema)
  .min(4, "Batas desa minimal 3 titik (poligon tertutup)");

const polygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.tuple([ringSchema]),
});

export function parseBoundaryPolygon(
  value: unknown,
): VillageBoundaryPolygon | null {
  const parsed = polygonSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function latLngRingToGeoJson(
  points: Array<{ lat: number; lng: number }>,
): VillageBoundaryPolygon | null {
  if (points.length < 3) return null;
  const ring: BoundaryRing = points.map((p) => [p.lng, p.lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }
  return { type: "Polygon", coordinates: [ring] };
}

export function geoJsonToLatLngPoints(
  boundary: VillageBoundaryPolygon | null,
): Array<{ lat: number; lng: number }> {
  if (!boundary?.coordinates?.[0]?.length) return [];
  const ring = boundary.coordinates[0];
  const open =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
  return open.map(([lng, lat]) => ({ lat, lng }));
}

export function parseGisSettings(settings: unknown): {
  boundary: VillageBoundaryPolygon | null;
} {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return { boundary: null };
  }
  const o = settings as Record<string, unknown>;
  const gis =
    o.gis && typeof o.gis === "object" && !Array.isArray(o.gis)
      ? (o.gis as Record<string, unknown>)
      : null;
  const boundary = parseBoundaryPolygon(gis?.boundary);
  return { boundary };
}

export function mergeBoundaryIntoVillageSettings(
  existing: unknown,
  boundary: VillageBoundaryPolygon | null,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const prevGis =
    base.gis && typeof base.gis === "object" && !Array.isArray(base.gis)
      ? { ...(base.gis as Record<string, unknown>) }
      : {};

  if (!boundary) {
    const { boundary: _b, boundaryUpdatedAt: _u, ...restGis } = prevGis;
    const next = { ...base };
    if (Object.keys(restGis).length > 0) {
      next.gis = restGis;
    } else {
      delete next.gis;
    }
    return next;
  }

  return {
    ...base,
    gis: {
      ...prevGis,
      boundary,
      boundaryUpdatedAt: new Date().toISOString(),
    },
  };
}
