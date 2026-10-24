import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  type DataTableFetchParams,
  type DataTableFetchResult,
} from "@/components/ui/data-table";
import {
  Plus,
  MoreVertical,
  FileSpreadsheet,
  FileText,
  Download,
  Upload,
  SlidersHorizontal,
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
import {
  FilterWargaModal,
  type WargaFilters,
  DEFAULT_FILTERS,
  countActiveFilters,
} from "./FilterWargaModal";

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
  const [filters, setFilters] = useState<WargaFilters>(DEFAULT_FILTERS);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [, setExportFormat] = useState<"excel" | "csv" | "pdf">("excel");

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

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
    async (params: DataTableFetchParams): Promise<DataTableFetchResult<Resident>> => {
      const f = (params.filters ?? {}) as unknown as WargaFilters;
      const qs = new URLSearchParams();
      qs.set("page", String(params.page));
      qs.set("pageSize", String(params.pageSize));
      if (params.sortKey) qs.set("sortKey", params.sortKey);
      if (params.sortOrder) qs.set("sortOrder", params.sortOrder);
      if (params.search) qs.set("search", params.search);
      if (f.gender && f.gender !== "all") qs.set("gender", f.gender);
      if (f.status && f.status !== "all") qs.set("status", f.status);
      if (f.religion && f.religion !== "all") qs.set("religion", f.religion);
      if (f.education && f.education !== "all") qs.set("education", f.education);
      if (f.occupation && f.occupation !== "all") qs.set("occupation", f.occupation);
      if (f.familyRole && f.familyRole !== "all") qs.set("familyRole", f.familyRole);
      if (f.hamlet?.trim()) qs.set("hamlet", f.hamlet.trim());
      if (f.rt?.trim()) qs.set("rt", f.rt.trim());
      if (f.rw?.trim()) qs.set("rw", f.rw.trim());
      if (f.ageMin) qs.set("ageMin", f.ageMin);
      if (f.ageMax) qs.set("ageMax", f.ageMax);
      if (f.isDisability !== "all") qs.set("isDisability", f.isDisability);
      if (f.isBpjsKis !== "all") qs.set("isBpjsKis", f.isBpjsKis);
      if (f.isStunting !== "all") qs.set("isStunting", f.isStunting);
      if (f.isPregnant !== "all") qs.set("isPregnant", f.isPregnant);
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
        <Button
          variant="outline"
          onClick={() => setShowFilterModal(true)}
          className="gap-2 relative"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter
          {activeFilterCount > 0 && (
            <Badge className="ml-1 h-5 min-w-5 px-1.5 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

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
  }, [activeFilterCount, setShowExcelDialog]);

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
          filters={filters as unknown as Record<string, unknown>}
          toolbar={toolbar}
          manualRefreshKey={refreshKey}
        />
      </CardContent>

      <FilterWargaModal
        open={showFilterModal}
        onOpenChange={setShowFilterModal}
        filters={filters}
        onApply={setFilters}
      />

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
          gender: filters.gender,
          status: filters.status,
        }}
      />
    </Card>
  );
};
