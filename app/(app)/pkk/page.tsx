"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Baby,
  CalendarDays,
  Download,
  Heart,
  Loader2,
  Users,
} from "lucide-react";
import { AsyncState, ListPageToolbar, MetricGrid } from "@/components/app/patterns";
import { Can } from "@/components/permissions/Can";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";
import {
  DasawismaDataTable,
  PosyanduSessionsDataTable,
  StuntingResidentsDataTable,
  StuntingVisitsDataTable,
  type DasawismaRow,
  type SessionRow,
} from "./_components/PkkTableCards";

type PkkStats = {
  balitaStunting: number;
  ibuHamil: number;
  balita: number;
  dasawismaCount: number;
  posyanduSessionsThisMonth: number;
  stuntingFromVisits: number;
};

type ResidentOption = {
  id: number;
  name: string;
  nik: string;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Gagal memuat data");
  }
  return data as T;
}

export default function PkkPage() {
  const { appAlert } = useAppDialogs();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<PkkStats | null>(null);
  const [dasawismaOptions, setDasawismaOptions] = useState<DasawismaRow[]>([]);
  const [sessionOptions, setSessionOptions] = useState<SessionRow[]>([]);
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);

  const [dasDialog, setDasDialog] = useState(false);
  const [sessionDialog, setSessionDialog] = useState(false);
  const [visitDialog, setVisitDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dasForm, setDasForm] = useState({ rt: "", rw: "", leaderName: "", memberCount: "0" });
  const [sessionForm, setSessionForm] = useState({
    sessionDate: new Date().toISOString().slice(0, 10),
    location: "",
    dasawismaId: "",
  });
  const [visitForm, setVisitForm] = useState({
    sessionId: "",
    residentId: "",
    weightKg: "",
    heightCm: "",
    notes: "",
    isStunting: false,
  });

  const bumpTables = useCallback(() => {
    setTableRefreshKey((k) => k + 1);
  }, []);

  const loadFormOptions = useCallback(async () => {
    try {
      const [dasRes, sessRes] = await Promise.all([
        fetchJson<{ rows: DasawismaRow[]; total: number }>(
          "/api/pkk/dasawisma?page=1&pageSize=500",
        ),
        fetchJson<{ rows: SessionRow[]; total: number }>(
          "/api/pkk/posyandu/sessions?page=1&pageSize=500",
        ),
      ]);
      setDasawismaOptions(dasRes.rows);
      setSessionOptions(sessRes.rows);
    } catch {
      /* dialog tetap bisa dibuka; opsi diisi ulang saat berikutnya */
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, resRes] = await Promise.all([
        fetchJson<{ stats: PkkStats }>("/api/pkk/stats"),
        fetchJson<{ rows: Array<{ id: number; name: string; nik: string }> }>(
          "/api/residents?page=1&pageSize=200",
        ),
      ]);
      setStats(statsRes.stats);
      setResidents(
        resRes.rows.map((r) => ({ id: r.id, name: r.name, nik: r.nik })),
      );
      await loadFormOptions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data PKK");
    } finally {
      setLoading(false);
    }
  }, [loadFormOptions]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (sessionDialog || visitDialog) {
      void loadFormOptions();
    }
  }, [sessionDialog, visitDialog, loadFormOptions]);

  const metricItems = useMemo(
    () => [
      {
        title: "Balita Stunting",
        value: stats?.balitaStunting ?? 0,
        subtitle: "Dari data warga",
        icon: Baby,
        accent: "warning" as const,
        loading,
      },
      {
        title: "Ibu Hamil",
        value: stats?.ibuHamil ?? 0,
        subtitle: "Terdata di kependudukan",
        icon: Heart,
        accent: "purple" as const,
        loading,
      },
      {
        title: "Sesi Posyandu Bulan Ini",
        value: stats?.posyanduSessionsThisMonth ?? 0,
        subtitle: "Kegiatan posyandu",
        icon: CalendarDays,
        accent: "info" as const,
        loading,
      },
      {
        title: "Dasawisma",
        value: stats?.dasawismaCount ?? 0,
        subtitle: "Kelompok RT/RW",
        icon: Users,
        accent: "green" as const,
        loading,
      },
    ],
    [stats, loading],
  );

  const handleSaveDasawisma = async () => {
    setSaving(true);
    try {
      await fetchJson("/api/pkk/dasawisma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rt: dasForm.rt,
          rw: dasForm.rw,
          leaderName: dasForm.leaderName,
          memberCount: Number(dasForm.memberCount) || 0,
        }),
      });
      setDasDialog(false);
      setDasForm({ rt: "", rw: "", leaderName: "", memberCount: "0" });
      await loadAll();
      bumpTables();
      await appAlert({ title: "Berhasil", description: "Dasawisma ditambahkan." });
    } catch (e) {
      await appAlert({
        title: "Gagal",
        description: e instanceof Error ? e.message : "Gagal menyimpan",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSession = async () => {
    setSaving(true);
    try {
      await fetchJson("/api/pkk/posyandu/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionDate: sessionForm.sessionDate,
          location: sessionForm.location,
          dasawismaId: sessionForm.dasawismaId || null,
        }),
      });
      setSessionDialog(false);
      setSessionForm({
        sessionDate: new Date().toISOString().slice(0, 10),
        location: "",
        dasawismaId: "",
      });
      await loadAll();
      bumpTables();
      await appAlert({ title: "Berhasil", description: "Sesi posyandu ditambahkan." });
    } catch (e) {
      await appAlert({
        title: "Gagal",
        description: e instanceof Error ? e.message : "Gagal menyimpan",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVisit = async () => {
    setSaving(true);
    try {
      await fetchJson("/api/pkk/posyandu/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: Number(visitForm.sessionId),
          residentId: Number(visitForm.residentId),
          weightKg: visitForm.weightKg || null,
          heightCm: visitForm.heightCm || null,
          notes: visitForm.notes || null,
          isStunting: visitForm.isStunting,
        }),
      });
      setVisitDialog(false);
      setVisitForm({
        sessionId: "",
        residentId: "",
        weightKg: "",
        heightCm: "",
        notes: "",
        isStunting: false,
      });
      await loadAll();
      bumpTables();
      await appAlert({ title: "Berhasil", description: "Kunjungan posyandu tercatat." });
    } catch (e) {
      await appAlert({
        title: "Gagal",
        description: e instanceof Error ? e.message : "Gagal menyimpan",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    window.open("/api/pkk/export", "_blank");
  };

  const handleDeleteDasawisma = async (id: number) => {
    setSaving(true);
    try {
      await fetchJson(`/api/pkk/dasawisma/${id}`, { method: "DELETE" });
      await loadAll();
      bumpTables();
      await appAlert({ title: "Berhasil", description: "Dasawisma dihapus." });
    } catch (e) {
      await appAlert({
        title: "Gagal",
        description: e instanceof Error ? e.message : "Gagal menghapus",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AsyncState
      loading={loading}
      error={error}
      onRetry={loadAll}
      loadingMessage="Memuat modul PKK & Dasawisma..."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">PKK & Dasawisma</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Posyandu, dasawisma, dan pemantauan stunting balita.
            </p>
          </div>
          <Can resource="pkk" action="export">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </Can>
        </div>

        <MetricGrid items={metricItems} columns={4} />

        <Tabs defaultValue="dasawisma" className="space-y-4">
          <TabsList>
            <TabsTrigger value="dasawisma">Dasawisma</TabsTrigger>
            <TabsTrigger value="posyandu">Posyandu</TabsTrigger>
            <TabsTrigger value="stunting">Stunting</TabsTrigger>
          </TabsList>

          <TabsContent value="dasawisma" className="space-y-4">
            <Can resource="pkk" action="create">
              <ListPageToolbar
                searchPlaceholder="Cari dasawisma..."
                showAdd={false}
                onAdd={() => setDasDialog(true)}
                addLabel="Tambah Dasawisma"
                trailing={
                  <Button onClick={() => setDasDialog(true)}>Tambah Dasawisma</Button>
                }
              />
            </Can>

            <DasawismaDataTable
              tableRefreshKey={tableRefreshKey}
              saving={saving}
              onDelete={handleDeleteDasawisma}
            />
          </TabsContent>

          <TabsContent value="posyandu" className="space-y-4">
            <Can resource="pkk" action="create">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setSessionDialog(true)}>Tambah Sesi</Button>
                <Button variant="outline" onClick={() => setVisitDialog(true)}>
                  Catat Kunjungan
                </Button>
              </div>
            </Can>

            <PosyanduSessionsDataTable tableRefreshKey={tableRefreshKey} />
          </TabsContent>

          <TabsContent value="stunting" className="space-y-4">
            <StuntingResidentsDataTable tableRefreshKey={tableRefreshKey} />
            <StuntingVisitsDataTable tableRefreshKey={tableRefreshKey} />
          </TabsContent>
        </Tabs>

        <Dialog open={dasDialog} onOpenChange={setDasDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Tambah Dasawisma</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rt">RT</Label>
                  <Input
                    id="rt"
                    value={dasForm.rt}
                    onChange={(e) => setDasForm((f) => ({ ...f, rt: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rw">RW</Label>
                  <Input
                    id="rw"
                    value={dasForm.rw}
                    onChange={(e) => setDasForm((f) => ({ ...f, rw: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="leaderName">Nama Ketua</Label>
                <Input
                  id="leaderName"
                  value={dasForm.leaderName}
                  onChange={(e) =>
                    setDasForm((f) => ({ ...f, leaderName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberCount">Jumlah Anggota</Label>
                <Input
                  id="memberCount"
                  type="number"
                  min={0}
                  value={dasForm.memberCount}
                  onChange={(e) =>
                    setDasForm((f) => ({ ...f, memberCount: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDasDialog(false)}>
                Batal
              </Button>
              <Button onClick={handleSaveDasawisma} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={sessionDialog} onOpenChange={setSessionDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Tambah Sesi Posyandu</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="sessionDate">Tanggal</Label>
                <Input
                  id="sessionDate"
                  type="date"
                  value={sessionForm.sessionDate}
                  onChange={(e) =>
                    setSessionForm((f) => ({ ...f, sessionDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Lokasi</Label>
                <Input
                  id="location"
                  value={sessionForm.location}
                  onChange={(e) =>
                    setSessionForm((f) => ({ ...f, location: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Dasawisma (opsional)</Label>
                <Select
                  value={sessionForm.dasawismaId || "none"}
                  onValueChange={(v) =>
                    setSessionForm((f) => ({
                      ...f,
                      dasawismaId: v === "none" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih dasawisma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak terkait</SelectItem>
                    {dasawismaOptions.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        RT {d.rt} / RW {d.rw} — {d.leaderName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSessionDialog(false)}>
                Batal
              </Button>
              <Button onClick={handleSaveSession} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={visitDialog} onOpenChange={setVisitDialog}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Catat Kunjungan Posyandu</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Sesi Posyandu</Label>
                <Select
                  value={visitForm.sessionId || "none"}
                  onValueChange={(v) =>
                    setVisitForm((f) => ({
                      ...f,
                      sessionId: v === "none" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih sesi" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionOptions.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.sessionDate} — {s.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Warga (residentId)</Label>
                <Select
                  value={visitForm.residentId || "none"}
                  onValueChange={(v) =>
                    setVisitForm((f) => ({
                      ...f,
                      residentId: v === "none" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih warga" />
                  </SelectTrigger>
                  <SelectContent>
                    {residents.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name} — {r.nik}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weightKg">Berat (kg)</Label>
                  <Input
                    id="weightKg"
                    type="number"
                    step="0.1"
                    value={visitForm.weightKg}
                    onChange={(e) =>
                      setVisitForm((f) => ({ ...f, weightKg: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heightCm">Tinggi (cm)</Label>
                  <Input
                    id="heightCm"
                    type="number"
                    step="0.1"
                    value={visitForm.heightCm}
                    onChange={(e) =>
                      setVisitForm((f) => ({ ...f, heightCm: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Catatan</Label>
                <Textarea
                  id="notes"
                  value={visitForm.notes}
                  onChange={(e) =>
                    setVisitForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={visitForm.isStunting}
                  onChange={(e) =>
                    setVisitForm((f) => ({ ...f, isStunting: e.target.checked }))
                  }
                />
                Tandai stunting
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVisitDialog(false)}>
                Batal
              </Button>
              <Button onClick={handleSaveVisit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AsyncState>
  );
}
