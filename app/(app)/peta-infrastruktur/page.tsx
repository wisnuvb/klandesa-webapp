"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Leaf, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { VillageMap } from "@/components/app/gis/VillageMapClient";
import type { MapMarker } from "@/components/app/gis/VillageMap";
import { AsyncState, MetricGrid, type MetricItem } from "@/components/app/patterns";
import { Can } from "@/components/permissions/Can";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";

type AssetRow = {
  id: number;
  name: string;
  assetType: string;
  lat: number | null;
  lng: number | null;
  condition: string;
  rt: string | null;
  rw: string | null;
};

type ProjectRow = {
  id: number;
  title: string;
  projectType: string;
  status: string;
  budget: number | null;
};

type HeatCell = {
  rt: string;
  rw: string;
  compositeScore: number | null;
  label: string;
};

type MapData = {
  center: { lat: number; lng: number } | null;
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

const emptyAsset = {
  name: "",
  assetType: "road",
  lat: "",
  lng: "",
  rt: "",
  rw: "",
  condition: "good",
};

export default function PetaInfrastrukturPage() {
  const { appAlert, appConfirm } = useAppDialogs();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyAsset);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [map, a, p] = await Promise.all([
        fetchJson<MapData>("/api/gis/map-data"),
        fetchJson<{ rows: AssetRow[] }>("/api/gis/assets"),
        fetchJson<{ rows: ProjectRow[] }>("/api/gis/projects"),
      ]);
      setMapData(map);
      setAssets(a.rows);
      setProjects(p.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics: MetricItem[] = [
    { title: "Aset Infrastruktur", value: mapData?.stats.assetCount ?? 0, icon: MapPin, accent: "blue" },
    { title: "Proyek Aktif", value: mapData?.stats.projectCount ?? 0, icon: MapPin, accent: "green" },
    { title: "Titik Risiko Bencana", value: mapData?.stats.disasterCount ?? 0, icon: AlertTriangle, accent: "warning" },
  ];

  async function saveAsset() {
    if (!form.name.trim()) {
      await appAlert("Nama aset wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      await fetchJson("/api/gis/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          assetType: form.assetType,
          lat: form.lat ? Number(form.lat) : null,
          lng: form.lng ? Number(form.lng) : null,
          rt: form.rt || null,
          rw: form.rw || null,
          condition: form.condition,
        }),
      });
      setDialogOpen(false);
      setForm(emptyAsset);
      await load();
    } catch (e) {
      await appAlert(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAsset(id: number) {
    const ok = await appConfirm("Hapus aset infrastruktur ini?");
    if (!ok) return;
    try {
      await fetchJson(`/api/gis/assets/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      await appAlert(e instanceof Error ? e.message : "Gagal menghapus");
    }
  }

  return (
    <AsyncState loading={loading} error={error} onRetry={load}>
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Peta Infrastruktur</h1>
        <p className="text-sm text-muted-foreground mt-1">
          GIS desa — aset, proyek, titik bencana, dan heatmap SDGs per RT/RW.
        </p>
      </div>

      <MetricGrid items={metrics} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Peta Desa
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mapData && (
            <VillageMap center={mapData.center} markers={mapData.markers} />
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="assets">
        <TabsList>
          <TabsTrigger value="assets">Aset</TabsTrigger>
          <TabsTrigger value="projects">Proyek</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap SDGs</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="space-y-3">
          <Can resource="gis" action="create">
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Tambah Aset
            </Button>
          </Can>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead>RT/RW</TableHead>
                <TableHead>Koordinat</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>{a.assetType}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{a.condition}</Badge>
                  </TableCell>
                  <TableCell>
                    {a.rt ?? "—"}/{a.rw ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {a.lat != null && a.lng != null
                      ? `${a.lat.toFixed(5)}, ${a.lng.toFixed(5)}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Can resource="gis" action="delete">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void deleteAsset(a.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Can>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="projects">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Anggaran</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.title}</TableCell>
                  <TableCell>{p.projectType}</TableCell>
                  <TableCell>{p.status}</TableCell>
                  <TableCell>
                    {p.budget != null
                      ? new Intl.NumberFormat("id-ID").format(p.budget)
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="heatmap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RT</TableHead>
                <TableHead>RW</TableHead>
                <TableHead>Skor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(mapData?.heatmap ?? []).map((h, i) => (
                <TableRow key={`${h.rt}-${h.rw}-${i}`}>
                  <TableCell>{h.rt}</TableCell>
                  <TableCell>{h.rw}</TableCell>
                  <TableCell>{h.compositeScore ?? "—"}</TableCell>
                  <TableCell>{h.label}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Aset Infrastruktur</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Nama</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Tipe</Label>
              <Select
                value={form.assetType}
                onValueChange={(v) => setForm({ ...form, assetType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["road", "bridge", "drainage", "water", "electricity", "other"].map(
                    (t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Latitude</Label>
                <Input
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button disabled={saving} onClick={() => void saveAsset()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AsyncState>
  );
}
