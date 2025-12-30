"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  TrendingUp,
  Wallet,
  PieChart,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  FileDown,
  Building,
  Users,
  Heart,
  GraduationCap,
  Wheat,
  HandHeart,
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface VillageBudget {
  id: number;
  village_id: number;
  year: number;
  revenue: number;
  government_fund: number;
  district_fund: number;
  province_fund: number;
  local_income: number;
  community_contribution: number;
  private_sector_contribution: number;
  total_expenditure: number;
  infrastructure_realization: number;
  health_realization: number;
  education_realization: number;
  agriculture_realization: number;
  social_realization: number;
  employee_realization: number;
  employee_budget: number;
  infrastructure_budget: number;
  health_budget: number;
  education_budget: number;
  agriculture_budget: number;
  social_budget: number;
  remaining_budget: number;
  created_at: string;
  updated_at: string;
}

const mockData: VillageBudget[] = [
  {
    id: 1,
    village_id: 2,
    year: 2024,
    revenue: 1000000000,
    government_fund: 500000000,
    district_fund: 100000000,
    province_fund: 200000000,
    local_income: 300000000,
    community_contribution: 50000000,
    private_sector_contribution: 0,
    total_expenditure: 750000000,
    infrastructure_realization: 75000000,
    health_realization: 15000000,
    education_realization: 14000000,
    agriculture_realization: 65000000,
    social_realization: 45000000,
    employee_realization: 350000000,
    employee_budget: 500000000,
    infrastructure_budget: 250000000,
    health_budget: 200000000,
    education_budget: 75000000,
    agriculture_budget: 70000000,
    social_budget: 50000000,
    remaining_budget: 250000000,
    created_at: "2024-10-12 10:11:34",
    updated_at: "2024-10-12 10:11:34",
  },
  {
    id: 2,
    village_id: 2,
    year: 2023,
    revenue: 900000000,
    government_fund: 450000000,
    district_fund: 90000000,
    province_fund: 180000000,
    local_income: 250000000,
    community_contribution: 30000000,
    private_sector_contribution: 0,
    total_expenditure: 820000000,
    infrastructure_realization: 180000000,
    health_realization: 150000000,
    education_realization: 60000000,
    agriculture_realization: 55000000,
    social_realization: 40000000,
    employee_realization: 335000000,
    employee_budget: 400000000,
    infrastructure_budget: 200000000,
    health_budget: 170000000,
    education_budget: 65000000,
    agriculture_budget: 60000000,
    social_budget: 45000000,
    remaining_budget: 80000000,
    created_at: "2023-01-10 08:00:00",
    updated_at: "2023-12-20 16:30:00",
  },
];

export function Anggaran() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<VillageBudget | null>(
    null
  );
  const [formData, setFormData] = useState({
    year: new Date().getFullYear().toString(),
    revenue: "",
    government_fund: "",
    district_fund: "",
    province_fund: "",
    local_income: "",
    community_contribution: "",
    private_sector_contribution: "",
    employee_budget: "",
    infrastructure_budget: "",
    health_budget: "",
    education_budget: "",
    agriculture_budget: "",
    social_budget: "",
    employee_realization: "",
    infrastructure_realization: "",
    health_realization: "",
    education_realization: "",
    agriculture_realization: "",
    social_realization: "",
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatShortCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `Rp ${(value / 1000000000).toFixed(1)} M`;
    } else if (value >= 1000000) {
      return `Rp ${(value / 1000000).toFixed(1)} Jt`;
    }
    return formatCurrency(value);
  };

  const handleViewDetail = (budget: VillageBudget) => {
    setSelectedBudget(budget);
    setShowDetailDialog(true);
  };

  const handleEdit = (budget: VillageBudget) => {
    setFormData({
      year: budget.year.toString(),
      revenue: budget.revenue.toString(),
      government_fund: budget.government_fund.toString(),
      district_fund: budget.district_fund.toString(),
      province_fund: budget.province_fund.toString(),
      local_income: budget.local_income.toString(),
      community_contribution: budget.community_contribution.toString(),
      private_sector_contribution:
        budget.private_sector_contribution.toString(),
      employee_budget: budget.employee_budget.toString(),
      infrastructure_budget: budget.infrastructure_budget.toString(),
      health_budget: budget.health_budget.toString(),
      education_budget: budget.education_budget.toString(),
      agriculture_budget: budget.agriculture_budget.toString(),
      social_budget: budget.social_budget.toString(),
      employee_realization: budget.employee_realization.toString(),
      infrastructure_realization: budget.infrastructure_realization.toString(),
      health_realization: budget.health_realization.toString(),
      education_realization: budget.education_realization.toString(),
      agriculture_realization: budget.agriculture_realization.toString(),
      social_realization: budget.social_realization.toString(),
    });
    setShowFormDialog(true);
  };

  const handleSubmit = () => {
    console.log("Form data:", formData);
    toast.success("Data anggaran berhasil disimpan");
    setShowFormDialog(false);
    // Reset form
    setFormData({
      year: new Date().getFullYear().toString(),
      revenue: "",
      government_fund: "",
      district_fund: "",
      province_fund: "",
      local_income: "",
      community_contribution: "",
      private_sector_contribution: "",
      employee_budget: "",
      infrastructure_budget: "",
      health_budget: "",
      education_budget: "",
      agriculture_budget: "",
      social_budget: "",
      employee_realization: "",
      infrastructure_realization: "",
      health_realization: "",
      education_realization: "",
      agriculture_realization: "",
      social_realization: "",
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Apakah Anda yakin ingin menghapus data anggaran ini?")) {
      console.log("Delete:", id);
      toast.success("Data anggaran berhasil dihapus");
    }
  };

  const filteredData = mockData.filter((budget) => {
    const matchesSearch = budget.year.toString().includes(searchQuery);
    const matchesYear =
      filterYear === "all" || budget.year.toString() === filterYear;

    return matchesSearch && matchesYear;
  });

  const uniqueYears = Array.from(new Set(mockData.map((b) => b.year))).sort(
    (a, b) => b - a
  );
  const latestData = mockData.find((b) => b.year === uniqueYears[0]);

  const totalRealization = latestData
    ? latestData.employee_realization +
      latestData.infrastructure_realization +
      latestData.health_realization +
      latestData.education_realization +
      latestData.agriculture_realization +
      latestData.social_realization
    : 0;

  const totalBudget = latestData
    ? latestData.employee_budget +
      latestData.infrastructure_budget +
      latestData.health_budget +
      latestData.education_budget +
      latestData.agriculture_budget +
      latestData.social_budget
    : 0;

  const realizationPercentage =
    totalBudget > 0 ? (totalRealization / totalBudget) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Main Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Pendapatan
                </p>
                <p className="text-2xl font-semibold">
                  {formatShortCurrency(latestData?.revenue || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tahun {latestData?.year}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Anggaran</p>
                <p className="text-2xl font-semibold">
                  {formatShortCurrency(totalBudget)}
                </p>
                <p className="text-xs text-muted-foreground">Dianggarkan</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <PieChart className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Realisasi</p>
                <p className="text-2xl font-semibold">
                  {formatShortCurrency(totalRealization)}
                </p>
                <p className="text-xs text-green-600">
                  {realizationPercentage.toFixed(1)}% dari anggaran
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sisa Anggaran</p>
                <p className="text-2xl font-semibold">
                  {formatShortCurrency(latestData?.remaining_budget || 0)}
                </p>
                <p className="text-xs text-muted-foreground">Tersisa</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Rincian Pendapatan Tahun {latestData?.year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                Dana Pemerintah Pusat
              </p>
              <p className="text-xl font-semibold">
                {formatCurrency(latestData?.government_fund || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {latestData
                  ? (
                      (latestData.government_fund / latestData.revenue) *
                      100
                    ).toFixed(1)
                  : 0}
                % dari total
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                Dana Provinsi
              </p>
              <p className="text-xl font-semibold">
                {formatCurrency(latestData?.province_fund || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {latestData
                  ? (
                      (latestData.province_fund / latestData.revenue) *
                      100
                    ).toFixed(1)
                  : 0}
                % dari total
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                Dana Kabupaten
              </p>
              <p className="text-xl font-semibold">
                {formatCurrency(latestData?.district_fund || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {latestData
                  ? (
                      (latestData.district_fund / latestData.revenue) *
                      100
                    ).toFixed(1)
                  : 0}
                % dari total
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                Pendapatan Asli Desa
              </p>
              <p className="text-xl font-semibold">
                {formatCurrency(latestData?.local_income || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {latestData
                  ? (
                      (latestData.local_income / latestData.revenue) *
                      100
                    ).toFixed(1)
                  : 0}
                % dari total
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                Kontribusi Masyarakat
              </p>
              <p className="text-xl font-semibold">
                {formatCurrency(latestData?.community_contribution || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {latestData
                  ? (
                      (latestData.community_contribution / latestData.revenue) *
                      100
                    ).toFixed(1)
                  : 0}
                % dari total
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                Kontribusi Swasta
              </p>
              <p className="text-xl font-semibold">
                {formatCurrency(latestData?.private_sector_contribution || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {latestData
                  ? (
                      (latestData.private_sector_contribution /
                        latestData.revenue) *
                      100
                    ).toFixed(1)
                  : 0}
                % dari total
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget vs Realization by Sector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-blue-600" />
            Anggaran vs Realisasi Per Sektor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Employee */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Belanja Pegawai</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(latestData?.employee_realization || 0)} /{" "}
                  {formatCurrency(latestData?.employee_budget || 0)}
                </div>
              </div>
              <Progress
                value={
                  latestData && latestData.employee_budget > 0
                    ? (latestData.employee_realization /
                        latestData.employee_budget) *
                      100
                    : 0
                }
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {latestData && latestData.employee_budget > 0
                  ? (
                      (latestData.employee_realization /
                        latestData.employee_budget) *
                      100
                    ).toFixed(1)
                  : 0}
                % terealisasi
              </p>
            </div>

            {/* Infrastructure */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-amber-600" />
                  <span className="font-medium">
                    Infrastruktur & Pembangunan
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(latestData?.infrastructure_realization || 0)}{" "}
                  / {formatCurrency(latestData?.infrastructure_budget || 0)}
                </div>
              </div>
              <Progress
                value={
                  latestData && latestData.infrastructure_budget > 0
                    ? (latestData.infrastructure_realization /
                        latestData.infrastructure_budget) *
                      100
                    : 0
                }
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {latestData && latestData.infrastructure_budget > 0
                  ? (
                      (latestData.infrastructure_realization /
                        latestData.infrastructure_budget) *
                      100
                    ).toFixed(1)
                  : 0}
                % terealisasi
              </p>
            </div>

            {/* Health */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-600" />
                  <span className="font-medium">Kesehatan</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(latestData?.health_realization || 0)} /{" "}
                  {formatCurrency(latestData?.health_budget || 0)}
                </div>
              </div>
              <Progress
                value={
                  latestData && latestData.health_budget > 0
                    ? (latestData.health_realization /
                        latestData.health_budget) *
                      100
                    : 0
                }
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {latestData && latestData.health_budget > 0
                  ? (
                      (latestData.health_realization /
                        latestData.health_budget) *
                      100
                    ).toFixed(1)
                  : 0}
                % terealisasi
              </p>
            </div>

            {/* Education */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">Pendidikan</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(latestData?.education_realization || 0)} /{" "}
                  {formatCurrency(latestData?.education_budget || 0)}
                </div>
              </div>
              <Progress
                value={
                  latestData && latestData.education_budget > 0
                    ? (latestData.education_realization /
                        latestData.education_budget) *
                      100
                    : 0
                }
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {latestData && latestData.education_budget > 0
                  ? (
                      (latestData.education_realization /
                        latestData.education_budget) *
                      100
                    ).toFixed(1)
                  : 0}
                % terealisasi
              </p>
            </div>

            {/* Agriculture */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wheat className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Pertanian & Ekonomi</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(latestData?.agriculture_realization || 0)} /{" "}
                  {formatCurrency(latestData?.agriculture_budget || 0)}
                </div>
              </div>
              <Progress
                value={
                  latestData && latestData.agriculture_budget > 0
                    ? (latestData.agriculture_realization /
                        latestData.agriculture_budget) *
                      100
                    : 0
                }
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {latestData && latestData.agriculture_budget > 0
                  ? (
                      (latestData.agriculture_realization /
                        latestData.agriculture_budget) *
                      100
                    ).toFixed(1)
                  : 0}
                % terealisasi
              </p>
            </div>

            {/* Social */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <HandHeart className="h-4 w-4 text-pink-600" />
                  <span className="font-medium">Sosial & Kemasyarakatan</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(latestData?.social_realization || 0)} /{" "}
                  {formatCurrency(latestData?.social_budget || 0)}
                </div>
              </div>
              <Progress
                value={
                  latestData && latestData.social_budget > 0
                    ? (latestData.social_realization /
                        latestData.social_budget) *
                      100
                    : 0
                }
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {latestData && latestData.social_budget > 0
                  ? (
                      (latestData.social_realization /
                        latestData.social_budget) *
                      100
                    ).toFixed(1)
                  : 0}
                % terealisasi
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari tahun..."
                  className="pl-10 bg-input-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tahun</SelectItem>
                  {uniqueYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
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
          <CardTitle>Data Anggaran Desa</CardTitle>
          <p className="text-sm text-muted-foreground">
            Menampilkan {filteredData.length} dari {mockData.length} data
            anggaran
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Tahun</TableHead>
                  <TableHead>Total Pendapatan</TableHead>
                  <TableHead>Total Anggaran</TableHead>
                  <TableHead>Total Realisasi</TableHead>
                  <TableHead>Sisa Anggaran</TableHead>
                  <TableHead>% Realisasi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Tidak ada data yang ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((budget, index) => {
                    const totalBudgetRow =
                      budget.employee_budget +
                      budget.infrastructure_budget +
                      budget.health_budget +
                      budget.education_budget +
                      budget.agriculture_budget +
                      budget.social_budget;
                    const totalRealizationRow =
                      budget.employee_realization +
                      budget.infrastructure_realization +
                      budget.health_realization +
                      budget.education_realization +
                      budget.agriculture_realization +
                      budget.social_realization;
                    const percentageRow =
                      totalBudgetRow > 0
                        ? (totalRealizationRow / totalBudgetRow) * 100
                        : 0;

                    return (
                      <TableRow key={budget.id} className="hover:bg-muted/50">
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">
                          <Badge variant="default">{budget.year}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(budget.revenue)}
                        </TableCell>
                        <TableCell>{formatCurrency(totalBudgetRow)}</TableCell>
                        <TableCell>
                          {formatCurrency(totalRealizationRow)}
                        </TableCell>
                        <TableCell>
                          <span className="text-green-600 font-medium">
                            {formatCurrency(budget.remaining_budget)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              percentageRow >= 80
                                ? "default"
                                : percentageRow >= 50
                                ? "secondary"
                                : "outline"
                            }
                            className={
                              percentageRow >= 80
                                ? "bg-green-500"
                                : percentageRow >= 50
                                ? "bg-amber-500"
                                : ""
                            }
                          >
                            {percentageRow.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => handleViewDetail(budget)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-amber-600 hover:text-amber-600 hover:bg-amber-50"
                              onClick={() => handleEdit(budget)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(budget.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Tambah Data Anggaran Desa</DialogTitle>
            <DialogDescription>
              Masukkan data anggaran dan realisasi untuk tahun tertentu.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-2">
            <div className="space-y-6">
              <div>
                <Label htmlFor="year">Tahun Anggaran</Label>
                <Input
                  id="year"
                  type="number"
                  placeholder="2024"
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ ...formData, year: e.target.value })
                  }
                />
              </div>

              {/* Revenue Section */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-4 flex items-center gap-2 text-green-600">
                  <TrendingUp className="h-5 w-5" />
                  Pendapatan
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="revenue">Total Pendapatan</Label>
                    <Input
                      id="revenue"
                      type="number"
                      placeholder="0"
                      value={formData.revenue}
                      onChange={(e) =>
                        setFormData({ ...formData, revenue: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="government_fund">
                      Dana Pemerintah Pusat
                    </Label>
                    <Input
                      id="government_fund"
                      type="number"
                      placeholder="0"
                      value={formData.government_fund}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          government_fund: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="province_fund">Dana Provinsi</Label>
                    <Input
                      id="province_fund"
                      type="number"
                      placeholder="0"
                      value={formData.province_fund}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          province_fund: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="district_fund">Dana Kabupaten</Label>
                    <Input
                      id="district_fund"
                      type="number"
                      placeholder="0"
                      value={formData.district_fund}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          district_fund: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="local_income">Pendapatan Asli Desa</Label>
                    <Input
                      id="local_income"
                      type="number"
                      placeholder="0"
                      value={formData.local_income}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          local_income: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="community_contribution">
                      Kontribusi Masyarakat
                    </Label>
                    <Input
                      id="community_contribution"
                      type="number"
                      placeholder="0"
                      value={formData.community_contribution}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          community_contribution: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="private_sector_contribution">
                      Kontribusi Swasta
                    </Label>
                    <Input
                      id="private_sector_contribution"
                      type="number"
                      placeholder="0"
                      value={formData.private_sector_contribution}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          private_sector_contribution: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Budget Section */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-4 flex items-center gap-2 text-blue-600">
                  <Wallet className="h-5 w-5" />
                  Anggaran Per Sektor
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="employee_budget">Belanja Pegawai</Label>
                    <Input
                      id="employee_budget"
                      type="number"
                      placeholder="0"
                      value={formData.employee_budget}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          employee_budget: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="infrastructure_budget">
                      Infrastruktur & Pembangunan
                    </Label>
                    <Input
                      id="infrastructure_budget"
                      type="number"
                      placeholder="0"
                      value={formData.infrastructure_budget}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          infrastructure_budget: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="health_budget">Kesehatan</Label>
                    <Input
                      id="health_budget"
                      type="number"
                      placeholder="0"
                      value={formData.health_budget}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          health_budget: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="education_budget">Pendidikan</Label>
                    <Input
                      id="education_budget"
                      type="number"
                      placeholder="0"
                      value={formData.education_budget}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          education_budget: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="agriculture_budget">
                      Pertanian & Ekonomi
                    </Label>
                    <Input
                      id="agriculture_budget"
                      type="number"
                      placeholder="0"
                      value={formData.agriculture_budget}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          agriculture_budget: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="social_budget">
                      Sosial & Kemasyarakatan
                    </Label>
                    <Input
                      id="social_budget"
                      type="number"
                      placeholder="0"
                      value={formData.social_budget}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          social_budget: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Realization Section */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-4 flex items-center gap-2 text-orange-600">
                  <PieChart className="h-5 w-5" />
                  Realisasi Per Sektor
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="employee_realization">
                      Belanja Pegawai
                    </Label>
                    <Input
                      id="employee_realization"
                      type="number"
                      placeholder="0"
                      value={formData.employee_realization}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          employee_realization: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="infrastructure_realization">
                      Infrastruktur & Pembangunan
                    </Label>
                    <Input
                      id="infrastructure_realization"
                      type="number"
                      placeholder="0"
                      value={formData.infrastructure_realization}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          infrastructure_realization: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="health_realization">Kesehatan</Label>
                    <Input
                      id="health_realization"
                      type="number"
                      placeholder="0"
                      value={formData.health_realization}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          health_realization: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="education_realization">Pendidikan</Label>
                    <Input
                      id="education_realization"
                      type="number"
                      placeholder="0"
                      value={formData.education_realization}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          education_realization: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="agriculture_realization">
                      Pertanian & Ekonomi
                    </Label>
                    <Input
                      id="agriculture_realization"
                      type="number"
                      placeholder="0"
                      value={formData.agriculture_realization}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          agriculture_realization: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="social_realization">
                      Sosial & Kemasyarakatan
                    </Label>
                    <Input
                      id="social_realization"
                      type="number"
                      placeholder="0"
                      value={formData.social_realization}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          social_realization: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFormDialog(false)}
            >
              Batal
            </Button>
            <Button type="button" onClick={handleSubmit}>
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Detail Anggaran Desa - Tahun {selectedBudget?.year}
            </DialogTitle>
            <DialogDescription>
              Informasi lengkap tentang anggaran dan realisasi untuk tahun{" "}
              {selectedBudget?.year}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-2">
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700 mb-1">
                    Total Pendapatan
                  </p>
                  <p className="text-2xl font-semibold text-green-900">
                    {formatCurrency(selectedBudget?.revenue || 0)}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-700 mb-1">Sisa Anggaran</p>
                  <p className="text-2xl font-semibold text-purple-900">
                    {formatCurrency(selectedBudget?.remaining_budget || 0)}
                  </p>
                </div>
              </div>

              {/* Revenue Details */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2 text-green-600">
                  <TrendingUp className="h-5 w-5" />
                  Rincian Pendapatan
                </h3>
                <div className="grid grid-cols-2 gap-3 bg-muted/50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Dana Pemerintah Pusat
                    </p>
                    <p className="font-semibold">
                      {formatCurrency(selectedBudget?.government_fund || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Dana Provinsi
                    </p>
                    <p className="font-semibold">
                      {formatCurrency(selectedBudget?.province_fund || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Dana Kabupaten
                    </p>
                    <p className="font-semibold">
                      {formatCurrency(selectedBudget?.district_fund || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Pendapatan Asli Desa
                    </p>
                    <p className="font-semibold">
                      {formatCurrency(selectedBudget?.local_income || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Kontribusi Masyarakat
                    </p>
                    <p className="font-semibold">
                      {formatCurrency(
                        selectedBudget?.community_contribution || 0
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Kontribusi Swasta
                    </p>
                    <p className="font-semibold">
                      {formatCurrency(
                        selectedBudget?.private_sector_contribution || 0
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Budget vs Realization */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2 text-blue-600">
                  <PieChart className="h-5 w-5" />
                  Anggaran vs Realisasi
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      label: "Belanja Pegawai",
                      budget: selectedBudget?.employee_budget,
                      realization: selectedBudget?.employee_realization,
                    },
                    {
                      label: "Infrastruktur & Pembangunan",
                      budget: selectedBudget?.infrastructure_budget,
                      realization: selectedBudget?.infrastructure_realization,
                    },
                    {
                      label: "Kesehatan",
                      budget: selectedBudget?.health_budget,
                      realization: selectedBudget?.health_realization,
                    },
                    {
                      label: "Pendidikan",
                      budget: selectedBudget?.education_budget,
                      realization: selectedBudget?.education_realization,
                    },
                    {
                      label: "Pertanian & Ekonomi",
                      budget: selectedBudget?.agriculture_budget,
                      realization: selectedBudget?.agriculture_realization,
                    },
                    {
                      label: "Sosial & Kemasyarakatan",
                      budget: selectedBudget?.social_budget,
                      realization: selectedBudget?.social_realization,
                    },
                  ].map((item, idx) => (
                    <div key={idx} className="bg-muted/50 p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-sm text-muted-foreground">
                          {item.budget && item.realization
                            ? ((item.realization / item.budget) * 100).toFixed(
                                1
                              )
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Anggaran</p>
                          <p className="font-semibold">
                            {formatCurrency(item.budget || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Realisasi</p>
                          <p className="font-semibold">
                            {formatCurrency(item.realization || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metadata */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                  <div>
                    <p>Dibuat: {selectedBudget?.created_at}</p>
                  </div>
                  <div>
                    <p>Diperbarui: {selectedBudget?.updated_at}</p>
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

export default Anggaran;
