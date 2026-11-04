"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormDialog } from "@/components/app/data-perangkat";
import { useCallback, useMemo, useState } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { CreateAccountDialog } from "@/components/permissions/CreateAccountDialog";
import { InviteResultDialog, type DeliveryView, type InviteNotice } from "@/components/permissions/InviteResultDialog";
import { AccountAccessGuide } from "./_components/AccountAccessGuide";
import type { OfficialRow } from "./_lib/types";
import { ActionsBar } from "./_components/ActionsBar";
import { OfficialDetailDialog } from "./_components/OfficialDetailDialog";
import { OfficialEditDialog } from "./_components/OfficialEditDialog";
import { OrgChartCard } from "./_components/org-chart/OrgChartCard";
import { PerangkatTableCard } from "./_components/PerangkatTableCard";
import { StatsCards } from "./_components/StatsCards";
import { useDataPerangkat } from "./_hooks/useDataPerangkat";

export default function Page() {
  const perangkat = useDataPerangkat();
  const { can } = usePermissions();
  const canManageAccounts = can("rbac", "read");
  const canManageOfficials = can("officials", "update");
  const [accountFor, setAccountFor] = useState<OfficialRow | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notice, setNotice] = useState<InviteNotice | null>(null);

  const accountOfficials = useMemo(
    () =>
      accountFor
        ? [{ id: accountFor.id, name: accountFor.name, email: accountFor.email, phone: accountFor.phone, positionName: accountFor.position?.name ?? null }]
        : [],
    [accountFor],
  );

  const createAccount = useCallback(async (body: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/rbac/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; email?: string; delivery?: DeliveryView | null };
      if (!res.ok) return { ok: false as const, error: json.error ?? "Terjadi kesalahan. Coba lagi." };
      void perangkat.reload();
      return { ok: true as const, email: json.email ?? String(body.email ?? ""), delivery: json.delivery ?? null };
    } catch {
      return { ok: false as const, error: "Tidak dapat terhubung ke server. Periksa koneksi Anda." };
    }
  }, [perangkat]);

  return (
    <div className="space-y-6">
      <StatsCards
        isLoading={perangkat.isLoading}
        totalPerangkat={perangkat.totalPerangkat}
        activePerangkat={perangkat.activePerangkat}
        positionCount={perangkat.positions.length}
      />

      <AccountAccessGuide canManage={canManageAccounts} />

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
            canManageAccounts={canManageAccounts}
            onCreateAccount={(o) => {
              setAccountFor(o);
              setAccountOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="hierarchy">
          <OrgChartCard
            isLoading={perangkat.isLoading}
            directory={perangkat.directory}
            settings={perangkat.orgSettings}
            canEdit={canManageOfficials}
            onDetail={perangkat.openDetail}
            onEdit={perangkat.openEdit}
            onSettingsSaved={perangkat.setOrgSettings}
          />
        </TabsContent>
      </Tabs>

      <FormDialog
        showFormDialog={perangkat.showFormDialog}
        setShowFormDialog={perangkat.setShowFormDialog}
        positions={perangkat.positions}
        officials={perangkat.directory}
        orgSettings={perangkat.orgSettings}
        onSuccess={() => void perangkat.reload()}
      />

      <OfficialDetailDialog
        open={perangkat.showDetailDialog && !!perangkat.selectedOfficial}
        onOpenChange={perangkat.closeDetail}
        selectedOfficial={perangkat.selectedOfficial}
        canManageAccounts={canManageAccounts}
      />

      {canManageAccounts && (
        <>
          <CreateAccountDialog
            key={accountFor?.id ?? "none"}
            open={accountOpen}
            officials={accountOfficials}
            initialOfficialId={accountFor?.id}
            onOpenChange={setAccountOpen}
            onCreate={createAccount}
            onCreated={(c) => c.delivery && setNotice({ email: c.email, name: c.officialName, kind: "invite", delivery: c.delivery })}
          />
          <InviteResultDialog notice={notice} onClose={() => setNotice(null)} />
        </>
      )}

      <OfficialEditDialog
        open={perangkat.showEditDialog && !!perangkat.selectedOfficial}
        onOpenChange={perangkat.closeEdit}
        selectedOfficial={perangkat.selectedOfficial}
        isSubmittingAction={perangkat.isSubmittingAction}
        editForm={perangkat.editForm}
        setEditForm={perangkat.setEditForm}
        positions={perangkat.positions}
        supervisorCandidates={perangkat.editSupervisorCandidates}
        coordinatorCandidates={perangkat.editCoordinatorCandidates}
        onSave={perangkat.handleSaveEdit}
      />
    </div>
  );
}
