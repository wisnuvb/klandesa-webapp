"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Trash2,
  Eye,
  Users,
  Home,
  MapPin,
  Wheat,
  TreePine,
  Building2,
  Heart,
  MapPinned,
  Droplets,
  DollarSign,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  FileDown,
  Edit,
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
import { useAppDialogs } from "@/components/providers/AppDialogProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { FormDialog } from "@/components/app/potensi";

interface VillagePotential {
  id: number;
  villageId: number;
  year: string;
  population: number;
  households: number;
  area: number;
  agricultureLand: number;
  plantationLand: number;
  forestArea: number;
  educationFacilities: number;
  healthFacilities: number;
  tourismSpots: number;
  waterResources: string | null;
  economicPotential: string | null;
  createdAt: string;
  updatedAt: string;
}

export function PotensiDesa() {
  const { appConfirm } = useAppDialogs();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedPotential, setSelectedPotential] =
    useState<VillagePotential | null>(null);
  const [potentialList, setPotentialList] = useState<VillagePotential[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPotentials = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: "1",
        pageSize: "100",
      });

      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (filterYear !== "all") params.set("year", filterYear);

      const res = await fetch(`/api/village-potentials?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch village potentials");

      const data: { rows: VillagePotential[] } = await res.json();
      setPotentialList(data.rows);
    } catch (error) {
      console.error("Gagal memuat data potensi desa:", error);
      toast.error("Gagal memuat data potensi desa");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPotentials();
  }, [searchQuery, filterYear]);

  const handleViewDetail = (potential: VillagePotential) => {
    setSelectedPotential(potential);
    setShowDetailDialog(true);
  };

  const handleDelete = async (id: number) => {
    const ok = await appConfirm({
      title: "Hapus data potensi?",
      description: "Data potensi desa akan dihapus.",
      confirmLabel: "Hapus",
      tone: "destructive",
    });
    if (!ok) return;
    try {
        const res = await fetch(`/api/village-potentials/${id}`, {
          method: "DELETE",
        });

        if (!res.ok) throw new Error("Failed to delete");

        toast.success("Data potensi desa berhasil dihapus");
        loadPotentials();
      } catch (error) {
        console.error("Error deleting potential:", error);
        toast.error("Gagal menghapus data potensi desa");
      }
  };

  const uniqueYears = Array.from(
    new Set(potentialList.map((p) => p.year))
  ).sort((a, b) => parseInt(b) - parseInt(a));

  const latestData = potentialList.find((p) => p.year === uniqueYears[0]);

  const handleOpenEditModal = (potential: VillagePotential) => {
    setSelectedPotential(potential);
    setShowFormDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Populasi</p>
                <p className="text-2xl font-semibold">
                  {isLoading
                    ? "..."
                    : latestData?.population.toLocaleString() || "-"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tahun {latestData?.year || "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Home className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Kepala Keluarga</p>
                <p className="text-2xl font-semibold">
                  {isLoading
                    ? "..."
                    : latestData?.households.toLocaleString() || "-"}
                </p>
                <p className="text-xs text-muted-foreground">KK</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Luas Wilayah</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? "..." : latestData?.area.toLocaleString() || "-"}
                </p>
                <p className="text-xs text-muted-foreground">Hektar</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <MapPinned className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Objek Wisata</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? "..." : latestData?.tourismSpots || "-"}
                </p>
                <p className="text-xs text-muted-foreground">Lokasi</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wheat className="h-4 w-4 text-green-600" />
              Lahan Pertanian
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {isLoading
                ? "..."
                : latestData
                ? `${latestData.agricultureLand} Ha`
                : "-"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {latestData
                ? `${(
                    (latestData.agricultureLand / latestData.area) *
                    100
                  ).toFixed(1)}% dari total wilayah`
                : "-"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TreePine className="h-4 w-4 text-emerald-600" />
              Lahan Perkebunan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {isLoading
                ? "..."
                : latestData
                ? `${latestData.plantationLand} Ha`
                : "-"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {latestData
                ? `${(
                    (latestData.plantationLand / latestData.area) *
                    100
                  ).toFixed(1)}% dari total wilayah`
                : "-"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-teal-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TreePine className="h-4 w-4 text-teal-600" />
              Hutan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {isLoading
                ? "..."
                : latestData
                ? `${latestData.forestArea} Ha`
                : "-"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {latestData
                ? `${((latestData.forestArea / latestData.area) * 100).toFixed(
                    1
                  )}% dari total wilayah`
                : "-"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              Fasilitas Pendidikan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {isLoading ? "..." : latestData?.educationFacilities || "-"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sekolah/Lembaga Pendidikan
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-600" />
              Fasilitas Kesehatan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {isLoading ? "..." : latestData?.healthFacilities || "-"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Puskesmas/Posyandu/Klinik
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Droplets className="h-4 w-4 text-cyan-600" />
              Sumber Air
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium line-clamp-2">
              {isLoading ? "..." : latestData?.waterResources || "-"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sumber daya air
            </p>
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
                  placeholder="Cari tahun atau potensi ekonomi..."
                  className="pl-10 bg-input-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tahun</SelectItem>
                  {uniqueYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      Tahun {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Download
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    <span>Download Excel</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span>Download CSV</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <FileDown className="h-4 w-4 text-red-600" />
                    <span>Download PDF</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                className="gap-2 bg-primary hover:bg-primary/90"
                onClick={() => setShowFormDialog(true)}
              >
                <Plus className="h-4 w-4" />
                Tambah Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Data Potensi Desa</CardTitle>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Memuat data..."
              : `Menampilkan ${potentialList.length} data potensi desa`}
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12.5">#</TableHead>
                  <TableHead>Tahun</TableHead>
                  <TableHead>Populasi</TableHead>
                  <TableHead>KK</TableHead>
                  <TableHead>Luas (Ha)</TableHead>
                  <TableHead>Lahan Pertanian</TableHead>
                  <TableHead>Perkebunan</TableHead>
                  <TableHead>Hutan</TableHead>
                  <TableHead>Pendidikan</TableHead>
                  <TableHead>Kesehatan</TableHead>
                  <TableHead>Wisata</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={12}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : potentialList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={12}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Tidak ada data yang ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  potentialList.map((potential, index) => (
                    <TableRow key={potential.id} className="hover:bg-muted/50">
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        <Badge variant="default">{potential.year}</Badge>
                      </TableCell>
                      <TableCell>
                        {potential.population.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {potential.households.toLocaleString()}
                      </TableCell>
                      <TableCell>{potential.area.toLocaleString()}</TableCell>
                      <TableCell>{potential.agricultureLand} Ha</TableCell>
                      <TableCell>{potential.plantationLand} Ha</TableCell>
                      <TableCell>{potential.forestArea} Ha</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {potential.educationFacilities}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {potential.healthFacilities}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {potential.tourismSpots}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => handleViewDetail(potential)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenEditModal(potential)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(potential.id)}
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
        onSuccess={() => loadPotentials()}
      />

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Detail Potensi Desa - Tahun {selectedPotential?.year}
            </DialogTitle>
            <DialogDescription>
              Informasi lengkap tentang potensi desa untuk tahun{" "}
              {selectedPotential?.year}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-2">
            <div className="space-y-6">
              {/* Demografi */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2 text-primary">
                  <Users className="h-5 w-5" />
                  Demografi
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Jumlah Penduduk
                    </p>
                    <p className="text-xl font-semibold">
                      {selectedPotential?.population.toLocaleString()} Jiwa
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Kepala Keluarga
                    </p>
                    <p className="text-xl font-semibold">
                      {selectedPotential?.households.toLocaleString()} KK
                    </p>
                  </div>
                </div>
              </div>

              {/* Wilayah */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2 text-primary">
                  <MapPin className="h-5 w-5" />
                  Luas Wilayah
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Luas Total</p>
                    <p className="text-xl font-semibold">
                      {selectedPotential?.area.toLocaleString()} Ha
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Lahan Pertanian
                    </p>
                    <p className="text-xl font-semibold">
                      {selectedPotential?.agricultureLand.toLocaleString()} Ha
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Lahan Perkebunan
                    </p>
                    <p className="text-xl font-semibold">
                      {selectedPotential?.plantationLand.toLocaleString()} Ha
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Hutan</p>
                    <p className="text-xl font-semibold">
                      {selectedPotential?.forestArea.toLocaleString()} Ha
                    </p>
                  </div>
                </div>
              </div>

              {/* Fasilitas */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2 text-primary">
                  <Building2 className="h-5 w-5" />
                  Fasilitas Umum
                </h3>
                <div className="grid grid-cols-3 gap-4 bg-muted/50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Pendidikan</p>
                    <p className="text-xl font-semibold">
                      {selectedPotential?.educationFacilities} Unit
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Kesehatan</p>
                    <p className="text-xl font-semibold">
                      {selectedPotential?.healthFacilities} Unit
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Objek Wisata
                    </p>
                    <p className="text-xl font-semibold">
                      {selectedPotential?.tourismSpots} Lokasi
                    </p>
                  </div>
                </div>
              </div>

              {/* Sumber Daya */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2 text-primary">
                  <Droplets className="h-5 w-5" />
                  Sumber Daya Air
                </h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">
                    {selectedPotential?.waterResources || "-"}
                  </p>
                </div>
              </div>

              {/* Potensi Ekonomi */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2 text-primary">
                  <DollarSign className="h-5 w-5" />
                  Potensi Ekonomi
                </h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">
                    {selectedPotential?.economicPotential || "-"}
                  </p>
                </div>
              </div>

              {/* Metadata */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                  <div>
                    <p>
                      Dibuat:{" "}
                      {selectedPotential?.createdAt
                        ? new Date(
                            selectedPotential.createdAt
                          ).toLocaleDateString("id-ID", {
                            dateStyle: "long",
                          })
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p>
                      Diperbarui:{" "}
                      {selectedPotential?.updatedAt
                        ? new Date(
                            selectedPotential.updatedAt
                          ).toLocaleDateString("id-ID", {
                            dateStyle: "long",
                          })
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDetailDialog(false)}
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PotensiDesa;
