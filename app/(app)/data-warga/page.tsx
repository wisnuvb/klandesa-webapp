"use client";

import { DataWargaTable, ExcelUploadDialog } from "@/components/app/data-warga";
import { DataWargaTour } from "@/components/app/DataWargaTour";
import { useDataWargaPage } from "./_hooks/useDataWargaPage";
import { KualitasKkBanner } from "./_components/KualitasKkBanner";
import { KependudukanNav } from "./_components/KependudukanNav";

export default function DataWarga() {
  const warga = useDataWargaPage();

  return (
    <div className="space-y-6">
      <DataWargaTour />
      <KependudukanNav />
      <KualitasKkBanner refreshKey={warga.refreshKey} />
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
