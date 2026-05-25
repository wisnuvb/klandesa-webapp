"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Leaf, Loader2, Plus, Recycle, Trash2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";

type WasteBank = { id: number; name: string; monthlyKg: number; rt: string | null; rw: string | null; status: string };
type Incident = {
  id: number;
  title: string;
  incidentType: string;
  severity: string;
  status: string;
  checklist: Array<{ label: string; done?: boolean }>;
};
type Disaster = { id: number; name: string; disasterType: string; riskLevel: string; status: string };

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal memuat data");
  return data as T;
}

function severityBadge(s: string) {
  if (s === "critical" || s === "high") return <Badge variant="destructive">{s}</Badge>;
  return <Badge variant="secondary">{s}</Badge>;
}

export default function LingkunganPage() {
  const { appAlert, appConfirm } = useAppDialogs();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banks, setBanks] = useState<WasteBank[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [bankDialog, setBankDialog] = useState(false);
  const [incidentDialog, setIncidentDialog] = useState(false);
  const [bankName, setBankName] = useState("");
  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentType, setIncidentType] = useState("flood");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, i, d] = await Promise.all([
        fetchJson<{ rows: WasteBank[] }>("/api/lingkungan/waste-banks"),
        fetchJson<{ rows: Incident[] }>("/api/lingkungan/incidents"),
        fetchJson<{ rows: Disaster[] }>("/api/lingkungan/disaster-points"),
      ]);
      setBanks(b.rows);
      setIncidents(i.rows);
      setDisasters(d.rows);
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
    { title: "Bank Sampah", value: banks.length, icon: Recycle, accent: "green" },
    {
      title: "Insiden Terbuka",
      value: incidents.filter((x) => x.status === "open").length,
      icon: AlertTriangle,
      accent: "warning",
    },
    { title: "Titik Risiko", value: disasters.length, icon: AlertTriangle, accent: "orange" },
    {
      title: "Daur Ulang/bulan",
      value: `${banks.reduce((s, b) => s + b.monthlyKg, 0).toFixed(0)} kg`,
      icon: Leaf,
      accent: "blue",
    },
  ];

  async function addBank() {
    if (!bankName.trim()) return;
    setSaving(true);
    try {
      await fetchJson("/api/lingkungan/waste-banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: bankName }),
      });
      setBankDialog(false);
      setBankName("");
      await load();
    } catch (e) {
      await appAlert(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function addIncident() {
    if (!incidentTitle.trim()) return;
    setSaving(true);
    try {
      await fetchJson("/api/lingkungan/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: incidentTitle, incidentType }),
      });
      setIncidentDialog(false);
      setIncidentTitle("");
      await load();
    } catch (e) {
      await appAlert(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function toggleChecklist(incident: Incident, index: number) {
    const checklist = incident.checklist.map((c, i) =>
      i === index ? { ...c, done: !c.done } : c,
    );
    try {
      await fetchJson(`/api/lingkungan/incidents/${incident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: incident.title,
          incidentType: incident.incidentType,
          checklist,
        }),
      });
      await load();
    } catch (e) {
      await appAlert(e instanceof Error ? e.message : "Gagal memperbarui checklist");
    }
  }

  async function deleteBank(id: number) {
    const ok = await appConfirm("Hapus bank sampah ini?");
    if (!ok) return;
    await fetchJson(`/api/lingkungan/waste-banks/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <AsyncState loading={loading} error={error} onRetry={load}>
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lingkungan & Kebencanaan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bank sampah, insiden lingkungan, titik bencana, dan early warning checklist.
        </p>
      </div>

      <MetricGrid items={metrics} />

      <Tabs defaultValue="banks">
        <TabsList>
          <TabsTrigger value="banks">Bank Sampah</TabsTrigger>
          <TabsTrigger value="incidents">Insiden</TabsTrigger>
          <TabsTrigger value="disasters">Titik Bencana</TabsTrigger>
        </TabsList>

        <TabsContent value="banks" className="space-y-3">
          <Can resource="lingkungan" action="create">
            <Button size="sm" onClick={() => setBankDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Tambah Bank Sampah
            </Button>
          </Can>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>RT/RW</TableHead>
                <TableHead>kg/bulan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {banks.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{b.name}</TableCell>
                  <TableCell>
                    {b.rt ?? "—"}/{b.rw ?? "—"}
                  </TableCell>
                  <TableCell>{b.monthlyKg}</TableCell>
                  <TableCell>{b.status}</TableCell>
                  <TableCell>
                    <Can resource="lingkungan" action="delete">
                      <Button variant="ghost" size="icon" onClick={() => void deleteBank(b.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Can>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-3">
          <Can resource="lingkungan" action="create">
            <Button size="sm" onClick={() => setIncidentDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Laporkan Insiden
            </Button>
          </Can>
          <div className="grid gap-4 md:grid-cols-2">
            {incidents.map((inc) => (
              <Card key={inc.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{inc.title}</CardTitle>
                    {severityBadge(inc.severity)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {inc.incidentType} · {inc.status}
                  </p>
                  <p className="text-xs font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Early Warning Checklist
                  </p>
                  <ul className="space-y-1">
                    {inc.checklist.map((c, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={!!c.done}
                          onCheckedChange={() => void toggleChecklist(inc, i)}
                        />
                        <span className={c.done ? "line-through text-muted-foreground" : ""}>
                          {c.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="disasters">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Risiko</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disasters.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.name}</TableCell>
                  <TableCell>{d.disasterType}</TableCell>
                  <TableCell>{severityBadge(d.riskLevel)}</TableCell>
                  <TableCell>{d.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <Dialog open={bankDialog} onOpenChange={setBankDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Leaf className="h-4 w-4" />
              Bank Sampah Baru
            </DialogTitle>
          </DialogHeader>
          <Label>Nama</Label>
          <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
          <DialogFooter>
            <Button disabled={saving} onClick={() => void addBank()}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={incidentDialog} onOpenChange={setIncidentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Laporkan Insiden</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Judul</Label>
              <Input
                value={incidentTitle}
                onChange={(e) => setIncidentTitle(e.target.value)}
              />
            </div>
            <div>
              <Label>Tipe</Label>
              <Select value={incidentType} onValueChange={setIncidentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["flood", "landslide", "pollution", "illegal_dump", "fire", "other"].map(
                    (t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={saving} onClick={() => void addIncident()}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AsyncState>
  );
}
