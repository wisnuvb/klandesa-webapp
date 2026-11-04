"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";
import { usePersistedTab } from "@/hooks/usePersistedTab";
import {
  DATA_PERANGKAT_VIEW_TABS,
  type DataPerangkatViewTab,
  type EditFormState,
  type OfficialRow,
  type Position,
} from "../_lib/types";
import {
  coordinatorCandidates,
  DEFAULT_ORG_SETTINGS,
  supervisorCandidates,
  type OrgSettings,
} from "@/lib/officials/org";

function defaultEditForm(): EditFormState {
  return {
    name: "",
    phone: "",
    email: "",
    status: "ACTIVE",
    positionId: "",
    supervisorId: "none",
    coordinatorId: "none",
    address: "",
  };
}

export function useDataPerangkat() {
  const { appConfirm } = useAppDialogs();

  const [viewTab, setViewTab] = usePersistedTab<DataPerangkatViewTab>(
    "data-perangkat",
    "table",
    DATA_PERANGKAT_VIEW_TABS,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [filterPosition, setFilterPosition] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showFormDialog, setShowFormDialog] = useState(false);

  const [positions, setPositions] = useState<Position[]>([]);
  const [officials, setOfficials] = useState<OfficialRow[]>([]);
  // Daftar lengkap tanpa filter: dipakai bagan dan kandidat atasan agar tidak ikut tersaring.
  const [directory, setDirectory] = useState<OfficialRow[]>([]);
  const [orgSettings, setOrgSettings] = useState<OrgSettings>(DEFAULT_ORG_SETTINGS);
  const [totalPerangkat, setTotalPerangkat] = useState(0);
  const [activePerangkat, setActivePerangkat] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedOfficial, setSelectedOfficial] = useState<OfficialRow | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>(() => defaultEditForm());

  const filtersActive =
    searchQuery.trim() !== "" || filterPosition !== "all" || filterStatus !== "all";

  const loadDirectory = useCallback(async () => {
    try {
      const res = await fetch("/api/officials?page=1&pageSize=100");
      if (!res.ok) return;
      const data: { rows: OfficialRow[]; orgSettings?: OrgSettings } = await res.json();
      setDirectory(data.rows);
      if (data.orgSettings) setOrgSettings(data.orgSettings);
    } catch (error) {
      console.error("Gagal memuat daftar perangkat lengkap:", error);
    }
  }, []);

  const loadOfficials = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({ page: "1", pageSize: "100" });
        if (searchQuery.trim()) params.set("search", searchQuery.trim());
        if (filterPosition !== "all") params.set("positionId", filterPosition);
        if (filterStatus !== "all") params.set("status", filterStatus);

        const res = await fetch(`/api/officials?${params.toString()}`, { signal });
        if (!res.ok) throw new Error("Failed to fetch officials");

        const data: {
          rows: OfficialRow[];
          positions: Position[];
          total: number;
          activeCount: number;
          orgSettings?: OrgSettings;
        } = await res.json();

        setOfficials(data.rows);
        if (data.orgSettings) setOrgSettings(data.orgSettings);
        // Tanpa filter, hasilnya sudah daftar lengkap: tidak perlu permintaan kedua.
        if (!params.has("search") && !params.has("positionId") && !params.has("status")) {
          setDirectory(data.rows);
        }
        setPositions(data.positions);
        setTotalPerangkat(data.total);
        setActivePerangkat(data.activeCount);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Gagal memuat data perangkat:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [filterPosition, filterStatus, searchQuery],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadOfficials(controller.signal);
    return () => controller.abort();
  }, [loadOfficials]);

  // Saat filter aktif, daftar lengkap perlu diambil terpisah (sekali, lalu setelah tiap perubahan data).
  useEffect(() => {
    if (filtersActive) void loadDirectory();
  }, [filtersActive, loadDirectory]);

  /** Muat ulang setelah data berubah: tabel (sesuai filter) dan daftar lengkap. */
  const reload = useCallback(async () => {
    await Promise.all([loadOfficials(), filtersActive ? loadDirectory() : Promise.resolve()]);
  }, [filtersActive, loadDirectory, loadOfficials]);

  const filteredData = officials;

  const openDetail = useCallback((official: OfficialRow) => {
    setSelectedOfficial(official);
    setShowDetailDialog(true);
  }, []);

  const closeDetail = useCallback((open: boolean) => {
    setShowDetailDialog(open);
    if (!open) setSelectedOfficial(null);
  }, []);

  const openEdit = useCallback((official: OfficialRow) => {
    setSelectedOfficial(official);
    setEditForm({
      name: official.name,
      phone: official.phone ?? "",
      email: official.email ?? "",
      status: official.status?.toUpperCase() === "ACTIVE" ? "ACTIVE" : "INACTIVE",
      positionId: official.position?.id?.toString() ?? "",
      supervisorId:
        official.supervisorId === null || official.supervisorId === undefined
          ? "none"
          : String(official.supervisorId),
      coordinatorId:
        official.coordinatorId === null || official.coordinatorId === undefined
          ? "none"
          : String(official.coordinatorId),
      address: official.address ?? "",
    });
    setShowEditDialog(true);
  }, []);

  const closeEdit = useCallback((open: boolean) => {
    setShowEditDialog(open);
    if (!open) {
      setSelectedOfficial(null);
      setEditForm(defaultEditForm());
    }
  }, []);

  const handleDelete = useCallback(
    async (official: OfficialRow) => {
      const ok = await appConfirm({
        title: "Hapus perangkat?",
        description: `Hapus perangkat ${official.name}? Tindakan ini tidak bisa dibatalkan.`,
        confirmLabel: "Hapus",
        tone: "destructive",
      });
      if (!ok) return;

      try {
        setIsSubmittingAction(true);
        const res = await fetch(`/api/officials/${official.id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal menghapus perangkat");
        }

        toast.success("Perangkat berhasil dihapus");
        await reload();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Terjadi kesalahan";
        toast.error(message);
      } finally {
        setIsSubmittingAction(false);
      }
    },
    [appConfirm, reload],
  );

  const editPosition = useMemo(
    () =>
      positions.find((position) => String(position.id) === editForm.positionId) ??
      selectedOfficial?.position ??
      null,
    [editForm.positionId, positions, selectedOfficial],
  );

  const editSupervisorCandidates = useMemo(
    () =>
      supervisorCandidates({
        position: editPosition,
        officials: directory,
        selfId: selectedOfficial?.id,
        settings: orgSettings,
        currentSupervisorId: selectedOfficial?.supervisorId ?? null,
      }),
    [directory, editPosition, orgSettings, selectedOfficial],
  );

  const editCoordinatorCandidates = useMemo(
    () =>
      coordinatorCandidates({
        position: editPosition,
        officials: directory,
        selfId: selectedOfficial?.id,
        currentCoordinatorId: selectedOfficial?.coordinatorId ?? null,
      }),
    [directory, editPosition, selectedOfficial],
  );

  const handleSaveEdit = useCallback(async () => {
    if (!selectedOfficial) return;
    if (!editForm.name.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    if (!editForm.positionId) {
      toast.error("Jabatan wajib dipilih");
      return;
    }

    try {
      setIsSubmittingAction(true);
      const res = await fetch(`/api/officials/${selectedOfficial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          phone_number: editForm.phone || null,
          email: editForm.email || null,
          status: editForm.status,
          village_staff_position_id: editForm.positionId,
          supervisor_id:
            editForm.supervisorId === "none" ? null : Number(editForm.supervisorId),
          coordinator_id:
            editForm.coordinatorId === "none" ? null : Number(editForm.coordinatorId),
          address: editForm.address,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal memperbarui perangkat");
      }

      toast.success("Perangkat berhasil diperbarui");
      setShowEditDialog(false);
      setSelectedOfficial(null);
      await reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      toast.error(message);
    } finally {
      setIsSubmittingAction(false);
    }
  }, [editForm, reload, selectedOfficial]);

  return {
    viewTab,
    setViewTab,

    searchQuery,
    setSearchQuery,
    filterPosition,
    setFilterPosition,
    filterStatus,
    setFilterStatus,

    showFormDialog,
    setShowFormDialog,

    positions,
    officials,
    filteredData,
    totalPerangkat,
    activePerangkat,
    isLoading,

    selectedOfficial,
    showDetailDialog,
    closeDetail,
    showEditDialog,
    closeEdit,

    isSubmittingAction,
    editForm,
    setEditForm,
    editSupervisorCandidates,
    editCoordinatorCandidates,

    directory,
    orgSettings,
    setOrgSettings,

    loadOfficials,
    reload,
    openDetail,
    openEdit,
    handleDelete,
    handleSaveEdit,
  };
}

