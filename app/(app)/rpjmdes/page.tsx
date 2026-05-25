"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Loader2,
  Map,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { AsyncState, MetricGrid, type MetricItem } from "@/components/app/patterns";
import { SdgGoalBadges, SdgGoalPicker } from "@/components/app/sdgs/SdgGoalPicker";
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

type PlanRow = {
  id: number;
  title: string;
  periodStart: number;
  periodEnd: number;
  status: string;
  activityCount: number;
  proposalCount: number;
};

type ActivityRow = {
  id: number;
  planId: number;
  title: string;
  year: number;
  priorityScore: number | null;
  sdgGoalIds: number[];
  status: string;
  source: string;
};

type ProposalRow = {
  id: number;
  proposerName: string;
  rt: string | null;
  rw: string | null;
  title: string;
  description: string;
  sdgGoalIds: number[];
  status: string;
  priorityScore: number | null;
};

type DashboardStats = {
  planCount: number;
  activityCount: number;
  proposalsSubmitted: number;
  proposalsApproved: number;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal memuat data");
  return data as T;
}

export default function RpjmdesPage() {
  const { appAlert } = useAppDialogs();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  const [planDialog, setPlanDialog] = useState(false);
  const [activityDialog, setActivityDialog] = useState(false);
  const [proposalDialog, setProposalDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [planForm, setPlanForm] = useState({
    title: "",
    periodStart: String(new Date().getFullYear()),
    periodEnd: String(new Date().getFullYear() + 5),
    vision: "",
    mission: "",
  });
  const [activityForm, setActivityForm] = useState({
    title: "",
    year: String(new Date().getFullYear()),
    description: "",
    sdgGoalIds: [] as number[],
  });
  const [proposalForm, setProposalForm] = useState({
    proposerName: "",
    rt: "",
    rw: "",
    title: "",
    description: "",
    sdgGoalIds: [] as number[],
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const planIdQ = selectedPlanId ? `?planId=${selectedPlanId}` : "";
      const [dash, planRes, actRes, propRes] = await Promise.all([
        fetchJson<{ stats: DashboardStats }>("/api/rpjmdes/dashboard"),
        fetchJson<{ rows: PlanRow[] }>("/api/rpjmdes/plans"),
        fetchJson<{ rows: ActivityRow[] }>(`/api/rpjmdes/activities${planIdQ}`),
        fetchJson<{ rows: ProposalRow[] }>("/api/rpjmdes/proposals"),
      ]);
      setStats(dash.stats);
      setPlans(planRes.rows);
      setActivities(actRes.rows);
      setProposals(propRes.rows);
      if (!selectedPlanId && planRes.rows.length > 0) {
        setSelectedPlanId(String(planRes.rows[0].id));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat RPJMDes");
    } finally {
      setLoading(false);
    }
  }, [selectedPlanId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const metrics = useMemo<MetricItem[]>(
    () => [
      {
        title: "Rencana RPJMDes",
        value: stats?.planCount ?? 0,
        icon: Map,
        accent: "blue",
        loading,
      },
      {
        title: "Kegiatan RKP",
        value: stats?.activityCount ?? 0,
        icon: ClipboardList,
        accent: "green",
        loading,
      },
      {
        title: "Usulan Musdes",
        value: stats?.proposalsSubmitted ?? 0,
        subtitle: `${stats?.proposalsApproved ?? 0} disetujui`,
        icon: Users,
        accent: "purple",
        loading,
      },
      {
        title: "Prioritas SDGs",
        value: activities.filter((a) => (a.priorityScore ?? 0) >= 60).length,
        subtitle: "Skor ≥ 60",
        icon: Target,
        accent: "warning",
        loading,
      },
    ],
    [stats, activities, loading],
  );

  const handleSavePlan = async () => {
    setSaving(true);
    try {
      await fetchJson("/api/rpjmdes/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: planForm.title,
          periodStart: Number(planForm.periodStart),
          periodEnd: Number(planForm.periodEnd),
          vision: planForm.vision || undefined,
          mission: planForm.mission || undefined,
          status: "active",
        }),
      });
      setPlanDialog(false);
      await loadAll();
      await appAlert({ title: "Berhasil", description: "Rencana RPJMDes ditambahkan." });
    } catch (e) {
      await appAlert({
        title: "Gagal",
        description: e instanceof Error ? e.message : "Gagal menyimpan",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveActivity = async () => {
    if (!selectedPlanId) {
      await appAlert({ title: "Perhatian", description: "Pilih rencana RPJMDes terlebih dahulu." });
      return;
    }
    setSaving(true);
    try {
      await fetchJson("/api/rpjmdes/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: Number(selectedPlanId),
          title: activityForm.title,
          year: Number(activityForm.year),
          description: activityForm.description || undefined,
          sdgGoalIds: activityForm.sdgGoalIds,
        }),
      });
      setActivityDialog(false);
      setActivityForm({
        title: "",
        year: String(new Date().getFullYear()),
        description: "",
        sdgGoalIds: [],
      });
      await loadAll();
      await appAlert({ title: "Berhasil", description: "Kegiatan RKP ditambahkan." });
    } catch (e) {
      await appAlert({
        title: "Gagal",
        description: e instanceof Error ? e.message : "Gagal menyimpan",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProposal = async () => {
    setSaving(true);
    try {
      await fetchJson("/api/rpjmdes/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlanId ? Number(selectedPlanId) : undefined,
          proposerName: proposalForm.proposerName,
          rt: proposalForm.rt || undefined,
          rw: proposalForm.rw || undefined,
          title: proposalForm.title,
          description: proposalForm.description,
          sdgGoalIds: proposalForm.sdgGoalIds,
        }),
      });
      setProposalDialog(false);
      setProposalForm({
        proposerName: "",
        rt: "",
        rw: "",
        title: "",
        description: "",
        sdgGoalIds: [],
      });
      await loadAll();
      await appAlert({ title: "Berhasil", description: "Usulan Musdes tercatat." });
    } catch (e) {
      await appAlert({
        title: "Gagal",
        description: e instanceof Error ? e.message : "Gagal menyimpan",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApproveProposal = async (id: number) => {
    setSaving(true);
    try {
      await fetchJson(`/api/rpjmdes/proposals/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: new Date().getFullYear() }),
      });
      await loadAll();
      await appAlert({ title: "Disetujui", description: "Usulan masuk ke RKPDes." });
    } catch (e) {
      await appAlert({
        title: "Gagal",
        description: e instanceof Error ? e.message : "Gagal menyetujui",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRejectProposal = async (id: number) => {
    setSaving(true);
    try {
      await fetchJson(`/api/rpjmdes/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      await loadAll();
    } catch (e) {
      await appAlert({
        title: "Gagal",
        description: e instanceof Error ? e.message : "Gagal menolak usulan",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteActivity = async (id: number) => {
    setSaving(true);
    try {
      await fetchJson(`/api/rpjmdes/activities/${id}`, { method: "DELETE" });
      await loadAll();
    } catch (e) {
      await appAlert({
        title: "Gagal",
        description: e instanceof Error ? e.message : "Gagal menghapus",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteActivity = async (id: number) => {
    setSaving(true);
    try {
      await fetchJson(`/api/rpjmdes/activities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      await loadAll();
    } catch (e) {
      await appAlert({
        title: "Gagal",
        description: e instanceof Error ? e.message : "Gagal memperbarui",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AsyncState loading={loading} error={error} onRetry={loadAll} loadingMessage="Memuat RPJMDes...">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">RPJMDes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Perencanaan pembangunan desa, usulan Musdes, dan prioritas berbasis skor SDGs.
          </p>
        </div>

        <MetricGrid items={metrics} columns={4} />

        <div className="flex flex-wrap items-center gap-3">
          <Label className="text-sm">Rencana aktif:</Label>
          <Select value={selectedPlanId || "none"} onValueChange={(v) => setSelectedPlanId(v === "none" ? "" : v)}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Pilih rencana" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.title} ({p.periodStart}–{p.periodEnd})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Can resource="rpjmdes" action="create">
            <Button variant="outline" onClick={() => setPlanDialog(true)}>
              Tambah Rencana
            </Button>
          </Can>
        </div>

        <Tabs defaultValue="activities" className="space-y-4">
          <TabsList>
            <TabsTrigger value="activities">Kegiatan RKP</TabsTrigger>
            <TabsTrigger value="proposals">Usulan Musdes</TabsTrigger>
            <TabsTrigger value="plans">Daftar Rencana</TabsTrigger>
          </TabsList>

          <TabsContent value="activities" className="space-y-4">
            <Can resource="rpjmdes" action="create">
              <Button onClick={() => setActivityDialog(true)}>Tambah Kegiatan</Button>
            </Can>
            <Card>
              <CardHeader>
                <CardTitle>Kegiatan RKPDes (urut prioritas SDGs)</CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada kegiatan.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kegiatan</TableHead>
                        <TableHead>Tahun</TableHead>
                        <TableHead>SDGs</TableHead>
                        <TableHead>Prioritas</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activities.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.title}</TableCell>
                          <TableCell>{a.year}</TableCell>
                          <TableCell>
                            <SdgGoalBadges ids={a.sdgGoalIds} />
                          </TableCell>
                          <TableCell>{a.priorityScore ?? "—"}</TableCell>
                          <TableCell>{a.status}</TableCell>
                          <TableCell className="text-right">
                            <Can resource="rpjmdes" action="update">
                              <div className="flex justify-end gap-1">
                                {a.status === "planned" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={saving}
                                    onClick={() => void handleCompleteActivity(a.id)}
                                  >
                                    Selesai
                                  </Button>
                                ) : null}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={saving}
                                  onClick={() => void handleDeleteActivity(a.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
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

          <TabsContent value="proposals" className="space-y-4">
            <Can resource="rpjmdes" action="create">
              <Button onClick={() => setProposalDialog(true)}>Usulan Warga / Musdes</Button>
            </Can>
            <Card>
              <CardHeader>
                <CardTitle>Usulan Musdes</CardTitle>
              </CardHeader>
              <CardContent>
                {proposals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada usulan.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Judul</TableHead>
                        <TableHead>Pengusul</TableHead>
                        <TableHead>RT/RW</TableHead>
                        <TableHead>SDGs</TableHead>
                        <TableHead>Prioritas</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {proposals.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.title}</TableCell>
                          <TableCell>{p.proposerName}</TableCell>
                          <TableCell>
                            {p.rt && p.rw ? `RT ${p.rt}/RW ${p.rw}` : "—"}
                          </TableCell>
                          <TableCell>
                            <SdgGoalBadges ids={p.sdgGoalIds} />
                          </TableCell>
                          <TableCell>{p.priorityScore ?? "—"}</TableCell>
                          <TableCell>{p.status}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {p.status === "submitted" ? (
                                <Can resource="rpjmdes" action="approve">
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={saving}
                                      onClick={() => void handleApproveProposal(p.id)}
                                    >
                                      Setujui
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled={saving}
                                      onClick={() => void handleRejectProposal(p.id)}
                                    >
                                      Tolak
                                    </Button>
                                  </>
                                </Can>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plans">
            <Card>
              <CardHeader>
                <CardTitle>Rencana RPJMDes</CardTitle>
              </CardHeader>
              <CardContent>
                {plans.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada rencana.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Judul</TableHead>
                        <TableHead>Periode</TableHead>
                        <TableHead>Kegiatan</TableHead>
                        <TableHead>Usulan</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.title}</TableCell>
                          <TableCell>
                            {p.periodStart}–{p.periodEnd}
                          </TableCell>
                          <TableCell>{p.activityCount}</TableCell>
                          <TableCell>{p.proposalCount}</TableCell>
                          <TableCell>{p.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={planDialog} onOpenChange={setPlanDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Tambah Rencana RPJMDes</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Judul</Label>
                <Input
                  value={planForm.title}
                  onChange={(e) => setPlanForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="RPJMDes 2025–2030"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tahun awal</Label>
                  <Input
                    type="number"
                    value={planForm.periodStart}
                    onChange={(e) => setPlanForm((f) => ({ ...f, periodStart: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tahun akhir</Label>
                  <Input
                    type="number"
                    value={planForm.periodEnd}
                    onChange={(e) => setPlanForm((f) => ({ ...f, periodEnd: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Visi (opsional)</Label>
                <Textarea
                  value={planForm.vision}
                  onChange={(e) => setPlanForm((f) => ({ ...f, vision: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPlanDialog(false)}>
                Batal
              </Button>
              <Button onClick={() => void handleSavePlan()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={activityDialog} onOpenChange={setActivityDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tambah Kegiatan RKP</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Judul kegiatan</Label>
                <Input
                  value={activityForm.title}
                  onChange={(e) => setActivityForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tahun pelaksanaan</Label>
                <Input
                  type="number"
                  value={activityForm.year}
                  onChange={(e) => setActivityForm((f) => ({ ...f, year: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tag SDGs</Label>
                <SdgGoalPicker
                  value={activityForm.sdgGoalIds}
                  onChange={(ids) => setActivityForm((f) => ({ ...f, sdgGoalIds: ids }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActivityDialog(false)}>
                Batal
              </Button>
              <Button onClick={() => void handleSaveActivity()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={proposalDialog} onOpenChange={setProposalDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Usulan Musdes / Warga</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Nama pengusul</Label>
                <Input
                  value={proposalForm.proposerName}
                  onChange={(e) =>
                    setProposalForm((f) => ({ ...f, proposerName: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>RT</Label>
                  <Input
                    value={proposalForm.rt}
                    onChange={(e) => setProposalForm((f) => ({ ...f, rt: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>RW</Label>
                  <Input
                    value={proposalForm.rw}
                    onChange={(e) => setProposalForm((f) => ({ ...f, rw: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Judul usulan</Label>
                <Input
                  value={proposalForm.title}
                  onChange={(e) => setProposalForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Textarea
                  value={proposalForm.description}
                  onChange={(e) =>
                    setProposalForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tag SDGs</Label>
                <SdgGoalPicker
                  value={proposalForm.sdgGoalIds}
                  onChange={(ids) => setProposalForm((f) => ({ ...f, sdgGoalIds: ids }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setProposalDialog(false)}>
                Batal
              </Button>
              <Button onClick={() => void handleSaveProposal()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kirim Usulan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AsyncState>
  );
}
