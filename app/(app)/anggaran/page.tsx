"use client";

import { ActionsBar } from "./_components/ActionsBar";
import { BudgetDetailDialog } from "./_components/BudgetDetailDialog";
import { BudgetFormDialog } from "./_components/BudgetFormDialog";
import { BudgetTable } from "./_components/BudgetTable";
import { RevenueBreakdownCard } from "./_components/RevenueBreakdownCard";
import { SectorProgressCard } from "./_components/SectorProgressCard";
import { StatsCards } from "./_components/StatsCards";
import { useAnggaran } from "./_hooks/useAnggaran";
import { AsyncState } from "@/components/app/patterns";
import { SdgTagsManager } from "@/components/app/finance/SdgTagsManager";

export default function Page() {
  const anggaran = useAnggaran();

  return (
    <AsyncState
      loading={anggaran.loading}
      error={anggaran.error}
      onRetry={anggaran.reload}
      loadingMessage="Memuat data anggaran desa..."
    >
      <div className="space-y-6">
        <StatsCards
          latestData={anggaran.latestData}
          totalBudget={anggaran.totalBudget}
          totalRealization={anggaran.totalRealization}
          realizationPercentage={anggaran.realizationPercentage}
          loading={anggaran.loading}
        />

        <RevenueBreakdownCard latestData={anggaran.latestData} />

        <SectorProgressCard latestData={anggaran.latestData} />

        <SdgTagsManager defaultYear={anggaran.latestData?.year} />

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
    </AsyncState>
  );
}
