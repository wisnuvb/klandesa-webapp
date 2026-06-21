"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RegionalPageHeader } from "@/components/regional/RegionalPageHeader";

type GisPoint = {
  id: string;
  type: "asset" | "project" | "disaster";
  name: string;
  villageName: string;
  district: string;
  lat: number;
  lng: number;
  status?: string;
};

type GisData = {
  points: GisPoint[];
  summary: { assets: number; projects: number; disasterPoints: number };
};

const TYPE_LABEL: Record<GisPoint["type"], string> = {
  asset: "Aset",
  project: "Proyek",
  disaster: "Risiko bencana",
};

const TYPE_COLOR: Record<GisPoint["type"], string> = {
  asset: "#0d9488",
  project: "#2563eb",
  disaster: "#dc2626",
};

export default function WilayahPetaPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<GisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<GisPoint["type"] | "all">("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/regional/gis", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as
          | GisData
          | { error?: string }
          | null;
        if (cancelled) return;
        if (!res.ok) {
          setError((json as { error?: string })?.error ?? "Gagal memuat peta");
          return;
        }
        setData(json as GisData);
      } catch {
        if (!cancelled) setError("Gagal memuat peta");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data.points;
    return data.points.filter((p) => p.type === filter);
  }, [data, filter]);

  const bounds = useMemo(() => {
    if (filtered.length === 0) return null;
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    for (const p of filtered) {
      minLat = Math.min(minLat, p.lat);
      maxLat = Math.max(maxLat, p.lat);
      minLng = Math.min(minLng, p.lng);
      maxLng = Math.max(maxLng, p.lng);
    }
    return { minLat, maxLat, minLng, maxLng };
  }, [filtered]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <RegionalPageHeader
        title="Peta infrastruktur"
        userName={session?.user?.name}
        description="Titik aset, proyek, dan risiko bencana agregat dari desa-desa di wilayah."
      />

      {loading && (
        <p className="text-sm text-muted-foreground">Memuat data…</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {data && !loading && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Aset</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.summary.assets}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Proyek</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.summary.projects}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Titik bencana</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {data.summary.disasterPoints}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["all", "asset", "project", "disaster"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilter(t)}
                className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                  filter === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted"
                }`}
              >
                {t === "all" ? "Semua" : TYPE_LABEL[t]}
              </button>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Peta scatter</CardTitle>
              <CardDescription>
                {filtered.length} titik dengan koordinat — proporsional dalam
                batas wilayah
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 || !bounds ? (
                <p className="text-sm text-muted-foreground py-12 text-center">
                  Belum ada titik GIS dengan koordinat di desa wilayah ini.
                </p>
              ) : (
                <div className="relative w-full aspect-[16/10] bg-muted/30 rounded-lg border overflow-hidden">
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full"
                    role="img"
                    aria-label="Peta titik infrastruktur"
                  >
                    {filtered.map((p) => {
                      const latRange = bounds.maxLat - bounds.minLat || 0.01;
                      const lngRange = bounds.maxLng - bounds.minLng || 0.01;
                      const x =
                        ((p.lng - bounds.minLng) / lngRange) * 90 + 5;
                      const y =
                        95 - ((p.lat - bounds.minLat) / latRange) * 90;
                      return (
                        <circle
                          key={p.id}
                          cx={x}
                          cy={y}
                          r={1.2}
                          fill={TYPE_COLOR[p.type]}
                          opacity={0.85}
                        >
                          <title>
                            {p.name} ({p.villageName})
                          </title>
                        </circle>
                      );
                    })}
                  </svg>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daftar titik</CardTitle>
            </CardHeader>
            <CardContent className="max-h-80 overflow-y-auto space-y-2">
              {filtered.slice(0, 50).map((p) => (
                <div
                  key={p.id}
                  className="flex items-start gap-2 text-sm border-b pb-2 last:border-0"
                >
                  <Badge
                    variant="outline"
                    style={{ borderColor: TYPE_COLOR[p.type] }}
                  >
                    {TYPE_LABEL[p.type]}
                  </Badge>
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.villageName} · {p.district}
                      {p.status ? ` · ${p.status}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
