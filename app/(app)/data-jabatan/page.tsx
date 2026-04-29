"use client";

import { useEffect, useState } from "react";
import { usePersistedTab } from "@/hooks/usePersistedTab";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Award,
  Users,
  TrendingUp,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormDialog } from "@/components/app/data-jabatan";

interface Jabatan {
  id: number;
  name: string;
  level: number;
  description: string | null;
  salary: number | null;
  allowance: number | null;
  total_staff: number;
  isActive: boolean;
}

function formatCurrency(value: number | null) {
  if (!value) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

const getLevelBadgeVariant = (
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

const DATA_JABATAN_VIEW_TABS = ["table", "hierarchy"] as const;

export function DataJabatan() {
  const [viewTab, setViewTab] = usePersistedTab(
    "data-jabatan",
    "table",
    DATA_JABATAN_VIEW_TABS
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [jabatanList, setJabatanList] = useState<Jabatan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadJabatan = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ page: "1", pageSize: "100" });
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/positions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch positions");
      const data: { rows: Jabatan[] } = await res.json();

      setJabatanList(data.rows);
    } catch (error) {
      console.error("Gagal memuat data jabatan:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJabatan();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const filteredData = jabatanList;

  // Calculate statistics
  const totalJabatan = jabatanList.length;
  const filledPositions = jabatanList.filter((j) => j.total_staff > 0).length;
  const totalStaff = jabatanList.reduce((sum, j) => sum + j.total_staff, 0);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Jabatan</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? "Memuat..." : totalJabatan}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Jabatan Terisi</p>
                <p className="text-2xl font-semibold">{filledPositions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pegawai</p>
                <p className="text-2xl font-semibold">{totalStaff}</p>
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
                  placeholder="Cari nama jabatan atau deskripsi..."
                  className="pl-10 bg-input-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                className="gap-2 bg-primary hover:bg-primary/90"
                onClick={() => setShowFormDialog(true)}
              >
                <Plus className="h-4 w-4" />
                Tambah Jabatan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={viewTab} onValueChange={setViewTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:w-105">
          <TabsTrigger value="table">Daftar Jabatan</TabsTrigger>
          <TabsTrigger value="hierarchy">Bagan Hirarki</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Jabatan</CardTitle>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? "Memuat data..."
                  : `Menampilkan ${filteredData.length} jabatan`}
              </p>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12.5">#</TableHead>
                      <TableHead>Nama Jabatan</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Gaji Pokok</TableHead>
                      <TableHead>Tunjangan</TableHead>
                      <TableHead>Jumlah Pegawai</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center py-8 text-muted-foreground"
                        >
                          Memuat data...
                        </TableCell>
                      </TableRow>
                    ) : filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center py-8 text-muted-foreground"
                        >
                          Tidak ada data yang ditemukan
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((jabatan, index) => (
                        <TableRow key={jabatan.id} className="hover:bg-muted/50">
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">
                            {jabatan.name}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-md">
                            {jabatan.description || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getLevelBadgeVariant(jabatan.level)}>
                              {getLevelName(jabatan.level)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatCurrency(jabatan.salary)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatCurrency(jabatan.allowance)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              <Users className="h-3 w-3" />
                              {jabatan.total_staff}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={jabatan.isActive ? "default" : "secondary"}
                            >
                              {jabatan.isActive ? "Aktif" : "Tidak Aktif"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
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
              <CardTitle>Bagan Hirarki Organisasi</CardTitle>
              <p className="text-sm text-muted-foreground">
                Visualisasi struktur jabatan berdasarkan level organisasi
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Memuat data...</p>
              ) : jabatanList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada data jabatan untuk ditampilkan.
                </p>
              ) : (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((level) => {
                    const levelItems = jabatanList.filter((j) => j.level === level);
                    if (levelItems.length === 0) return null;

                    return (
                      <div key={level} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={getLevelBadgeVariant(level)}>
                            Level {level}
                          </Badge>
                          <p className="text-sm font-medium">{getLevelName(level)}</p>
                          <div className="h-px flex-1 bg-border" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {levelItems.map((jabatan) => (
                            <div
                              key={jabatan.id}
                              className="rounded-lg border bg-muted/30 p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium text-sm">{jabatan.name}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {jabatan.description || "Tanpa deskripsi"}
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-xs whitespace-nowrap">
                                  {jabatan.total_staff} Pegawai
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>

                        {level < 5 && (
                          <div className="flex justify-center py-1">
                            <div className="h-6 w-px bg-border" />
                          </div>
                        )}
                      </div>
                    );
                  })}
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
        onSuccess={() => loadJabatan()}
      />
    </div>
  );
}
export default DataJabatan;
