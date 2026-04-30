"use client";

import { FormDialog } from "@/components/app/potensi";
import { ActionsBar } from "./_components/ActionsBar";
import { DetailedStats } from "./_components/DetailedStats";
import { PotensiDetailDialog } from "./_components/PotensiDetailDialog";
import { PotensiTableCard } from "./_components/PotensiTableCard";
import { StatsCards } from "./_components/StatsCards";
import { usePotensiDesa } from "./_hooks/usePotensiDesa";

export function PotensiDesa() {
  const p = usePotensiDesa();
  return (
    <div className="space-y-6">
      <StatsCards isLoading={p.isLoading} latestData={p.latestData} />
      <DetailedStats isLoading={p.isLoading} latestData={p.latestData} />

      <ActionsBar
        searchQuery={p.searchQuery}
        setSearchQuery={p.setSearchQuery}
        filterYear={p.filterYear}
        setFilterYear={p.setFilterYear}
        uniqueYears={p.uniqueYears}
        onAdd={() => p.setShowFormDialog(true)}
      />

      <PotensiTableCard
        potentialList={p.potentialList}
        isLoading={p.isLoading}
        onViewDetail={p.handleViewDetail}
        onEdit={p.handleOpenEditModal}
        onDelete={p.handleDelete}
      />

      {/* Form Dialog */}
      <FormDialog
        showFormDialog={p.showFormDialog}
        setShowFormDialog={p.setShowFormDialog}
        onSuccess={() => p.loadPotentials()}
      />

      <PotensiDetailDialog
        open={p.showDetailDialog}
        onOpenChange={p.setShowDetailDialog}
        selectedPotential={p.selectedPotential}
      />
    </div>
  );
}

export default PotensiDesa;
