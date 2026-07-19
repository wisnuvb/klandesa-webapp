"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ExportDialog, type ExportFormat } from "@/components/app/patterns";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";

interface ExportPermohonanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFilters?: {
    status: string;
    search?: string;
  };
}

export function ExportPermohonanModal({
  open,
  onOpenChange,
  currentFilters,
}: ExportPermohonanModalProps) {
  const { appAlert } = useAppDialogs();
  const [status, setStatus] = useState(currentFilters?.status || "all");
  const [search, setSearch] = useState(currentFilters?.search || "");
  const [useCurrentFilters, setUseCurrentFilters] = useState(true);

  async function handleExport(format: ExportFormat) {
    void format;
    try {
      const params = new URLSearchParams();

      if (useCurrentFilters && currentFilters) {
        if (currentFilters.status && currentFilters.status !== "all") {
          params.set("status", currentFilters.status);
        }
        if (currentFilters.search) params.set("search", currentFilters.search);
      } else {
        if (status && status !== "all") params.set("status", status);
        if (search) params.set("search", search);
      }

      params.set("format", "excel");
      params.set("export", "true");

      const response = await fetch(
        `/api/mail-requests/export?${params.toString()}`,
      );
      if (!response.ok) throw new Error("Gagal mengekspor data");

      const contentDisposition = response.headers.get("content-disposition");
      let filename = `permohonan-warga-${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) filename = filenameMatch[1];
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
      void appAlert("Gagal mengekspor data. Silakan coba lagi.");
      throw error;
    }
  }

  return (
    <ExportDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Export Data Permohonan"
      description="Pilih filter data yang ingin diekspor ke Excel"
      formats={[
        {
          id: "excel",
          label: "Excel (.xlsx)",
          icon: <FileSpreadsheet className="h-4 w-4 text-green-600" />,
        },
      ]}
      defaultFormat="excel"
      onExport={handleExport}
      filtersSlot={
        <>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="useCurrentFiltersPermohonan"
              checked={useCurrentFilters}
              onCheckedChange={(checked) => setUseCurrentFilters(checked === true)}
            />
            <Label
              htmlFor="useCurrentFiltersPermohonan"
              className="text-sm font-normal cursor-pointer"
            >
              Gunakan filter yang sedang aktif di tabel
            </Label>
          </div>

          {!useCurrentFilters && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label>Pencarian</Label>
                <Input
                  placeholder="Cari nama, NIK, atau jenis surat..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="DIPROSES">Diproses</SelectItem>
                    <SelectItem value="SELESAI">Selesai</SelectItem>
                    <SelectItem value="DITOLAK">Ditolak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
            {useCurrentFilters
              ? "Data yang diekspor akan menggunakan filter yang sedang aktif di tabel."
              : "Data yang diekspor akan menggunakan filter yang Anda pilih di atas."}
          </div>
        </>
      }
    />
  );
}
