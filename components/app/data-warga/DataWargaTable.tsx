import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DataTable,
  type DataTableFetchParams,
  type DataTableFetchResult,
} from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  MoreVertical,
  FileSpreadsheet,
  FileText,
  Download,
  Upload,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { DetailResidentModal } from "./DetailResidentModal";
import { EditResidentModal } from "./EditResidentModal";
import { AddResidentModal } from "./AddResidentModal";
import { createDataWargaColumns } from "./DataWargaTableColumns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Resident } from "@prisma/client";
import { ExportDataModal } from "./ExportDataModal";

interface DataWargaTableProps {
  refreshKey?: number;
  onRefresh?: () => void;
  setShowExcelDialog?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const DataWargaTable = ({
  refreshKey,
  onRefresh,
  setShowExcelDialog,
}: DataWargaTableProps) => {
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [, setExportFormat] = useState<"excel" | "csv" | "pdf">(
    "excel"
  );

  // Memoize filters object to prevent unnecessary re-renders
  const filters = useMemo(
    () => ({ gender: filterGender, status: filterStatus }),
    [filterGender, filterStatus]
  );

  // Memoize initialSort to prevent unnecessary re-renders
  const initialSort = useMemo(
    () => ({ key: "name", order: "asc" as const }),
    []
  );

  const columns = useMemo(
    () =>
      createDataWargaColumns({
        onView: (resident) => {
          setSelectedResident(resident);
          setShowDetailModal(true);
        },
        onEdit: (resident) => {
          setSelectedResident(resident);
          setShowEditModal(true);
        },
      }),
    []
  );

  const fetchWarga = useCallback(
    async (
      params: DataTableFetchParams
    ): Promise<DataTableFetchResult<Resident>> => {
      const filters = (params.filters ?? {}) as {
        gender?: "all" | "Laki-laki" | "Perempuan";
        status?:
          | "all"
          | "Belum Menikah"
          | "Menikah"
          | "Cerai Hidup"
          | "Cerai Mati";
      };
      const qs = new URLSearchParams();
      qs.set("page", String(params.page));
      qs.set("pageSize", String(params.pageSize));
      if (params.sortKey) qs.set("sortKey", params.sortKey);
      if (params.sortOrder) qs.set("sortOrder", params.sortOrder);
      if (params.search) qs.set("search", params.search);
      if (filters.gender && filters.gender !== "all")
        qs.set("gender", filters.gender);
      if (filters.status && filters.status !== "all") {
        const map: Record<string, string> = {
          "Belum Menikah": "Belum Menikah",
          Menikah: "Menikah",
          "Cerai Hidup": "Cerai Hidup",
          "Cerai Mati": "Cerai Mati",
        };
        qs.set("status", map[filters.status] ?? filters.status);
      }
      const res = await fetch(`/api/residents?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Gagal memuat data");
      setTotalCount(data.total ?? 0);
      return data as DataTableFetchResult<Resident>;
    },
    []
  );

  // Memoize toolbar to prevent unnecessary re-renders
  const toolbar = useMemo(() => {
    const handleShowImportDialog = () => {
      setShowExcelDialog?.(true);
    };

    const handleExport = (format: "excel" | "csv" | "pdf") => {
      setExportFormat(format);
      setShowExportModal(true);
    };

    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Label htmlFor="gender">JK:</Label>
          <Select value={filterGender} onValueChange={setFilterGender}>
            <SelectTrigger id="gender" className="w-30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="Laki-laki">Laki-laki</SelectItem>
              <SelectItem value="Perempuan">Perempuan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="status">Status:</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger id="status" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="Belum Menikah">Belum Menikah</SelectItem>
              <SelectItem value="Menikah">Menikah</SelectItem>
              <SelectItem value="Cerai Hidup">Cerai Hidup</SelectItem>
              <SelectItem value="Cerai Mati">Cerai Mati</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto space-x-2">
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Tambah Warga
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Export Data</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleExport("excel")}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Download Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                <FileText className="h-4 w-4 mr-2" />
                Download CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Import Data</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleShowImportDialog()}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }, [filterGender, filterStatus, setShowExcelDialog]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar Data Warga</CardTitle>
        <p className="text-sm text-muted-foreground">
          Total {totalCount} data warga
        </p>
      </CardHeader>
      <CardContent>
        <DataTable<Resident>
          columns={columns}
          fetchData={fetchWarga}
          initialPageSize={10}
          initialSort={initialSort}
          rowKey={(w) => w.id}
          filters={filters}
          toolbar={toolbar}
          manualRefreshKey={refreshKey}
        />
      </CardContent>

      <DetailResidentModal
        resident={selectedResident}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
      />

      <EditResidentModal
        resident={selectedResident}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onSuccess={onRefresh}
      />

      <AddResidentModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={onRefresh}
      />

      <ExportDataModal
        open={showExportModal}
        onOpenChange={setShowExportModal}
        currentFilters={{
          gender: filterGender,
          status: filterStatus,
        }}
      />
    </Card>
  );
};
