"use client";

import { DataWargaTable, ExcelUploadDialog } from "@/components/app/data-warga";
import { useDataWargaPage } from "./_hooks/useDataWargaPage";

export default function DataWarga() {
  const warga = useDataWargaPage();

  return (
    <div className="space-y-6">
      <DataWargaTable
        refreshKey={warga.refreshKey}
        onRefresh={warga.onRefresh}
        setShowExcelDialog={warga.setShowExcelDialog}
      />

      <ExcelUploadDialog
        showExcelDialog={warga.showExcelDialog}
        setShowExcelDialog={warga.setShowExcelDialog}
        onUploadSuccess={warga.onUploadSuccess}
      />
    </div>
  );
}
