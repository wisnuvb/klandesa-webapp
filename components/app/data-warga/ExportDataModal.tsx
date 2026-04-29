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
import { FileSpreadsheet, FileText, Download, Loader2 } from "lucide-react";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";

interface ExportDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFilters?: {
    gender: string;
    status: string;
    search?: string;
  };
}

type ExportFormat = "excel" | "csv" | "pdf";

export function ExportDataModal({
  open,
  onOpenChange,
  currentFilters,
}: ExportDataModalProps) {
  const { appAlert } = useAppDialogs();
  const [format, setFormat] = useState<ExportFormat>("excel");
  const [gender, setGender] = useState(currentFilters?.gender || "all");
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
        if (currentFilters.gender && currentFilters.gender !== "all") {
          params.set("gender", currentFilters.gender);
        }
        if (currentFilters.status && currentFilters.status !== "all") {
          params.set("status", currentFilters.status);
        }
        if (currentFilters.search) {
          params.set("search", currentFilters.search);
        }
      } else {
        // Use custom filters from form
        if (gender && gender !== "all") {
          params.set("gender", gender);
        }
        if (status && status !== "all") {
          params.set("status", status);
        }
        if (search) {
          params.set("search", search);
        }
      }

      // Add format
      params.set("format", format);
      params.set("export", "true"); // Flag untuk export (no pagination)

      // Call export API
      const response = await fetch(
        `/api/residents/export?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Gagal mengekspor data");
      }

      // Get filename from response header or generate
      const contentDisposition = response.headers.get("content-disposition");
      let filename = `data-warga.${
        format === "excel" ? "xlsx" : format === "csv" ? "csv" : "pdf"
      }`;

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
          <DialogTitle>Export Data Warga</DialogTitle>
          <DialogDescription>
            Pilih format dan filter data yang ingin diekspor
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Format File</Label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel (.xlsx)
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CSV (.csv)
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    PDF (.pdf)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
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
                  placeholder="Cari nama, NIK, atau No. KK..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jenis Kelamin</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua</SelectItem>
                      <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                      <SelectItem value="Perempuan">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status Pernikahan</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua</SelectItem>
                      <SelectItem value="Belum Menikah">
                        Belum Menikah
                      </SelectItem>
                      <SelectItem value="Menikah">Menikah</SelectItem>
                      <SelectItem value="Cerai Hidup">Cerai Hidup</SelectItem>
                      <SelectItem value="Cerai Mati">Cerai Mati</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
