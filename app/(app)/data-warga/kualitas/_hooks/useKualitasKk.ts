"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { normalizeAsyncError, throwApiError, type AsyncPageError } from "@/lib/modules/client-error";
import {
  bulkResultMessage,
  isBulkSafe,
  suggestionPatch,
  type KualitasResponse,
  type SuggestionView,
  type WorkItemView,
} from "@/lib/kependudukan/labels";
import type { WorkKind } from "@/lib/kependudukan/worklist";

const PAGE_STEP = 20;
const MAX_LIMIT = 100;
const BASE = "/api/kependudukan/kualitas";

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { cache: "no-store", signal });
  const body = await res.json().catch(() => null);
  if (!res.ok) throwApiError(body, "Gagal memuat daftar perbaikan data");
  return body as T;
}

async function patchResident(id: number, body: Record<string, string>): Promise<void> {
  const res = await fetch(`/api/residents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    throw new Error(typeof j?.error === "string" ? j.error : "Perubahan gagal disimpan");
  }
}

export interface BulkProgress {
  done: number;
  total: number;
}

export function useKualitasKk() {
  const [kind, setKind] = useState<WorkKind | "ALL">("ALL");
  const [visible, setVisible] = useState(PAGE_STEP);
  const [data, setData] = useState<KualitasResponse | null>(null);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AsyncPageError | null>(null);
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const reqSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++reqSeq.current;
    setError(null);
    try {
      const q = new URLSearchParams({ limit: String(Math.min(visible, MAX_LIMIT)) });
      if (kind !== "ALL") q.set("kind", kind);
      const [list, confident] = await Promise.all([
        getJson<KualitasResponse>(`${BASE}?${q}`),
        getJson<KualitasResponse>(`${BASE}?confidence=TINGGI&limit=1`),
      ]);
      if (seq !== reqSeq.current) return; // jawaban lama, abaikan
      setData(list);
      setBulkTotal(confident.total);
    } catch (e) {
      if (seq !== reqSeq.current) return;
      setError(normalizeAsyncError(e) ?? "Gagal memuat daftar perbaikan data");
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  }, [kind, visible]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectKind = useCallback((k: WorkKind | "ALL") => {
    setKind(k);
    setVisible(PAGE_STEP);
    setLoading(true);
  }, []);

  const loadMore = useCallback(() => setVisible((v) => Math.min(v + PAGE_STEP, MAX_LIMIT)), []);

  const skip = useCallback((id: string) => {
    setSkipped((prev) => new Set(prev).add(id));
    setAnnouncement("Temuan dilewati untuk sementara. Akan muncul lagi saat halaman dimuat ulang.");
  }, []);

  const undo = useCallback(
    async (undos: Array<{ id: number; body: Record<string, string> }>) => {
      let failed = 0;
      for (const u of undos) {
        try {
          await patchResident(u.id, u.body);
        } catch {
          failed += 1;
        }
      }
      await load();
      if (failed) toast.error(`${failed} perubahan gagal diurungkan. Periksa lewat Data Warga.`);
      else {
        toast.success("Perubahan diurungkan.");
        setAnnouncement("Perubahan diurungkan.");
      }
    },
    [load],
  );

  const apply = useCallback(
    async (item: WorkItemView, s: SuggestionView) => {
      const patch = suggestionPatch(s);
      if (!patch) return;
      const key = `${item.id}:${s.type}:${s.residentId}`;
      setBusy((prev) => new Set(prev).add(key));
      try {
        await patchResident(s.residentId, patch.apply);
        await load();
        const msg = `Diterapkan untuk ${s.person.name}.`;
        setAnnouncement(msg);
        toast.success(msg, {
          duration: 10000,
          action: { label: "Urungkan", onClick: () => void undo([{ id: s.residentId, body: patch.undo }]) },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Perubahan gagal disimpan";
        setAnnouncement(`Gagal: ${msg}`);
        toast.error(`Belum berhasil: ${msg}. Coba lagi, atau ubah lewat Data Warga.`);
      } finally {
        setBusy((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [load, undo],
  );

  /** Terapkan semua saran "yakin" satu per satu (urut), lalu hitung ulang daftar dari server. */
  const applyAllConfident = useCallback(async () => {
    setBulkProgress({ done: 0, total: bulkTotal });
    let done = 0;
    let failed = 0;
    const undos: Array<{ id: number; body: Record<string, string> }> = [];
    try {
      const all = await getJson<KualitasResponse>(`${BASE}?confidence=TINGGI&limit=${MAX_LIMIT}`);
      const todo = all.items.filter(isBulkSafe);
      setBulkProgress({ done: 0, total: todo.length });
      for (const item of todo) {
        const s = item.suggestions[0];
        const patch = suggestionPatch(s);
        if (!patch) continue;
        try {
          await patchResident(s.residentId, patch.apply);
          undos.push({ id: s.residentId, body: patch.undo });
          done += 1;
        } catch {
          failed += 1;
        }
        setBulkProgress({ done: done + failed, total: todo.length });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat saran yang yakin");
    } finally {
      setBulkProgress(null);
      await load();
    }
    const msg = bulkResultMessage(done, failed);
    setAnnouncement(msg);
    if (done > 0) {
      toast.success(msg, { duration: 15000, action: { label: "Urungkan semua", onClick: () => void undo(undos) } });
    } else {
      toast.error(msg);
    }
  }, [bulkTotal, load, undo]);

  const items = (data?.items ?? []).filter((i) => !skipped.has(i.id));

  return {
    kind,
    selectKind,
    data,
    items,
    total: data?.total ?? 0,
    canLoadMore: Boolean(data && data.items.length < data.total && visible < MAX_LIMIT),
    capped: Boolean(data && data.total > MAX_LIMIT && visible >= MAX_LIMIT),
    loadMore,
    loading,
    error,
    reload: () => {
      setLoading(true);
      void load();
    },
    skip,
    skippedCount: skipped.size,
    busy,
    apply,
    bulkTotal,
    bulkProgress,
    applyAllConfident,
    announcement,
  };
}
