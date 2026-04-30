"use client";

import { ActionsBar } from "./_components/ActionsBar";
import { BudgetDetailDialog } from "./_components/BudgetDetailDialog";
import { BudgetFormDialog } from "./_components/BudgetFormDialog";
import { BudgetTable } from "./_components/BudgetTable";
import { RevenueBreakdownCard } from "./_components/RevenueBreakdownCard";
import { SectorProgressCard } from "./_components/SectorProgressCard";
import { StatsCards } from "./_components/StatsCards";
import { useAnggaran } from "./_hooks/useAnggaran";

export default function Page() {
  const anggaran = useAnggaran();
  return (
    <div className="space-y-6">
      <StatsCards
        latestData={anggaran.latestData}
        totalBudget={anggaran.totalBudget}
        totalRealization={anggaran.totalRealization}
        realizationPercentage={anggaran.realizationPercentage}
      />

      <RevenueBreakdownCard latestData={anggaran.latestData} />

      <SectorProgressCard latestData={anggaran.latestData} />

      <ActionsBar
        searchQuery={anggaran.searchQuery}
        setSearchQuery={anggaran.setSearchQuery}
        filterYear={anggaran.filterYear}
        setFilterYear={anggaran.setFilterYear}
        uniqueYears={anggaran.uniqueYears}
        onAdd={() => anggaran.setShowFormDialog(true)}
      />

      <BudgetTable
        filteredData={anggaran.filteredData}
        totalCount={anggaran.data.length}
        onViewDetail={anggaran.handleViewDetail}
        onEdit={anggaran.handleEdit}
        onDelete={anggaran.handleDelete}
      />

      <BudgetFormDialog
        open={anggaran.showFormDialog}
        onOpenChange={anggaran.setShowFormDialog}
        formData={anggaran.formData}
        setFormData={anggaran.setFormData}
        onSubmit={anggaran.handleSubmit}
      />

      <BudgetDetailDialog
        open={anggaran.showDetailDialog}
        onOpenChange={anggaran.setShowDetailDialog}
        selectedBudget={anggaran.selectedBudget}
      />
    </div>
  );
}
