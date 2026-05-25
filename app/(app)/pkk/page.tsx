"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Baby,
  CalendarDays,
  Download,
  Heart,
  Loader2,
  Trash2,
  Users,
} from "lucide-react";
import { AsyncState, ListPageToolbar, MetricGrid } from "@/components/app/patterns";
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
import { Textarea } from "@/components/ui/textarea";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";

type PkkStats = {
  balitaStunting: number;
  ibuHamil: number;
  balita: number;
  dasawismaCount: number;
  posyanduSessionsThisMonth: number;
  stuntingFromVisits: number;
};

type DasawismaRow = {
  id: number;
  rt: string;
  rw: string;
  leaderName: string;
  memberCount: number;
  sessionCount: number;
};

type SessionRow = {
  id: number;
  sessionDate: string;
  location: string;
  dasawismaId: number | null;
  dasawisma: { label: string } | null;
  visitCount: number;
};

type VisitRow = {
  id: number;
  sessionId: number;
  sessionDate: string;
  sessionLocation: string;
  residentId: number;
  residentName: string;
  residentNik: string;
  weightKg: number | null;
  heightCm: number | null;
  isStunting: boolean;
  notes: string | null;
};

type StuntingResident = {
  id: number;
  name: string;
  nik: string;
  rt: string | null;
  rw: string | null;
  birthDate: string;
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
  const [stuntingResidents, setStuntingResidents] = useState<StuntingResident[]>([]);
  const [dasawisma, setDasawisma] = useState<DasawismaRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [residents, setResidents] = useState<ResidentOption[]>([]);

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

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, dasRes, sessRes, visitRes, resRes] = await Promise.all([
        fetchJson<{ stats: PkkStats; stuntingResidents: StuntingResident[] }>("/api/pkk/stats"),
        fetchJson<{ rows: DasawismaRow[] }>("/api/pkk/dasawisma"),
        fetchJson<{ rows: SessionRow[] }>("/api/pkk/posyandu/sessions"),
        fetchJson<{ rows: VisitRow[] }>("/api/pkk/posyandu/visits?stunting=1"),
        fetchJson<{ rows: Array<{ id: number; name: string; nik: string }> }>(
          "/api/residents?page=1&pageSize=200",
        ),
      ]);
      setStats(statsRes.stats);
      setStuntingResidents(statsRes.stuntingResidents);
      setDasawisma(dasRes.rows);
      setSessions(sessRes.rows);
      setVisits(visitRes.rows);
      setResidents(
        resRes.rows.map((r) => ({ id: r.id, name: r.name, nik: r.nik })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data PKK");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

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

            <Card>
              <CardHeader>
                <CardTitle>Daftar Dasawisma</CardTitle>
              </CardHeader>
              <CardContent>
                {dasawisma.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada data dasawisma.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>RT/RW</TableHead>
                        <TableHead>Ketua</TableHead>
                        <TableHead>Anggota</TableHead>
                        <TableHead>Sesi Posyandu</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dasawisma.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell>
                            RT {d.rt} / RW {d.rw}
                          </TableCell>
                          <TableCell>{d.leaderName}</TableCell>
                          <TableCell>{d.memberCount}</TableCell>
                          <TableCell>{d.sessionCount}</TableCell>
                          <TableCell className="text-right">
                            <Can resource="pkk" action="delete">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={saving}
                                onClick={() => void handleDeleteDasawisma(d.id)}
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

          <TabsContent value="posyandu" className="space-y-4">
            <Can resource="pkk" action="create">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setSessionDialog(true)}>Tambah Sesi</Button>
                <Button variant="outline" onClick={() => setVisitDialog(true)}>
                  Catat Kunjungan
                </Button>
              </div>
            </Can>

            <Card>
              <CardHeader>
                <CardTitle>Sesi Posyandu</CardTitle>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada sesi posyandu.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Lokasi</TableHead>
                        <TableHead>Dasawisma</TableHead>
                        <TableHead>Kunjungan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.sessionDate}</TableCell>
                          <TableCell>{s.location}</TableCell>
                          <TableCell>{s.dasawisma?.label ?? "—"}</TableCell>
                          <TableCell>{s.visitCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stunting" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Balita Stunting (data warga)</CardTitle>
              </CardHeader>
              <CardContent>
                {stuntingResidents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Tidak ada warga dengan flag stunting.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>NIK</TableHead>
                        <TableHead>RT/RW</TableHead>
                        <TableHead>Tgl Lahir</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stuntingResidents.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.name}</TableCell>
                          <TableCell>{r.nik}</TableCell>
                          <TableCell>
                            {r.rt && r.rw ? `RT ${r.rt} / RW ${r.rw}` : "—"}
                          </TableCell>
                          <TableCell>{r.birthDate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kunjungan Posyandu — Stunting</CardTitle>
              </CardHeader>
              <CardContent>
                {visits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Belum ada kunjungan dengan flag stunting.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal Sesi</TableHead>
                        <TableHead>Warga</TableHead>
                        <TableHead>Berat (kg)</TableHead>
                        <TableHead>Tinggi (cm)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visits.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell>{v.sessionDate}</TableCell>
                          <TableCell>{v.residentName}</TableCell>
                          <TableCell>{v.weightKg ?? "—"}</TableCell>
                          <TableCell>{v.heightCm ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
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
                    {dasawisma.map((d) => (
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
                    {sessions.map((s) => (
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
