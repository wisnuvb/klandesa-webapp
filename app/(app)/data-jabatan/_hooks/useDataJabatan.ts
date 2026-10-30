"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";
import { usePersistedTab } from "@/hooks/usePersistedTab";
import {
  DATA_JABATAN_VIEW_TABS,
  type DataJabatanViewTab,
  type Jabatan,
} from "../_lib/types";

const SEARCH_DEBOUNCE_MS = 300;

async function readErrorMessage(res: Response, fallback: string) {
  const body: { error?: string } | null = await res.json().catch(() => null);
  return body?.error || fallback;
}

export function useDataJabatan() {
  const { appAlert, appConfirm } = useAppDialogs();

  const [viewTab, setViewTab] = usePersistedTab<DataJabatanViewTab>(
    "data-jabatan",
    "table",
    DATA_JABATAN_VIEW_TABS,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingJabatan, setEditingJabatan] = useState<Jabatan | null>(null);
  const [jabatanList, setJabatanList] = useState<Jabatan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(searchQuery.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadJabatan = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({ page: "1", pageSize: "100" });
        if (debouncedSearch) params.set("search", debouncedSearch);

        const res = await fetch(`/api/positions?${params.toString()}`, {
          signal,
        });
        if (!res.ok) {
          throw new Error(await readErrorMessage(res, "Gagal memuat data jabatan"));
        }
        const data: { rows: Jabatan[] } = await res.json();

        setJabatanList(data.rows);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Gagal memuat data jabatan:", error);
        toast.error(
          error instanceof Error ? error.message : "Gagal memuat data jabatan",
        );
      } finally {
        // Permintaan yang dibatalkan digantikan permintaan baru, yang mengurus status loading-nya.
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [debouncedSearch],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadJabatan(controller.signal);
    return () => controller.abort();
  }, [loadJabatan]);

  const openCreate = useCallback(() => {
    setEditingJabatan(null);
    setShowFormDialog(true);
  }, []);

  const openEdit = useCallback((jabatan: Jabatan) => {
    setEditingJabatan(jabatan);
    setShowFormDialog(true);
  }, []);

  const handleDelete = useCallback(
    async (jabatan: Jabatan) => {
      if (deletingId !== null) return;

      if (jabatan.total_staff > 0) {
        await appAlert({
          title: "Jabatan tidak dapat dihapus",
          description: `${jabatan.name} masih dipakai oleh ${jabatan.total_staff} perangkat desa. Pindahkan perangkat tersebut ke jabatan lain, atau ubah status jabatan menjadi Tidak Aktif.`,
          confirmLabel: "Mengerti",
        });
        return;
      }

      const ok = await appConfirm({
        title: "Hapus jabatan?",
        description: `Jabatan "${jabatan.name}" akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`,
        confirmLabel: "Hapus",
        tone: "destructive",
      });
      if (!ok) return;

      try {
        setDeletingId(jabatan.id);
        const res = await fetch(`/api/positions/${jabatan.id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          throw new Error(await readErrorMessage(res, "Gagal menghapus jabatan"));
        }

        setJabatanList((prev) => prev.filter((j) => j.id !== jabatan.id));
        toast.success(`Jabatan "${jabatan.name}" berhasil dihapus`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Gagal menghapus jabatan",
        );
        // Data di layar mungkin basi (mis. perangkat baru memakai jabatan ini): sinkronkan ulang.
        void loadJabatan();
      } finally {
        setDeletingId(null);
      }
    },
    [appAlert, appConfirm, deletingId, loadJabatan],
  );

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
    editingJabatan,
    openCreate,
    openEdit,

    jabatanList,
    filteredData,
    isLoading,
    deletingId,

    totalJabatan,
    filledPositions,
    totalStaff,

    loadJabatan,
    handleDelete,
  };
}
