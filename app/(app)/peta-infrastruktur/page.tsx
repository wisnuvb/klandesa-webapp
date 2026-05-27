"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, HardHat, MapPin, Plus } from "lucide-react";
import type { MapMarker } from "@/lib/gis/map";
import { AsyncState, MetricGrid, type MetricItem } from "@/components/app/patterns";
import { Can } from "@/components/permissions/Can";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";
import type { VillageBoundaryPolygon } from "@/lib/gis/boundary";
import { GisEntityDialogs } from "./_components/GisEntityDialogs";
import { GisMapPanel } from "./_components/GisMapPanel";
import {
  AssetsDataTable,
  DisastersDataTable,
  HeatmapTable,
  ProjectsDataTable,
  type HeatCell,
} from "./_components/GisTableCards";

type MapData = {
  center: { lat: number; lng: number } | null;
  boundary: VillageBoundaryPolygon | null;
  markers: MapMarker[];
  heatmap: HeatCell[];
  stats: { assetCount: number; projectCount: number; disasterCount: number };
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal memuat data");
  return data as T;
}

function parseCoord(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

const emptyAsset = {
  name: "",
  assetType: "road",
  lat: "",
  lng: "",
  rt: "",
  rw: "",
  condition: "good",
};

const emptyProject = {
  title: "",
  projectType: "construction",
  status: "planned",
  budget: "",
  lat: "",
  lng: "",
  rt: "",
  rw: "",
};

const emptyDisaster = {
  name: "",
  disasterType: "flood",
  riskLevel: "medium",
  lat: "",
  lng: "",
  rt: "",
  rw: "",
  notes: "",
};

export default function PetaInfrastrukturPage() {
  const { appAlert, appConfirm } = useAppDialogs();
  const [loading, setLoading] = useState(true);
  const [mapRefreshing, setMapRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const [assetOpen, setAssetOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [disasterOpen, setDisasterOpen] = useState(false);
  const [assetForm, setAssetForm] = useState(emptyAsset);
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [disasterForm, setDisasterForm] = useState(emptyDisaster);

  const loadMapData = useCallback(async () => {
    const res = await fetch("/api/gis/map-data", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Gagal memuat data peta");
    }
    const parsed = data as MapData;
    setMapData(parsed);
    return parsed;
  }, []);

  const appendMapMarker = useCallback(
    (marker: MapMarker) => {
      setMapData((prev) => {
        if (!prev) return prev;
        if (prev.markers.some((m) => m.id === marker.id)) return prev;
        return { ...prev, markers: [...prev.markers, marker] };
      });
    },
    [],
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadMapData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat peta infrastruktur");
    } finally {
      setLoading(false);
    }
  }, [loadMapData]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const refreshMap = useCallback(async () => {
    setMapRefreshing(true);
    try {
      await loadMapData();
    } catch (e) {
      await appAlert(e instanceof Error ? e.message : "Gagal memperbarui peta");
    } finally {
      setMapRefreshing(false);
    }
  }, [loadMapData, appAlert]);

  const bumpTables = useCallback(() => {
    setTableRefreshKey((k) => k + 1);
  }, []);

  const refreshAfterMutation = useCallback(async () => {
    bumpTables();
    await refreshMap();
  }, [bumpTables, refreshMap]);

  const metrics: MetricItem[] = useMemo(
    () => [
      {
        title: "Aset Infrastruktur",
        value: mapData?.stats.assetCount ?? 0,
        icon: MapPin,
        accent: "blue",
      },
      {
        title: "Proyek Aktif",
        value: mapData?.stats.projectCount ?? 0,
        icon: HardHat,
        accent: "green",
      },
      {
        title: "Titik Risiko Bencana",
        value: mapData?.stats.disasterCount ?? 0,
        icon: AlertTriangle,
        accent: "warning",
      },
    ],
    [mapData?.stats],
  );

  async function saveAsset() {
    if (!assetForm.name.trim()) {
      await appAlert("Nama aset wajib diisi.");
      return;
    }
    const lat = parseCoord(assetForm.lat);
    const lng = parseCoord(assetForm.lng);
    if (
      (assetForm.lat && lat === null) ||
      (assetForm.lng && lng === null)
    ) {
      await appAlert("Koordinat tidak valid.");
      return;
    }

    setSaving(true);
    try {
      const created = await fetchJson<{
        row: { id: number; name: string; lat: number | null; lng: number | null };
      }>("/api/gis/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: assetForm.name.trim(),
          assetType: assetForm.assetType,
          lat,
          lng,
          rt: assetForm.rt.trim() || null,
          rw: assetForm.rw.trim() || null,
          condition: assetForm.condition,
        }),
      });
      if (created.row.lat != null && created.row.lng != null) {
        appendMapMarker({
          id: `asset-${created.row.id}`,
          lat: created.row.lat,
          lng: created.row.lng,
          label: created.row.name,
          type: "asset",
        });
      }
      setAssetOpen(false);
      setAssetForm(emptyAsset);
      await refreshAfterMutation();
    } catch (e) {
      await appAlert(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function saveProject() {
    if (!projectForm.title.trim()) {
      await appAlert("Judul proyek wajib diisi.");
      return;
    }
    const lat = parseCoord(projectForm.lat);
    const lng = parseCoord(projectForm.lng);
    if (
      (projectForm.lat && lat === null) ||
      (projectForm.lng && lng === null)
    ) {
      await appAlert("Koordinat tidak valid.");
      return;
    }
    const budget = projectForm.budget.trim()
      ? Number(projectForm.budget)
      : null;
    if (projectForm.budget.trim() && Number.isNaN(budget)) {
      await appAlert("Anggaran tidak valid.");
      return;
    }

    setSaving(true);
    try {
      const created = await fetchJson<{
        row: {
          id: number;
          title: string;
          lat: number | null;
          lng: number | null;
        };
      }>("/api/gis/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: projectForm.title.trim(),
          projectType: projectForm.projectType,
          status: projectForm.status,
          budget,
          lat,
          lng,
          rt: projectForm.rt.trim() || null,
          rw: projectForm.rw.trim() || null,
        }),
      });
      if (created.row.lat != null && created.row.lng != null) {
        appendMapMarker({
          id: `project-${created.row.id}`,
          lat: created.row.lat,
          lng: created.row.lng,
          label: created.row.title,
          type: "project",
        });
      }
      setProjectOpen(false);
      setProjectForm(emptyProject);
      await refreshAfterMutation();
    } catch (e) {
      await appAlert(e instanceof Error ? e.message : "Gagal menyimpan proyek");
    } finally {
      setSaving(false);
    }
  }

  async function saveDisaster() {
    if (!disasterForm.name.trim()) {
      await appAlert("Nama lokasi wajib diisi.");
      return;
    }
    const lat = parseCoord(disasterForm.lat);
    const lng = parseCoord(disasterForm.lng);
    if (
      (disasterForm.lat && lat === null) ||
      (disasterForm.lng && lng === null)
    ) {
      await appAlert("Koordinat tidak valid.");
      return;
    }

    setSaving(true);
    try {
      const created = await fetchJson<{
        row: { id: number; name: string; lat: number | null; lng: number | null };
      }>("/api/lingkungan/disaster-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: disasterForm.name.trim(),
          disasterType: disasterForm.disasterType,
          riskLevel: disasterForm.riskLevel,
          lat,
          lng,
          rt: disasterForm.rt.trim() || null,
          rw: disasterForm.rw.trim() || null,
          notes: disasterForm.notes.trim() || null,
        }),
      });
      if (created.row.lat != null && created.row.lng != null) {
        appendMapMarker({
          id: `disaster-${created.row.id}`,
          lat: created.row.lat,
          lng: created.row.lng,
          label: created.row.name,
          type: "disaster",
        });
      }
      setDisasterOpen(false);
      setDisasterForm(emptyDisaster);
      await refreshAfterMutation();
    } catch (e) {
      await appAlert(e instanceof Error ? e.message : "Gagal menyimpan titik bencana");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAsset(id: number) {
    const ok = await appConfirm("Hapus aset infrastruktur ini?");
    if (!ok) return;
    setSaving(true);
    try {
      await fetchJson(`/api/gis/assets/${id}`, { method: "DELETE" });
      await refreshAfterMutation();
    } catch (e) {
      await appAlert(e instanceof Error ? e.message : "Gagal menghapus");
    } finally {
      setSaving(false);
    }
  }

  async function deleteDisaster(id: number) {
    const ok = await appConfirm("Hapus titik risiko bencana ini?");
    if (!ok) return;
    setSaving(true);
    try {
      await fetchJson(`/api/lingkungan/disaster-points/${id}`, {
        method: "DELETE",
      });
      await refreshAfterMutation();
    } catch (e) {
      await appAlert(e instanceof Error ? e.message : "Gagal menghapus");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AsyncState
      loading={loading}
      error={error}
      onRetry={loadInitial}
      loadingMessage="Memuat peta infrastruktur..."
    >
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Peta Infrastruktur
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gambar batas desa, tambahkan titik penting lewat peta, dan pantau
            aset, proyek, serta risiko bencana.
          </p>
        </div>

        <MetricGrid items={metrics} />

        {mapData ? (
          <GisMapPanel
            center={mapData.center}
            markers={mapData.markers}
            boundary={mapData.boundary}
            mapRefreshing={mapRefreshing}
            onRefresh={refreshMap}
            onSave={async (polygon) => {
              const res = await fetch("/api/gis/boundary", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ boundary: polygon }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                throw new Error(data.error || "Gagal menyimpan batas desa");
              }
              await refreshAfterMutation();
            }}
          />
        ) : null}

        <Tabs defaultValue="assets">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="assets">Aset</TabsTrigger>
            <TabsTrigger value="projects">Proyek</TabsTrigger>
            <TabsTrigger value="disasters">Titik Bencana</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap SDGs</TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="space-y-3">
            <AssetsDataTable
              tableRefreshKey={tableRefreshKey}
              saving={saving}
              onDelete={deleteAsset}
              toolbar={
                <Can resource="gis" action="create">
                  <Button size="sm" onClick={() => setAssetOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Tambah Aset
                  </Button>
                </Can>
              }
            />
          </TabsContent>

          <TabsContent value="projects" className="space-y-3">
            <ProjectsDataTable
              tableRefreshKey={tableRefreshKey}
              toolbar={
                <Can resource="gis" action="create">
                  <Button size="sm" onClick={() => setProjectOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Tambah Proyek
                  </Button>
                </Can>
              }
            />
          </TabsContent>

          <TabsContent value="disasters" className="space-y-3">
            <DisastersDataTable
              tableRefreshKey={tableRefreshKey}
              saving={saving}
              onDelete={deleteDisaster}
              toolbar={
                <Can resource="lingkungan" action="create">
                  <Button size="sm" onClick={() => setDisasterOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Tambah Titik Bencana
                  </Button>
                </Can>
              }
            />
          </TabsContent>

          <TabsContent value="heatmap">
            <HeatmapTable rows={mapData?.heatmap ?? []} />
          </TabsContent>
        </Tabs>

        {mapData ? (
          <GisEntityDialogs
            center={mapData.center}
            markers={mapData.markers}
            boundary={mapData.boundary}
            saving={saving}
            assetOpen={assetOpen}
            projectOpen={projectOpen}
            disasterOpen={disasterOpen}
            assetForm={assetForm}
            projectForm={projectForm}
            disasterForm={disasterForm}
            onAssetOpenChange={setAssetOpen}
            onProjectOpenChange={setProjectOpen}
            onDisasterOpenChange={setDisasterOpen}
            onAssetFormChange={setAssetForm}
            onProjectFormChange={setProjectForm}
            onDisasterFormChange={setDisasterForm}
            onSaveAsset={saveAsset}
            onSaveProject={saveProject}
            onSaveDisaster={saveDisaster}
          />
        ) : null}
      </div>
    </AsyncState>
  );
}
