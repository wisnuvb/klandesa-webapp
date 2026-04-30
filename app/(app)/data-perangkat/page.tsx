"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormDialog } from "@/components/app/data-perangkat";
import { ActionsBar } from "./_components/ActionsBar";
import { OfficialDetailDialog } from "./_components/OfficialDetailDialog";
import { OfficialEditDialog } from "./_components/OfficialEditDialog";
import { PerangkatHierarchyCard } from "./_components/PerangkatHierarchyCard";
import { PerangkatTableCard } from "./_components/PerangkatTableCard";
import { StatsCards } from "./_components/StatsCards";
import { useDataPerangkat } from "./_hooks/useDataPerangkat";

export default function Page() {
  const perangkat = useDataPerangkat();
  return (
    <div className="space-y-6">
      <StatsCards
        isLoading={perangkat.isLoading}
        totalPerangkat={perangkat.totalPerangkat}
        activePerangkat={perangkat.activePerangkat}
        positionCount={perangkat.positions.length}
      />

      <ActionsBar
        searchQuery={perangkat.searchQuery}
        setSearchQuery={perangkat.setSearchQuery}
        filterPosition={perangkat.filterPosition}
        setFilterPosition={perangkat.setFilterPosition}
        filterStatus={perangkat.filterStatus}
        setFilterStatus={perangkat.setFilterStatus}
        positions={perangkat.positions}
        onAdd={() => perangkat.setShowFormDialog(true)}
      />

      <Tabs value={perangkat.viewTab} onValueChange={perangkat.setViewTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:w-105">
          <TabsTrigger value="table">Daftar Perangkat</TabsTrigger>
          <TabsTrigger value="hierarchy">Bagan Hirarki</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <PerangkatTableCard
            isLoading={perangkat.isLoading}
            rows={perangkat.filteredData}
            totalPerangkat={perangkat.totalPerangkat}
            isSubmittingAction={perangkat.isSubmittingAction}
            onDetail={perangkat.openDetail}
            onEdit={perangkat.openEdit}
            onDelete={perangkat.handleDelete}
          />
        </TabsContent>

        <TabsContent value="hierarchy">
          <PerangkatHierarchyCard
            isLoading={perangkat.isLoading}
            officials={perangkat.officials}
            tree={perangkat.officialTree}
            onDetail={perangkat.openDetail}
            onEdit={perangkat.openEdit}
          />
        </TabsContent>
      </Tabs>

      <FormDialog
        showFormDialog={perangkat.showFormDialog}
        setShowFormDialog={perangkat.setShowFormDialog}
        positions={perangkat.positions}
        officials={perangkat.officials}
        onSuccess={() => void perangkat.loadOfficials()}
      />

      <OfficialDetailDialog
        open={perangkat.showDetailDialog && !!perangkat.selectedOfficial}
        onOpenChange={perangkat.closeDetail}
        selectedOfficial={perangkat.selectedOfficial}
      />

      <OfficialEditDialog
        open={perangkat.showEditDialog && !!perangkat.selectedOfficial}
        onOpenChange={perangkat.closeEdit}
        selectedOfficial={perangkat.selectedOfficial}
        isSubmittingAction={perangkat.isSubmittingAction}
        editForm={perangkat.editForm}
        setEditForm={perangkat.setEditForm}
        positions={perangkat.positions}
        supervisorCandidates={perangkat.editSupervisorCandidates}
        onSave={perangkat.handleSaveEdit}
      />
    </div>
  );
}
