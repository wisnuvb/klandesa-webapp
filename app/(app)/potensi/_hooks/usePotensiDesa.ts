"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";
import type { VillagePotential } from "../_lib/types";

export function usePotensiDesa() {
  const { appConfirm } = useAppDialogs();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedPotential, setSelectedPotential] = useState<VillagePotential | null>(null);
  const [potentialList, setPotentialList] = useState<VillagePotential[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPotentials = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ page: "1", pageSize: "100" });
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (filterYear !== "all") params.set("year", filterYear);

      const res = await fetch(`/api/village-potentials?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch village potentials");

      const data: { rows: VillagePotential[] } = await res.json();
      setPotentialList(data.rows);
    } catch (error) {
      console.error("Gagal memuat data potensi desa:", error);
      toast.error("Gagal memuat data potensi desa");
    } finally {
      setIsLoading(false);
    }
  }, [filterYear, searchQuery]);

  useEffect(() => {
    void loadPotentials();
  }, [loadPotentials]);

  const uniqueYears = useMemo(() => {
    return Array.from(new Set(potentialList.map((p) => p.year))).sort(
      (a, b) => parseInt(b) - parseInt(a),
    );
  }, [potentialList]);

  const latestData = useMemo(() => {
    return potentialList.find((p) => p.year === uniqueYears[0]);
  }, [potentialList, uniqueYears]);

  const handleViewDetail = useCallback((potential: VillagePotential) => {
    setSelectedPotential(potential);
    setShowDetailDialog(true);
  }, []);

  const handleOpenEditModal = useCallback((potential: VillagePotential) => {
    setSelectedPotential(potential);
    setShowFormDialog(true);
  }, []);

  const handleDelete = useCallback(
    async (id: number) => {
      const ok = await appConfirm({
        title: "Hapus data potensi?",
        description: "Data potensi desa akan dihapus.",
        confirmLabel: "Hapus",
        tone: "destructive",
      });
      if (!ok) return;

      try {
        const res = await fetch(`/api/village-potentials/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete");

        toast.success("Data potensi desa berhasil dihapus");
        await loadPotentials();
      } catch (error) {
        console.error("Error deleting potential:", error);
        toast.error("Gagal menghapus data potensi desa");
      }
    },
    [appConfirm, loadPotentials],
  );

  return {
    searchQuery,
    setSearchQuery,
    filterYear,
    setFilterYear,
    showFormDialog,
    setShowFormDialog,
    showDetailDialog,
    setShowDetailDialog,
    selectedPotential,
    setSelectedPotential,
    potentialList,
    isLoading,
    uniqueYears,
    latestData,
    loadPotentials,
    handleViewDetail,
    handleOpenEditModal,
    handleDelete,
  };
}

