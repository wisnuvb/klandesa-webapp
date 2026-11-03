"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyDraft,
  draftFromContext,
  patchFromDraft,
  validateDraft,
  type KopDraft,
  type KopErrors,
} from "@/lib/letters/letterhead-draft";
import type { VillagePreviewContext } from "@/lib/letters/values";

export type LetterheadController = {
  status: "loading" | "ready" | "error";
  /** Pesan gagal muat. */
  error: string | null;
  draft: KopDraft | null;
  errors: KopErrors;
  dirty: boolean;
  saving: boolean;
  saveError: string | null;
  /** Nama desa (hanya baca; diatur di Pengaturan Desa). */
  desaNama: string;
  kecamatan: string;
  kabupaten: string;
  change(patch: Partial<Omit<KopDraft, "style">> & { style?: Partial<KopDraft["style"]> }): void;
  /** `true` bila tersimpan. Gagal validasi/jaringan mengembalikan `false` dan mengisi `saveError`/`errors`. */
  save(): Promise<boolean>;
  discard(): void;
  retry(): void;
};

async function errorOf(res: Response, fallback: string): Promise<string> {
  const j = (await res.json().catch(() => null)) as { error?: string } | null;
  return j?.error || fallback;
}

/**
 * Data kop & tanda tangan desa untuk editor jenis surat. `previewContext` = data tersimpan + draf yang
 * sedang diketik, dipakai mengisi kertas sehingga perubahan langsung terlihat sebelum disimpan.
 */
export function useVillageLetterhead(): { controller: LetterheadController; previewContext: VillagePreviewContext | null } {
  const [saved, setSaved] = useState<VillagePreviewContext | null>(null);
  const [draft, setDraft] = useState<KopDraft | null>(null);
  const [status, setStatus] = useState<LetterheadController["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [nonce, setNonce] = useState(0);
  const draftRef = useRef<KopDraft | null>(null);
  const savedRef = useRef<VillagePreviewContext | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/letters/context");
        if (!res.ok) throw new Error(await errorOf(res, "Data desa gagal dimuat"));
        const ctx = (await res.json()) as VillagePreviewContext;
        if (cancelled) return;
        savedRef.current = ctx;
        setSaved(ctx);
        const d = draftFromContext(ctx);
        draftRef.current = d;
        setDraft(d);
        setStatus("ready");
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setError(e instanceof Error ? e.message : "Data desa gagal dimuat");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const savedDraft = useMemo(() => (saved ? draftFromContext(saved) : null), [saved]);
  const dirty = !!draft && !!savedDraft && patchFromDraft(savedDraft, draft) !== null;
  const allErrors = useMemo(() => (draft ? validateDraft(draft) : {}), [draft]);
  const errors = showErrors ? allErrors : {};

  const change = useCallback<LetterheadController["change"]>((patch) => {
    // Ref diperbarui serentak (bukan lewat updater) agar Simpan tepat setelah blur membaca nilai terbaru.
    const d = draftRef.current;
    if (!d) return;
    const { style, ...rest } = patch;
    const next: KopDraft = { ...d, ...rest, style: style ? { ...d.style, ...style } : d.style };
    draftRef.current = next;
    setDraft(next);
    setSaveError(null);
  }, []);

  const save = useCallback(async () => {
    const d = draftRef.current;
    const base = savedRef.current;
    if (!d || !base) return false;
    setShowErrors(true);
    if (Object.keys(validateDraft(d)).length > 0) return false;
    const body = patchFromDraft(draftFromContext(base), d);
    if (!body) return true;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/letters/letterhead", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await errorOf(res, "Perubahan kop gagal disimpan"));
      const next = (await res.json()) as VillagePreviewContext & { ok?: boolean };
      const ctx: VillagePreviewContext = { desa: next.desa, pejabat: next.pejabat, logoUrl: next.logoUrl, kop: next.kop };
      savedRef.current = ctx;
      setSaved(ctx);
      const nd = draftFromContext(ctx);
      draftRef.current = nd;
      setDraft(nd);
      setShowErrors(false);
      return true;
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Perubahan kop gagal disimpan");
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const discard = useCallback(() => {
    const base = savedRef.current;
    if (!base) return;
    const d = draftFromContext(base);
    draftRef.current = d;
    setDraft(d);
    setShowErrors(false);
    setSaveError(null);
  }, []);

  const retry = useCallback(() => {
    setStatus("loading");
    setNonce((n) => n + 1);
  }, []);

  const previewContext = useMemo(() => (saved && draft ? applyDraft(saved, draft) : null), [saved, draft]);

  const controller: LetterheadController = {
    status,
    error,
    draft,
    errors,
    dirty,
    saving,
    saveError,
    desaNama: saved?.desa.nama ?? "",
    kecamatan: saved?.desa.kecamatan ?? "",
    kabupaten: saved?.desa.kabupaten ?? "",
    change,
    save,
    discard,
    retry,
  };
  return { controller, previewContext };
}
