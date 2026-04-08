"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Search,
  Download,
  Upload,
  Plus,
  Edit,
  Trash2,
  Eye,
  Shield,
  Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { calculateAge } from "@/utils";
import { FormDialog } from "@/components/app/data-perangkat";
import { toast } from "sonner";

interface Position {
  id: number;
  name: string;
  level: number;
}

interface OfficialRow {
  id: number;
  name: string;
  nik: string;
  supervisorId?: number | null;
  photoUrl?: string | null;
  email: string | null;
  phone: string | null;
  gender: "M" | "F";
  birthplace: string;
  birthDate: string | null;
  address: string;
  status: string;
  education: string | null;
  position: Position | null;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

const getPositionBadgeVariant = (
  level: number
): "default" | "secondary" | "outline" => {
  if (level === 1) return "default";
  if (level === 2) return "secondary";
  return "outline";
};

const getLevelName = (level: number): string => {
  const levelMap: Record<number, string> = {
    1: "Pimpinan",
    2: "Sekretariat",
    3: "Kaur/Kasi",
    4: "Kepala Dusun",
    5: "Staf",
  };

  return levelMap[level] || "Lainnya";
};

function supervisorIdNum(o: OfficialRow): number | null {
  const s = o.supervisorId;
  if (s === null || s === undefined) return null;
  const n = typeof s === "number" ? s : Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Pohon dari supervisorId; tanpa atasan valid di data → diperlakukan sebagai akar. */
function buildOfficialTree(officials: OfficialRow[]) {
  const byId = new Map(officials.map((o) => [o.id, o]));
  const childrenByParentId = new Map<number, OfficialRow[]>();
  const roots: OfficialRow[] = [];

  for (const o of officials) {
    const sid = supervisorIdNum(o);
    if (sid !== null && sid !== o.id && byId.has(sid)) {
      if (!childrenByParentId.has(sid)) childrenByParentId.set(sid, []);
      childrenByParentId.get(sid)!.push(o);
    } else {
      roots.push(o);
    }
  }

  for (const list of childrenByParentId.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "id"));
  }
  roots.sort((a, b) => a.name.localeCompare(b.name, "id"));

  return { roots, childrenByParentId };
}

function HierarchyOfficialCard({
  official,
  onDetail,
  onEdit,
}: {
  official: OfficialRow;
  onDetail: (o: OfficialRow) => void;
  onEdit: (o: OfficialRow) => void;
}) {
  return (
    <div className="w-[min(100%,280px)] rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          {official.photoUrl ? (
            <Image
              src={official.photoUrl}
              alt={official.name}
              width={44}
              height={44}
              draggable={false}
              className="h-11 w-11 shrink-0 rounded-full border object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-muted text-sm font-semibold text-muted-foreground">
              {official.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{official.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {official.position?.name ?? "Tanpa Jabatan"}
            </p>
            <p className="text-[11px] text-primary">
              {`Level ${official.position?.level ?? 5} · ${getLevelName(official.position?.level ?? 5)}`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onDetail(official)}
            aria-label="Detail"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(official)}
            aria-label="Edit"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function HierarchyTreeBranch({
  official,
  childrenByParentId,
  onDetail,
  onEdit,
}: {
  official: OfficialRow;
  childrenByParentId: Map<number, OfficialRow[]>;
  onDetail: (o: OfficialRow) => void;
  onEdit: (o: OfficialRow) => void;
}) {
  const children = childrenByParentId.get(official.id) ?? [];
  return (
    <li className="flex flex-col items-center">
      <HierarchyOfficialCard official={official} onDetail={onDetail} onEdit={onEdit} />
      {children.length > 0 && (
        <ul className="mt-3 flex list-none flex-wrap justify-center gap-x-6 gap-y-6 border-t border-primary/25 pt-3 pl-0">
          {children.map((child) => (
            <HierarchyTreeBranch
              key={child.id}
              official={child}
              childrenByParentId={childrenByParentId}
              onDetail={onDetail}
              onEdit={onEdit}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function DataPerangkat() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPosition, setFilterPosition] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [officials, setOfficials] = useState<OfficialRow[]>([]);
  const [totalPerangkat, setTotalPerangkat] = useState(0);
  const [activePerangkat, setActivePerangkat] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOfficial, setSelectedOfficial] = useState<OfficialRow | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    status: "ACTIVE",
    positionId: "",
    supervisorId: "none",
    address: "",
  });

  const loadOfficials = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ page: "1", pageSize: "100" });
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (filterPosition !== "all") params.set("positionId", filterPosition);
      if (filterStatus !== "all") params.set("status", filterStatus);

      const res = await fetch(`/api/officials?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch officials");
      const data: {
        rows: OfficialRow[];
        positions: Position[];
        total: number;
        activeCount: number;
      } = await res.json();

      setOfficials(data.rows);
      setPositions(data.positions);
      setTotalPerangkat(data.total);
      setActivePerangkat(data.activeCount);
    } catch (error) {
      console.error("Gagal memuat data perangkat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadOfficials();
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterPosition, filterStatus]);

  const filteredData = officials;

  const officialTree = useMemo(() => buildOfficialTree(officials), [officials]);

  const openDetail = (official: OfficialRow) => {
    setSelectedOfficial(official);
    setShowDetailDialog(true);
  };

  const openEdit = (official: OfficialRow) => {
    setSelectedOfficial(official);
    setEditForm({
      name: official.name,
      phone: official.phone ?? "",
      email: official.email ?? "",
      status: official.status?.toUpperCase() === "ACTIVE" ? "ACTIVE" : "INACTIVE",
      positionId: official.position?.id?.toString() ?? "",
      supervisorId:
        official.supervisorId === null || official.supervisorId === undefined
          ? "none"
          : official.supervisorId.toString(),
      address: official.address ?? "",
    });
    setShowEditDialog(true);
  };

  const handleDelete = async (official: OfficialRow) => {
    const confirmed = window.confirm(
      `Hapus perangkat ${official.name}? Tindakan ini tidak bisa dibatalkan.`
    );
    if (!confirmed) return;

    try {
      setIsSubmittingAction(true);
      const res = await fetch(`/api/officials/${official.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menghapus perangkat");
      }

      toast.success("Perangkat berhasil dihapus");
      await loadOfficials();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      toast.error(message);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedOfficial) return;
    if (!editForm.name.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    if (!editForm.positionId) {
      toast.error("Jabatan wajib dipilih");
      return;
    }

    try {
      setIsSubmittingAction(true);
      const res = await fetch(`/api/officials/${selectedOfficial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          phone_number: editForm.phone || null,
          email: editForm.email || null,
          status: editForm.status,
          village_staff_position_id: editForm.positionId,
          supervisor_id: editForm.supervisorId === "none" ? null : Number(editForm.supervisorId),
          address: editForm.address,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal memperbarui perangkat");
      }

      toast.success("Perangkat berhasil diperbarui");
      setShowEditDialog(false);
      setSelectedOfficial(null);
      await loadOfficials();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      toast.error(message);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const editSupervisorCandidates = useMemo(() => {
    const selectedLevel =
      positions.find((position) => position.id.toString() === editForm.positionId)?.level ?? 5;

    return officials
      .filter((official) => official.id !== selectedOfficial?.id)
      .filter((official) => (official.position?.level ?? 5) < selectedLevel)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [editForm.positionId, positions, officials, selectedOfficial]);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Perangkat</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? "Memuat..." : formatNumber(totalPerangkat)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Award className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Perangkat Aktif</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? "Memuat..." : formatNumber(activePerangkat)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Award className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Jabatan</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? "Memuat..." : formatNumber(positions.length)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama atau NIK..."
                  className="pl-10 bg-input-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={filterPosition} onValueChange={setFilterPosition}>
                <SelectTrigger className="w-50">
                  <SelectValue placeholder="Jabatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jabatan</SelectItem>
                  {positions.length === 0 ? (
                    <SelectItem value="no-positions" disabled>
                      Tidak ada jabatan tersedia
                    </SelectItem>
                  ) : (
                    positions.map((position) => (
                      <SelectItem
                        key={position.id}
                        value={position.id.toString()}
                      >
                        {position.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="ACTIVE">Aktif</SelectItem>
                  <SelectItem value="INACTIVE">Tidak Aktif</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>

              <Button variant="outline" className="gap-2 hidden">
                <Upload className="h-4 w-4" />
                Upload Excel
              </Button>

              <Button
                className="gap-2 bg-primary hover:bg-primary/90"
                onClick={() => setShowFormDialog(true)}
              >
                <Plus className="h-4 w-4" />
                Tambah Perangkat
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="table" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:w-105">
          <TabsTrigger value="table">Daftar Perangkat</TabsTrigger>
          <TabsTrigger value="hierarchy">Bagan Hirarki</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Perangkat Desa</CardTitle>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? "Memuat data perangkat..."
                  : `Menampilkan ${filteredData.length} dari ${totalPerangkat} perangkat desa`}
              </p>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12.5">#</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>NIK</TableHead>
                      <TableHead>Jabatan</TableHead>
                      <TableHead>Jenis Kelamin</TableHead>
                      <TableHead>Usia</TableHead>
                      <TableHead>Pendidikan</TableHead>
                      <TableHead>No. Telepon</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className="text-center py-8 text-muted-foreground"
                        >
                          {isLoading
                            ? "Memuat data perangkat..."
                            : "Tidak ada data yang ditemukan"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((perangkat, index) => (
                        <TableRow key={perangkat.id} className="hover:bg-muted/50">
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">
                            {perangkat.name}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {perangkat.nik}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getPositionBadgeVariant(
                                perangkat.position?.level || 5
                              )}
                            >
                              {perangkat.position?.name ?? "Tidak Diketahui"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                perangkat.gender === "M" ? "default" : "secondary"
                              }
                            >
                              {perangkat.gender === "M" ? "Laki-laki" : "Perempuan"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {perangkat.birthDate
                              ? `${calculateAge(perangkat.birthDate)} Tahun`
                              : "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {perangkat.education || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {perangkat.phone || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                perangkat.status?.toLowerCase() === "active"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {perangkat.status?.toLowerCase() === "active"
                                ? "Aktif"
                                : "Tidak Aktif"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => openDetail(perangkat)}
                                disabled={isSubmittingAction}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-600 hover:text-amber-600 hover:bg-amber-50"
                                onClick={() => openEdit(perangkat)}
                                disabled={isSubmittingAction}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(perangkat)}
                                disabled={isSubmittingAction}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">Halaman 1 dari 1</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hierarchy">
          <Card>
            <CardHeader>
              <CardTitle>Bagan Hirarki Perangkat Desa</CardTitle>
              <p className="text-sm text-muted-foreground">
                Struktur dari relasi atasan (field atasan di data perangkat). Tanpa atasan yang valid
                di data, perangkat ditampilkan sebagai baris teratas.
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Memuat data bagan...</p>
              ) : officials.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada data perangkat untuk ditampilkan di bagan.
                </p>
              ) : (
                <div className="max-h-[min(70vh,720px)] min-h-[240px] w-full overflow-auto rounded-lg border bg-muted/20 p-4">
                  <ul className="m-0 flex list-none flex-wrap justify-center gap-8 gap-y-10 p-0">
                    {officialTree.roots.map((root) => (
                      <HierarchyTreeBranch
                        key={root.id}
                        official={root}
                        childrenByParentId={officialTree.childrenByParentId}
                        onDetail={openDetail}
                        onEdit={openEdit}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <FormDialog
        showFormDialog={showFormDialog}
        setShowFormDialog={setShowFormDialog}
        positions={positions}
        officials={officials}
        onSuccess={() => loadOfficials()}
      />

      <Dialog
        open={showDetailDialog && !!selectedOfficial}
        onOpenChange={(open) => {
          setShowDetailDialog(open);
          if (!open) setSelectedOfficial(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Perangkat</DialogTitle>
            <DialogDescription>
              Informasi lengkap perangkat desa.
            </DialogDescription>
          </DialogHeader>

          {selectedOfficial && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-3">
                <p className="text-muted-foreground">Nama</p>
                <p className="col-span-2 font-medium">{selectedOfficial.name}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <p className="text-muted-foreground">NIK</p>
                <p className="col-span-2">{selectedOfficial.nik}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <p className="text-muted-foreground">Jabatan</p>
                <p className="col-span-2">{selectedOfficial.position?.name ?? "-"}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <p className="text-muted-foreground">Status</p>
                <p className="col-span-2">
                  {selectedOfficial.status?.toLowerCase() === "active"
                    ? "Aktif"
                    : "Tidak Aktif"}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <p className="text-muted-foreground">Email</p>
                <p className="col-span-2">{selectedOfficial.email || "-"}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <p className="text-muted-foreground">Telepon</p>
                <p className="col-span-2">{selectedOfficial.phone || "-"}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <p className="text-muted-foreground">Alamat</p>
                <p className="col-span-2">{selectedOfficial.address || "-"}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog && !!selectedOfficial} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Perangkat</DialogTitle>
            <DialogDescription>Perbarui data perangkat desa.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Nama</p>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Jabatan</p>
              <Select
                value={editForm.positionId}
                onValueChange={(value) =>
                  setEditForm((prev) => ({ ...prev, positionId: value, supervisorId: "none" }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Jabatan" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((position) => (
                    <SelectItem key={position.id} value={position.id.toString()}>
                      {position.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Atasan</p>
              <Select
                value={editForm.supervisorId}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, supervisorId: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Atasan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak Ada</SelectItem>
                  {editSupervisorCandidates.map((official) => (
                    <SelectItem key={official.id} value={official.id.toString()}>
                      {`${official.name} - ${official.position?.name ?? "Tanpa Jabatan"}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Status</p>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Aktif</SelectItem>
                  <SelectItem value="INACTIVE">Tidak Aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Email</p>
              <Input
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Telepon</p>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Alamat</p>
              <Textarea
                value={editForm.address}
                onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={isSubmittingAction}
            >
              Batal
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSubmittingAction}>
              {isSubmittingAction ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DataPerangkat;
