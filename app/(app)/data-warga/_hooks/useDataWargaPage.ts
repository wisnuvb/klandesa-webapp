"use client";

import { useCallback, useState } from "react";

export function useDataWargaPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showExcelDialog, setShowExcelDialog] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const onUploadSuccess = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return {
    refreshKey,
    onRefresh,
    showExcelDialog,
    setShowExcelDialog,
    onUploadSuccess,
  };
}
