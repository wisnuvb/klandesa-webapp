"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormDialog } from "@/components/app/data-jabatan";
import { ActionsBar } from "./_components/ActionsBar";
import { JabatanHierarchyCard } from "./_components/JabatanHierarchyCard";
import { JabatanTableCard } from "./_components/JabatanTableCard";
import { StatsCards } from "./_components/StatsCards";
import { useDataJabatan } from "./_hooks/useDataJabatan";

export default function Page() {
  const jabatan = useDataJabatan();
  return (
    <div className="space-y-6">
      <StatsCards
        isLoading={jabatan.isLoading}
        totalJabatan={jabatan.totalJabatan}
        filledPositions={jabatan.filledPositions}
        totalStaff={jabatan.totalStaff}
      />

      <ActionsBar
        searchQuery={jabatan.searchQuery}
        setSearchQuery={jabatan.setSearchQuery}
        onAdd={() => jabatan.setShowFormDialog(true)}
      />

      <Tabs value={jabatan.viewTab} onValueChange={jabatan.setViewTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:w-105">
          <TabsTrigger value="table">Daftar Jabatan</TabsTrigger>
          <TabsTrigger value="hierarchy">Bagan Hirarki</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <JabatanTableCard
            isLoading={jabatan.isLoading}
            rows={jabatan.filteredData}
          />
        </TabsContent>

        <TabsContent value="hierarchy">
          <JabatanHierarchyCard
            isLoading={jabatan.isLoading}
            jabatanList={jabatan.jabatanList}
          />
        </TabsContent>
      </Tabs>

      <FormDialog
        showFormDialog={jabatan.showFormDialog}
        setShowFormDialog={jabatan.setShowFormDialog}
        onSuccess={() => void jabatan.loadJabatan()}
      />
    </div>
  );
}
