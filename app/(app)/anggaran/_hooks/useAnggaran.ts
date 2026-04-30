"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";
import type { BudgetFormData, VillageBudget } from "../_lib/types";
import {
  getLatestBudgetByYear,
  getPercentage,
  getTotalBudget,
  getTotalRealization,
  getUniqueYears,
} from "../_lib/calculations";
import { mockData } from "../_lib/mockData";

function defaultFormData(): BudgetFormData {
  return {
    year: new Date().getFullYear().toString(),
    revenue: "",
    government_fund: "",
    district_fund: "",
    province_fund: "",
    local_income: "",
    community_contribution: "",
    private_sector_contribution: "",
    employee_budget: "",
    infrastructure_budget: "",
    health_budget: "",
    education_budget: "",
    agriculture_budget: "",
    social_budget: "",
    employee_realization: "",
    infrastructure_realization: "",
    health_realization: "",
    education_realization: "",
    agriculture_realization: "",
    social_realization: "",
  };
}

export function useAnggaran() {
  const { appConfirm } = useAppDialogs();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<VillageBudget | null>(null);
  const [formData, setFormData] = useState<BudgetFormData>(() => defaultFormData());

  const uniqueYears = useMemo(() => getUniqueYears(mockData), []);
  const latestData = useMemo(
    () => getLatestBudgetByYear(mockData, uniqueYears),
    [uniqueYears],
  );

  const totalRealization = useMemo(
    () => getTotalRealization(latestData),
    [latestData],
  );
  const totalBudget = useMemo(() => getTotalBudget(latestData), [latestData]);
  const realizationPercentage = useMemo(
    () => getPercentage(totalRealization, totalBudget),
    [totalRealization, totalBudget],
  );

  const filteredData = useMemo(() => {
    return mockData.filter((budget) => {
      const matchesSearch = budget.year.toString().includes(searchQuery);
      const matchesYear =
        filterYear === "all" || budget.year.toString() === filterYear;
      return matchesSearch && matchesYear;
    });
  }, [filterYear, searchQuery]);

  const handleViewDetail = (budget: VillageBudget) => {
    setSelectedBudget(budget);
    setShowDetailDialog(true);
  };

  const handleEdit = (budget: VillageBudget) => {
    setFormData({
      year: budget.year.toString(),
      revenue: budget.revenue.toString(),
      government_fund: budget.government_fund.toString(),
      district_fund: budget.district_fund.toString(),
      province_fund: budget.province_fund.toString(),
      local_income: budget.local_income.toString(),
      community_contribution: budget.community_contribution.toString(),
      private_sector_contribution: budget.private_sector_contribution.toString(),
      employee_budget: budget.employee_budget.toString(),
      infrastructure_budget: budget.infrastructure_budget.toString(),
      health_budget: budget.health_budget.toString(),
      education_budget: budget.education_budget.toString(),
      agriculture_budget: budget.agriculture_budget.toString(),
      social_budget: budget.social_budget.toString(),
      employee_realization: budget.employee_realization.toString(),
      infrastructure_realization: budget.infrastructure_realization.toString(),
      health_realization: budget.health_realization.toString(),
      education_realization: budget.education_realization.toString(),
      agriculture_realization: budget.agriculture_realization.toString(),
      social_realization: budget.social_realization.toString(),
    });
    setShowFormDialog(true);
  };

  const handleSubmit = () => {
    toast.success("Data anggaran berhasil disimpan");
    setShowFormDialog(false);
    setFormData(defaultFormData());
  };

  const handleDelete = async (id: number) => {
    const ok = await appConfirm({
      title: "Hapus data anggaran?",
      description: "Data anggaran akan dihapus dari daftar.",
      confirmLabel: "Hapus",
      tone: "destructive",
    });
    if (!ok) return;
    console.log("Delete:", id);
    toast.success("Data anggaran berhasil dihapus");
  };

  return {
    data: mockData,
    uniqueYears,
    latestData,
    totalRealization,
    totalBudget,
    realizationPercentage,
    filteredData,

    searchQuery,
    setSearchQuery,
    filterYear,
    setFilterYear,

    showFormDialog,
    setShowFormDialog,
    showDetailDialog,
    setShowDetailDialog,
    selectedBudget,
    setSelectedBudget,

    formData,
    setFormData,

    handleViewDetail,
    handleEdit,
    handleSubmit,
    handleDelete,
  };
}

