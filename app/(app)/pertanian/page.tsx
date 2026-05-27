"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Leaf, Loader2, Sprout, Trash2, TrendingUp, Wheat } from "lucide-react";
import { AsyncState, MetricGrid, type MetricItem } from "@/components/app/patterns";
import { Can } from "@/components/permissions/Can";
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

type Stats = {
  plotCount: number;
  activeCycles: number;
  harvestCount: number;
  totalHarvestKg: number;
};

type PlotRow = {
  id: number;
  name: string;
  location: string | null;
  areaHa: number | null;
  cropType: string | null;
  rt: string | null;
  rw: string | null;
  cycleCount: number;
};

type CycleRow = {
  id: number;
  plotId: number;
  plotName?: string;
  season: string;
  cropName: string;
  plantedAt: string | null;
  status: string;
  harvestCount: number;
};

type HargaRow = {
  nama: string;
  satuan: string;
  harga: number;
  hargaPembanding: number;
  delta: number;
  persen: number;
  status: string;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal memuat data");
  return data as T;
}

export default function PertanianPage() {
  const { appAlert } = useAppDialogs();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [plots, setPlots] = useState<PlotRow[]>([]);
  const [cycles, setCycles] = useState<CycleRow[]>([]);
  const [plotDialog, setPlotDialog] = useState(false);
  const [cycleDialog, setCycleDialog] = useState(false);
  const [harvestDialog, setHarvestDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [plotForm, setPlotForm] = useState({
    name: "",
    location: "",
    areaHa: "",
    cropType: "",
    rt: "",
    rw: "",
  });
  const [cycleForm, setCycleForm] = useState({
    plotId: "",
    season: "",
    cropName: "",
    plantedAt: new Date().toISOString().slice(0, 10),
  });
  const [harvestForm, setHarvestForm] = useState({
    cycleId: "",
    harvestDate: new Date().toISOString().slice(0, 10),
    quantityKg: "",
  });
  const [hargaRows, setHargaRows] = useState<HargaRow[]>([]);
  const [hargaLoading, setHargaLoading] = useState(false);
  const [hargaError, setHargaError] = useState<string | null>(null);

  const loadHarga = useCallback(async () => {
    setHargaLoading(true);
    setHargaError(null);
    try {
      const res = await fetch("/api/pertanian/harga");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat harga");
      setHargaRows(json.rows ?? []);
    } catch (e) {
      setHargaError(e instanceof Error ? e.message : "Gagal memuat harga");
      setHargaRows([]);
    } finally {
      setHargaLoading(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statRes, plotRes, cycleRes] = await Promise.all([
        fetchJson<{ stats: Stats }>("/api/pertanian/stats"),
        fetchJson<{ rows: PlotRow[] }>("/api/pertanian/plots"),
        fetchJson<{ rows: CycleRow[] }>("/api/pertanian/cycles"),
      ]);
      setStats(statRes.stats);
      setPlots(plotRes.rows);
      setCycles(cycleRes.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat pertanian");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
    void loadHarga();
  }, [loadAll, loadHarga]);

  const handleDeletePlot = async (id: number) => {
    setSaving(true);
    try {
      await fetchJson(`/api/pertanian/plots/${id}`, { method: "DELETE" });
      await loadAll();
      await appAlert({ title: "Berhasil", description: "Lahan dihapus." });
    } catch (e) {
      await appAlert({
        title: "Gagal",
        description: e instanceof Error ? e.message : "Gagal menghapus",
      });
    } finally {
      setSaving(false);
    }
  };

  const metrics = useMemo<MetricItem[]>(
    () => [
      {
        title: "Lahan Aktif",
        value: stats?.plotCount ?? 0,
        icon: Sprout,
        accent: "green",
        loading,
      },
      {
        title: "Siklus Tanam",
        value: stats?.activeCycles ?? 0,
        subtitle: "Sedang berjalan",
        icon: Leaf,
        accent: "blue",
        loading,
      },
      {
        title: "Catatan Panen",
        value: stats?.harvestCount ?? 0,
        icon: Wheat,
        accent: "warning",
        loading,
      },
      {
        title: "Total Panen",
        value: `${Math.round(stats?.totalHarvestKg ?? 0)} kg`,
        icon: Wheat,
        accent: "purple",
        loading,
      },
    ],
    [stats, loading],
  );

  const handleSavePlot = async () => {
    setSaving(true);
    try {
      await fetchJson("/api/pertanian/plots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: plotForm.name,
          location: plotForm.location || undefined,
          areaHa: plotForm.areaHa ? Number(plotForm.areaHa) : undefined,
          cropType: plotForm.cropType || undefined,
          rt: plotForm.rt || undefined,
          rw: plotForm.rw || undefined,
        }),
      });
      setPlotDialog(false);
      setPlotForm({ name: "", location: "", areaHa: "", cropType: "", rt: "", rw: "" });
      await loadAll();
      await appAlert({ title: "Berhasil", description: "Lahan tercatat." });
    } catch (e) {
      await appAlert({
        title: "Gagal",
        description: e instanceof Error ? e.message : "Gagal menyimpan",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCycle = async () => {
    setSaving(true);
    try {
      await fetchJson("/api/pertanian/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plotId: Number(cycleForm.plotId),
          season: cycleForm.season,
          cropName: cycleForm.cropName,
          plantedAt: cycleForm.plantedAt,
        }),
      });
      setCycleDialog(false);
      setCycleForm({
        plotId: "",
        season: "",
        cropName: "",
        plantedAt: new Date().toISOString().slice(0, 10),
      });
      await loadAll();
      await appAlert({ title: "Berhasil", description: "Siklus tanam ditambahkan." });
    } catch (e) {
      await appAlert({
        title: "Gagal",
        description: e instanceof Error ? e.message : "Gagal menyimpan",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHarvest = async () => {
    setSaving(true);
    try {
      await fetchJson("/api/pertanian/harvests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycleId: Number(harvestForm.cycleId),
          harvestDate: harvestForm.harvestDate,
          quantityKg: harvestForm.quantityKg ? Number(harvestForm.quantityKg) : undefined,
        }),
      });
      setHarvestDialog(false);
      setHarvestForm({
        cycleId: "",
        harvestDate: new Date().toISOString().slice(0, 10),
        quantityKg: "",
      });
      await loadAll();
      await appAlert({ title: "Berhasil", description: "Hasil panen tercatat." });
    } catch (e) {
      await appAlert({
        title: "Gagal",
        description: e instanceof Error ? e.message : "Gagal menyimpan",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AsyncState loading={loading} error={error} onRetry={loadAll} loadingMessage="Memuat pertanian...">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pertanian Desa</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Lahan, siklus tanam, dan catatan panen — perluasan modul Potensi Desa.
          </p>
        </div>

        <MetricGrid items={metrics} columns={4} />

        <Tabs defaultValue="plots" className="space-y-4">
          <TabsList>
            <TabsTrigger value="plots">Lahan</TabsTrigger>
            <TabsTrigger value="cycles">Siklus Tanam</TabsTrigger>
            <TabsTrigger value="harga">Harga Komoditas</TabsTrigger>
          </TabsList>

          <TabsContent value="plots" className="space-y-4">
            <Can resource="pertanian" action="create">
              <Button onClick={() => setPlotDialog(true)}>Tambah Lahan</Button>
            </Can>
            <Card>
              <CardHeader>
                <CardTitle>Daftar Lahan</CardTitle>
              </CardHeader>
              <CardContent>
                {plots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada lahan.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Lokasi</TableHead>
                        <TableHead>Luas (ha)</TableHead>
                        <TableHead>Komoditas</TableHead>
                        <TableHead>RT/RW</TableHead>
                        <TableHead>Siklus</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plots.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>{p.location ?? "—"}</TableCell>
                          <TableCell>{p.areaHa ?? "—"}</TableCell>
                          <TableCell>{p.cropType ?? "—"}</TableCell>
                          <TableCell>
                            {p.rt && p.rw ? `RT ${p.rt}/RW ${p.rw}` : "—"}
                          </TableCell>
                          <TableCell>{p.cycleCount}</TableCell>
                          <TableCell className="text-right">
                            <Can resource="pertanian" action="delete">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={saving}
                                onClick={() => void handleDeletePlot(p.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </Can>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cycles" className="space-y-4">
            <Can resource="pertanian" action="create">
              <div className="flex gap-2">
                <Button onClick={() => setCycleDialog(true)}>Tambah Siklus</Button>
                <Button variant="outline" onClick={() => setHarvestDialog(true)}>
                  Catat Panen
                </Button>
              </div>
            </Can>
            <Card>
              <CardHeader>
                <CardTitle>Siklus Tanam & Panen</CardTitle>
              </CardHeader>
              <CardContent>
                {cycles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada siklus tanam.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lahan</TableHead>
                        <TableHead>Musim</TableHead>
                        <TableHead>Tanaman</TableHead>
                        <TableHead>Tanam</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Panen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cycles.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>{c.plotName ?? c.plotId}</TableCell>
                          <TableCell>{c.season}</TableCell>
                          <TableCell>{c.cropName}</TableCell>
                          <TableCell>{c.plantedAt ?? "—"}</TableCell>
                          <TableCell>{c.status}</TableCell>
                          <TableCell>{c.harvestCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="harga" className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Harga pangan pertanian dari Kemendag (wilayah desa)
              </p>
              <Button variant="outline" size="sm" onClick={() => void loadHarga()} disabled={hargaLoading}>
                {hargaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Muat ulang"}
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Referensi Harga Komoditas</CardTitle>
              </CardHeader>
              <CardContent>
                {hargaError ? (
                  <p className="text-sm text-destructive">{hargaError}</p>
                ) : hargaLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : hargaRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Tidak ada data harga. Pilih provinsi dan kabupaten/kota di Pengaturan Desa.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Komoditas</TableHead>
                        <TableHead>Satuan</TableHead>
                        <TableHead>Harga</TableHead>
                        <TableHead>Perubahan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hargaRows.map((h) => (
                        <TableRow key={h.nama}>
                          <TableCell className="font-medium">{h.nama}</TableCell>
                          <TableCell>{h.satuan}</TableCell>
                          <TableCell>
                            Rp {h.harga.toLocaleString("id-ID")}
                          </TableCell>
                          <TableCell>
                            {h.persen.toFixed(1)}% ({h.status})
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={plotDialog} onOpenChange={setPlotDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Tambah Lahan</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Nama lahan</Label>
                <Input
                  value={plotForm.name}
                  onChange={(e) => setPlotForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Lokasi</Label>
                <Input
                  value={plotForm.location}
                  onChange={(e) => setPlotForm((f) => ({ ...f, location: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Luas (ha)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={plotForm.areaHa}
                    onChange={(e) => setPlotForm((f) => ({ ...f, areaHa: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Komoditas</Label>
                  <Input
                    value={plotForm.cropType}
                    onChange={(e) => setPlotForm((f) => ({ ...f, cropType: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPlotDialog(false)}>
                Batal
              </Button>
              <Button onClick={() => void handleSavePlot()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={cycleDialog} onOpenChange={setCycleDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Tambah Siklus Tanam</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Lahan</Label>
                <Select
                  value={cycleForm.plotId || "none"}
                  onValueChange={(v) =>
                    setCycleForm((f) => ({ ...f, plotId: v === "none" ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih lahan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plots.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Musim</Label>
                <Input
                  value={cycleForm.season}
                  onChange={(e) => setCycleForm((f) => ({ ...f, season: e.target.value }))}
                  placeholder="MT 2026"
                />
              </div>
              <div className="space-y-2">
                <Label>Tanaman</Label>
                <Input
                  value={cycleForm.cropName}
                  onChange={(e) => setCycleForm((f) => ({ ...f, cropName: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCycleDialog(false)}>
                Batal
              </Button>
              <Button onClick={() => void handleSaveCycle()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={harvestDialog} onOpenChange={setHarvestDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Catat Hasil Panen</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Siklus tanam</Label>
                <Select
                  value={harvestForm.cycleId || "none"}
                  onValueChange={(v) =>
                    setHarvestForm((f) => ({ ...f, cycleId: v === "none" ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih siklus" />
                  </SelectTrigger>
                  <SelectContent>
                    {cycles.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.plotName} — {c.cropName} ({c.season})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tanggal panen</Label>
                <Input
                  type="date"
                  value={harvestForm.harvestDate}
                  onChange={(e) =>
                    setHarvestForm((f) => ({ ...f, harvestDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Jumlah (kg)</Label>
                <Input
                  type="number"
                  value={harvestForm.quantityKg}
                  onChange={(e) =>
                    setHarvestForm((f) => ({ ...f, quantityKg: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setHarvestDialog(false)}>
                Batal
              </Button>
              <Button onClick={() => void handleSaveHarvest()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AsyncState>
  );
}
