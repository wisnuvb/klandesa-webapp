"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { AttachmentEntityType } from "@/lib/attachments/catalog";
import { unlinkAttachment, uploadAndAttach, validateAttachmentFile } from "@/lib/attachments/client";

export interface AttachmentItem {
  id: number;
  archiveId: number;
  label: string;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  missing: boolean;
}

export interface UploadState {
  key: number;
  name: string;
  progress: number;
  error?: string;
}

export interface FlushResult {
  uploaded: number;
  failed: Array<{ name: string; error: string }>;
}

const msg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/**
 * Lampiran satu rekaman. Dua mode:
 *  - rekaman sudah ada (`entityId` terisi): daftar dimuat dari server, berkas langsung diunggah dan ditautkan;
 *  - rekaman baru (`entityId` null): berkas dipilih dulu dan ditampung, lalu `flush(idBaru)` setelah rekaman tersimpan.
 */
export function useAttachments(type: AttachmentEntityType, entityId: number | null) {
  const live = entityId !== null;
  const [items, setItems] = useState<AttachmentItem[]>([]);
  const [canEdit, setCanEdit] = useState(true);
  const [loading, setLoading] = useState(live);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [flushing, setFlushing] = useState(false);
  const seq = useRef(0);

  const reload = useCallback(async () => {
    if (entityId === null) return;
    try {
      const res = await fetch(`/api/lampiran?type=${type}&id=${entityId}`, { cache: "no-store" });
      const j = (await res.json().catch(() => null)) as { items?: AttachmentItem[]; canEdit?: boolean; error?: string } | null;
      if (!res.ok) throw new Error(j?.error ?? "Gagal memuat lampiran.");
      setItems(j?.items ?? []);
      setCanEdit(j?.canEdit !== false);
      setLoadError(null);
    } catch (e) {
      setLoadError(msg(e, "Gagal memuat lampiran."));
    } finally {
      setLoading(false);
    }
  }, [type, entityId]);

  useEffect(() => {
    if (entityId === null) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void reload();
  }, [entityId, reload]);

  const addFiles = useCallback(
    async (input: FileList | File[]) => {
      const files = Array.from(input);
      const problems: string[] = [];
      const accepted: File[] = [];
      for (const f of files) {
        const bad = validateAttachmentFile(f);
        if (bad) problems.push(`${f.name}: ${bad}`);
        else accepted.push(f);
      }
      setRejected(problems);
      setActionError(null);
      if (entityId === null) {
        setQueue((q) => [...q, ...accepted]);
        return;
      }
      for (const f of accepted) {
        const key = ++seq.current;
        setUploads((u) => [...u, { key, name: f.name, progress: 0 }]);
        try {
          await uploadAndAttach(f, type, entityId, (progress) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, progress } : x))));
          setUploads((u) => u.filter((x) => x.key !== key));
          await reload();
        } catch (e) {
          setUploads((u) => u.map((x) => (x.key === key ? { ...x, error: msg(e, "Gagal mengunggah.") } : x)));
        }
      }
    },
    [type, entityId, reload],
  );

  const dismissUpload = useCallback((key: number) => setUploads((u) => u.filter((x) => x.key !== key)), []);
  const removeQueued = useCallback((index: number) => setQueue((q) => q.filter((_, i) => i !== index)), []);

  const removeItem = useCallback(
    async (id: number) => {
      setActionError(null);
      try {
        await unlinkAttachment(id);
        await reload();
      } catch (e) {
        setActionError(msg(e, "Gagal melepas lampiran."));
      }
    },
    [reload],
  );

  /** Unggah antrean ke rekaman yang baru disimpan. Berkas yang gagal tetap di antrean. */
  const flush = useCallback(
    async (newId: number): Promise<FlushResult> => {
      const failed: FlushResult["failed"] = [];
      const left: File[] = [];
      let uploaded = 0;
      for (const f of queue) {
        try {
          await uploadAndAttach(f, type, newId);
          uploaded += 1;
        } catch (e) {
          failed.push({ name: f.name, error: msg(e, "Gagal mengunggah.") });
          left.push(f);
        }
      }
      setQueue(left);
      return { uploaded, failed };
    },
    [queue, type],
  );

  /** `flush` + pemberitahuan bila ada berkas yang gagal (data induk sudah tersimpan; berkas bisa ditambahkan lagi dari form ubah). */
  const flushAndNotify = useCallback(
    async (newId: number): Promise<FlushResult> => {
      if (queue.length === 0) return { uploaded: 0, failed: [] };
      setFlushing(true);
      try {
        const r = await flush(newId);
        if (r.failed.length) {
          toast.error(`Data tersimpan, tetapi ${r.failed.length} lampiran gagal diunggah.`, {
            description: `${r.failed[0].name}: ${r.failed[0].error} Buka data ini lalu tambahkan lampiran lagi.`,
          });
        }
        return r;
      } finally {
        setFlushing(false);
      }
    },
    [flush, queue.length],
  );

  return { live, flushing, flushAndNotify, items, canEdit, loading, loadError, queue, uploads, rejected, actionError, addFiles, dismissUpload, removeQueued, removeItem, flush, reload };
}

export type AttachmentsApi = ReturnType<typeof useAttachments>;
