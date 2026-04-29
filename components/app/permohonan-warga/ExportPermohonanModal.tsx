"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { FileSpreadsheet, Download, Loader2 } from "lucide-react";
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
  const [isExporting, setIsExporting] = useState(false);
  const [useCurrentFilters, setUseCurrentFilters] = useState(true);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Build query params
      const params = new URLSearchParams();

      if (useCurrentFilters && currentFilters) {
        // Use current table filters
        if (currentFilters.status && currentFilters.status !== "all") {
          params.set("status", currentFilters.status);
        }
        if (currentFilters.search) {
          params.set("search", currentFilters.search);
        }
      } else {
        // Use custom filters from form
        if (status && status !== "all") {
          params.set("status", status);
        }
        if (search) {
          params.set("search", search);
        }
      }

      // Add format (only Excel)
      params.set("format", "excel");
      params.set("export", "true"); // Flag untuk export (no pagination)

      // Call export API
      const response = await fetch(
        `/api/mail-requests/export?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Gagal mengekspor data");
      }

      // Get filename from response header or generate
      const contentDisposition = response.headers.get("content-disposition");
      let filename = `permohonan-warga-${
        new Date().toISOString().split("T")[0]
      }.xlsx`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onOpenChange(false);
    } catch (error) {
      console.error("Export error:", error);
      void appAlert("Gagal mengekspor data. Silakan coba lagi.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Data Permohonan</DialogTitle>
          <DialogDescription>
            Pilih filter data yang ingin diekspor ke Excel
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format Info */}
          <div className="space-y-2">
            <Label>Format File</Label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">Excel (.xlsx)</span>
            </div>
          </div>

          {/* Use Current Filters Option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="useCurrentFilters"
              checked={useCurrentFilters}
              onCheckedChange={(checked) =>
                setUseCurrentFilters(checked === true)
              }
            />
            <Label
              htmlFor="useCurrentFilters"
              className="text-sm font-normal cursor-pointer"
            >
              Gunakan filter yang sedang aktif di tabel
            </Label>
          </div>

          {/* Custom Filters */}
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

          {/* Info */}
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
            {useCurrentFilters ? (
              <p>
                Data yang diekspor akan menggunakan filter yang sedang aktif di
                tabel.
              </p>
            ) : (
              <p>
                Data yang diekspor akan menggunakan filter yang Anda pilih di
                atas.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Batal
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Mengekspor...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
