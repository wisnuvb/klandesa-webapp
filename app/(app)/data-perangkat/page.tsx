/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateAge } from "@/utils";
import { FormDialog } from "@/components/app/data-perangkat";

interface Position {
  id: number;
  name: string;
  level: number;
}

interface OfficialRow {
  id: number;
  name: string;
  nik: string;
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
  }, [searchQuery, filterPosition, filterStatus]);

  const filteredData = officials;

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
                <SelectTrigger className="w-[200px]">
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
                <SelectTrigger className="w-[160px]">
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

      {/* Table */}
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
                  <TableHead className="w-[50px]">#</TableHead>
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
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:text-amber-600 hover:bg-amber-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
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

          {/* Pagination */}
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

      {/* Form Dialog */}
      <FormDialog
        showFormDialog={showFormDialog}
        setShowFormDialog={setShowFormDialog}
        positions={positions}
        onSuccess={() => loadOfficials()}
      />
    </div>
  );
}

export default DataPerangkat;
