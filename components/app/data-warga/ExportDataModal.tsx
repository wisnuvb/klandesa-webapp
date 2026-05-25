"use client";

import { useState } from "react";
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

interface ExportDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFilters?: {
    gender: string;
    status: string;
    search?: string;
  };
}

export function ExportDataModal({
  open,
  onOpenChange,
  currentFilters,
}: ExportDataModalProps) {
  const { appAlert } = useAppDialogs();
  const [gender, setGender] = useState(currentFilters?.gender || "all");
  const [status, setStatus] = useState(currentFilters?.status || "all");
  const [search, setSearch] = useState(currentFilters?.search || "");
  const [useCurrentFilters, setUseCurrentFilters] = useState(true);

  async function handleExport(format: ExportFormat) {
    try {
      const params = new URLSearchParams();

      if (useCurrentFilters && currentFilters) {
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
        if (gender && gender !== "all") params.set("gender", gender);
        if (status && status !== "all") params.set("status", status);
        if (search) params.set("search", search);
      }

      params.set("format", format);
      params.set("export", "true");

      const response = await fetch(`/api/residents/export?${params.toString()}`);
      if (!response.ok) throw new Error("Gagal mengekspor data");

      const contentDisposition = response.headers.get("content-disposition");
      let filename = `data-warga.${
        format === "excel" ? "xlsx" : format === "csv" ? "csv" : "pdf"
      }`;
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
      title="Export Data Warga"
      description="Pilih format dan filter data yang ingin diekspor"
      onExport={handleExport}
      filtersSlot={
        <>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="useCurrentFilters"
              checked={useCurrentFilters}
              onCheckedChange={(checked) => setUseCurrentFilters(checked === true)}
            />
            <Label
              htmlFor="useCurrentFilters"
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
                      <SelectItem value="Belum Menikah">Belum Menikah</SelectItem>
                      <SelectItem value="Menikah">Menikah</SelectItem>
                      <SelectItem value="Cerai Hidup">Cerai Hidup</SelectItem>
                      <SelectItem value="Cerai Mati">Cerai Mati</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
