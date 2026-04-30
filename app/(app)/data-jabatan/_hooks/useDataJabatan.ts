"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePersistedTab } from "@/hooks/usePersistedTab";
import {
  DATA_JABATAN_VIEW_TABS,
  type DataJabatanViewTab,
  type Jabatan,
} from "../_lib/types";

export function useDataJabatan() {
  const [viewTab, setViewTab] = usePersistedTab<DataJabatanViewTab>(
    "data-jabatan",
    "table",
    DATA_JABATAN_VIEW_TABS,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [jabatanList, setJabatanList] = useState<Jabatan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadJabatan = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ page: "1", pageSize: "100" });
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/positions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch positions");
      const data: { rows: Jabatan[] } = await res.json();

      setJabatanList(data.rows);
    } catch (error) {
      console.error("Gagal memuat data jabatan:", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    void loadJabatan();
  }, [loadJabatan]);

  const filteredData = jabatanList;

  const totalJabatan = jabatanList.length;
  const filledPositions = useMemo(
    () => jabatanList.filter((j) => j.total_staff > 0).length,
    [jabatanList],
  );
  const totalStaff = useMemo(
    () => jabatanList.reduce((sum, j) => sum + j.total_staff, 0),
    [jabatanList],
  );

  return {
    viewTab,
    setViewTab,

    searchQuery,
    setSearchQuery,

    showFormDialog,
    setShowFormDialog,

    jabatanList,
    filteredData,
    isLoading,

    totalJabatan,
    filledPositions,
    totalStaff,

    loadJabatan,
  };
}

