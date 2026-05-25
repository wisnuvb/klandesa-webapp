"use client";

import { useCallback, useEffect, useState } from "react";
import { HandHeart, Loader2, MessageSquarePlus, Users } from "lucide-react";
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

type ActivityRow = {
  id: number;
  rt: string;
  rw: string;
  title: string;
  activityType: string;
  activityDate: string;
  participantCount: number;
  sdgGoalIds: number[];
  status: string;
};

type ProposalRow = {
  id: number;
  proposerName: string;
  title: string;
  proposalType: string;
  status: string;
  sdgGoalIds: number[];
  rt: string | null;
  rw: string | null;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal memuat data");
  return data as T;
}

const ACTIVITY_TYPES = [
  { value: "gotong_royong", label: "Gotong royong" },
  { value: "lpj", label: "LPJ RT/RW" },
  { value: "social", label: "Kegiatan sosial" },
  { value: "other", label: "Lainnya" },
];

export default function PartisipasiRtrwPage() {
  const { appAlert } = useAppDialogs();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [activityDialog, setActivityDialog] = useState(false);
  const [proposalDialog, setProposalDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [activityForm, setActivityForm] = useState({
    rt: "",
    rw: "",
    title: "",
    activityType: "gotong_royong",
    activityDate: new Date().toISOString().slice(0, 10),
    participantCount: "0",
    sdgGoalIds: [] as number[],
  });
  const [proposalForm, setProposalForm] = useState({
    proposerName: "",
    rt: "",
    rw: "",
    title: "",
    description: "",
    proposalType: "infrastructure",
    sdgGoalIds: [] as number[],
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [actRes, propRes] = await Promise.all([
        fetchJson<{ rows: ActivityRow[] }>("/api/rtrw/activities"),
        fetchJson<{ rows: ProposalRow[] }>("/api/rtrw/proposals"),
      ]);
      setActivities(actRes.rows);
      setProposals(propRes.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat partisipasi RT/RW");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const metrics: MetricItem[] = [
    {
      title: "Kegiatan RT/RW",
      value: activities.length,
      icon: Users,
      accent: "blue",
      loading,
    },
    {
      title: "Gotong Royong",
      value: activities.filter((a) => a.activityType === "gotong_royong").length,
      icon: HandHeart,
      accent: "green",
      loading,
    },
    {
      title: "Usulan Warga",
      value: proposals.length,
      icon: MessageSquarePlus,
      accent: "purple",
      loading,
    },
    {
      title: "Peserta (total)",
      value: activities.reduce((s, a) => s + a.participantCount, 0),
      icon: Users,
      accent: "warning",
      loading,
    },
  ];

  const handleSaveActivity = async () => {
    setSaving(true);
    try {
      await fetchJson("/api/rtrw/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rt: activityForm.rt,
          rw: activityForm.rw,
          title: activityForm.title,
          activityType: activityForm.activityType,
          activityDate: activityForm.activityDate,
          participantCount: Number(activityForm.participantCount) || 0,
          sdgGoalIds: activityForm.sdgGoalIds,
        }),
      });
      setActivityDialog(false);
      await loadAll();
      await appAlert({ title: "Berhasil", description: "Kegiatan RT/RW tercatat." });
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
      await fetchJson("/api/rtrw/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proposalForm),
      });
      setProposalDialog(false);
      await loadAll();
      await appAlert({ title: "Berhasil", description: "Usulan warga tercatat." });
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
    <AsyncState
      loading={loading}
      error={error}
      onRetry={loadAll}
      loadingMessage="Memuat partisipasi RT/RW..."
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Partisipasi RT/RW</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gotong royong, LPJ, dan usulan warga per RT/RW.
          </p>
        </div>

        <MetricGrid items={metrics} columns={4} />

        <Tabs defaultValue="activities" className="space-y-4">
          <TabsList>
            <TabsTrigger value="activities">Kegiatan</TabsTrigger>
            <TabsTrigger value="proposals">Usulan Warga</TabsTrigger>
          </TabsList>

          <TabsContent value="activities" className="space-y-4">
            <Can resource="rtrw" action="create">
              <Button onClick={() => setActivityDialog(true)}>Tambah Kegiatan</Button>
            </Can>
            <Card>
              <CardHeader>
                <CardTitle>Kegiatan RT/RW</CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada kegiatan.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Judul</TableHead>
                        <TableHead>RT/RW</TableHead>
                        <TableHead>Jenis</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Peserta</TableHead>
                        <TableHead>SDGs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activities.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.title}</TableCell>
                          <TableCell>
                            RT {a.rt}/RW {a.rw}
                          </TableCell>
                          <TableCell>{a.activityType}</TableCell>
                          <TableCell>{a.activityDate}</TableCell>
                          <TableCell>{a.participantCount}</TableCell>
                          <TableCell>
                            <SdgGoalBadges ids={a.sdgGoalIds} />
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
            <Can resource="rtrw" action="create">
              <Button onClick={() => setProposalDialog(true)}>Usulan Warga</Button>
            </Can>
            <Card>
              <CardHeader>
                <CardTitle>Usulan Masyarakat RT/RW</CardTitle>
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
                        <TableHead>Jenis</TableHead>
                        <TableHead>SDGs</TableHead>
                        <TableHead>Status</TableHead>
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
                          <TableCell>{p.proposalType}</TableCell>
                          <TableCell>
                            <SdgGoalBadges ids={p.sdgGoalIds} />
                          </TableCell>
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

        <Dialog open={activityDialog} onOpenChange={setActivityDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tambah Kegiatan RT/RW</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>RT</Label>
                  <Input
                    value={activityForm.rt}
                    onChange={(e) => setActivityForm((f) => ({ ...f, rt: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>RW</Label>
                  <Input
                    value={activityForm.rw}
                    onChange={(e) => setActivityForm((f) => ({ ...f, rw: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Judul</Label>
                <Input
                  value={activityForm.title}
                  onChange={(e) => setActivityForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Jenis kegiatan</Label>
                <Select
                  value={activityForm.activityType}
                  onValueChange={(v) => setActivityForm((f) => ({ ...f, activityType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input
                  type="date"
                  value={activityForm.activityDate}
                  onChange={(e) =>
                    setActivityForm((f) => ({ ...f, activityDate: e.target.value }))
                  }
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
              <DialogTitle>Usulan Warga RT/RW</DialogTitle>
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
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kirim"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AsyncState>
  );
}
