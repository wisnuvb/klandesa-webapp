"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { validateDocument } from "@/lib/letters/document/validate";
import type { LetterDocument } from "@/lib/letters/document/schema";
import { buildStarter } from "../_utils/starters";
import {
  buildCreatePayload,
  buildPatchPayload,
  classifyResponse,
  failureMessage,
  initialPersistState,
  isSettled,
  needsSave,
  persistReducer,
  planNext,
  statusOf,
  type PersistEvent,
  type PersistState,
  type PersistStatus,
  type TemplateMeta,
} from "../_utils/persist";

export type TemplateInfo = TemplateMeta & { id: number | null; isActive: boolean; updatedAt: string | null };

export type UseTemplateDocumentInput = {
  templateId?: number;
  /** Id template katalog yang akan disalin ke desa lalu diedit. */
  forkFromId?: number;
  /** `kosong:<jenis>` atau `contoh:<catalogKey>`. */
  start?: string;
};

export type UseTemplateDocument = {
  status: PersistStatus;
  message: string | null;
  template: TemplateInfo;
  /** Dokumen awal untuk editor; berganti (bersama `docKey`) setiap muat ulang. */
  initialDoc: LetterDocument | null;
  /** Naik tiap dokumen dimuat ulang — pakai sebagai `key` editor agar state-nya segar. */
  docKey: number;
  setMeta(patch: Partial<TemplateMeta>): void;
  /** Panggil dari editor tiap dokumen berubah. */
  onDocumentChange(doc: LetterDocument, revision: number): void;
  /** Simpan sekarang; selesai ketika tidak ada lagi yang menunggu disimpan. */
  saveNow(): Promise<void>;
  /** Muat ulang versi terbaru dari server (membuang perubahan lokal). */
  reload(): void;
  /** Konflik: timpa dengan versi saya. */
  forceSave(): Promise<void>;
  /** Setelah gagal simpan: coba lagi. */
  retry(): void;
  /** Template katalog: salin ke desa lalu edit salinannya. */
  forkFromCatalog(): void;
  lastSavedAt: Date | null;
  /** Jumlah masalah validasi (untuk teks status "Perlu diperbaiki (N)"). */
  invalidCount: number;
};

type ApiTemplate = {
  id: number;
  name: string;
  description: string | null;
  category: string;
  isActive: boolean;
  villageId: number | null;
  isGlobal: boolean;
  updatedAt: string;
  templateStructure: unknown;
};

const EMPTY_META: TemplateMeta = { name: "", description: "", category: "Keterangan" };

async function readError(res: Response): Promise<string | undefined> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error;
}

export function useTemplateDocument(input: UseTemplateDocumentInput): UseTemplateDocument {
  const router = useRouter();
  const pathname = usePathname();

  // Status simpan disimpan di ref + state agar keputusan simpan selalu membaca nilai terbaru.
  const stateRef = useRef<PersistState>(initialPersistState());
  const [state, setState] = useState<PersistState>(stateRef.current);
  const waiters = useRef<Array<() => void>>([]);

  const send = useCallback((e: PersistEvent) => {
    stateRef.current = persistReducer(stateRef.current, e);
    setState(stateRef.current);
    if (isSettled(stateRef.current) && waiters.current.length) {
      const list = waiters.current;
      waiters.current = [];
      for (const w of list) w();
    }
  }, []);

  const [meta, setMetaState] = useState<TemplateMeta>(EMPTY_META);
  const metaRef = useRef<TemplateMeta>(EMPTY_META);
  const [isActive, setIsActive] = useState(true);
  const [initialDoc, setInitialDoc] = useState<LetterDocument | null>(null);
  const [docKey, setDocKey] = useState(0);
  const [loadNonce, setLoadNonce] = useState(0);
  const docRef = useRef<LetterDocument | null>(null);
  /** Id yang kita buat/salin sendiri: perubahan URL ke id ini tidak boleh memicu muat ulang. */
  const ownIdRef = useRef<number | null>(null);
  /** Muat ulang yang diminta operator tidak boleh dilewati walau id-nya milik sendiri. */
  const reloadRequestedRef = useRef(false);

  const applyMeta = useCallback((m: TemplateMeta) => {
    metaRef.current = m;
    setMetaState(m);
  }, []);

  // ------------------------------------------------------------------ muat
  const { templateId, forkFromId, start } = input;
  useEffect(() => {
    const reloadRequested = reloadRequestedRef.current;
    reloadRequestedRef.current = false;
    if (!reloadRequested && templateId != null && templateId === ownIdRef.current) return;
    ownIdRef.current = null;
    let cancelled = false;

    const fail = (kind: "unsupported" | "needsFork", message: string) => {
      if (!cancelled) send({ type: kind, message });
    };
    const adopt = (doc: LetterDocument, m: TemplateMeta, id: number | null, updatedAt: string | null, active = true) => {
      if (cancelled) return;
      docRef.current = doc;
      applyMeta(m);
      setIsActive(active);
      setInitialDoc(doc);
      setDocKey((k) => k + 1);
      send({ type: "ready", templateId: id, updatedAt });
    };
    const fromRow = (row: ApiTemplate): boolean => {
      const v = validateDocument(row.templateStructure);
      if (!v.ok) {
        const legacy = (row.templateStructure as { schemaVersion?: unknown } | null)?.schemaVersion !== 2;
        fail(
          "unsupported",
          legacy
            ? "Jenis surat ini memakai format lama dan belum bisa dibuka di editor kanvas."
            : `Jenis surat ini tidak dapat dibuka: ${v.issues[0]?.message ?? "isinya tidak valid"}.`,
        );
        return false;
      }
      adopt(v.doc, { name: row.name, description: row.description ?? "", category: row.category }, row.id, row.updatedAt, row.isActive);
      return true;
    };

    (async () => {
      // Jeda satu tick: pembaruan state di bawah bukan sinkron dalam badan effect.
      await Promise.resolve();
      if (cancelled) return;
      send({ type: "loading" });
      try {
        if (start) {
          const s = await buildStarter(start);
          if (!s) return fail("unsupported", "Pilihan awal tidak dikenal.");
          adopt(s.doc, { name: s.name, description: s.description, category: s.category }, null, null);
          return;
        }
        if (forkFromId != null) {
          const res = await fetch(`/api/mail-templates/${forkFromId}/duplicate`, { method: "POST" });
          if (!res.ok) return fail("unsupported", (await readError(res)) ?? "Gagal menyalin contoh surat ke desa.");
          const row = (await res.json()) as ApiTemplate;
          if (cancelled) return;
          ownIdRef.current = row.id;
          if (fromRow(row)) router.replace(`${pathname}?templateId=${row.id}`);
          return;
        }
        if (templateId != null) {
          const res = await fetch(`/api/mail-templates/${templateId}`);
          if (!res.ok) return fail("unsupported", res.status === 404 ? "Jenis surat tidak ditemukan." : ((await readError(res)) ?? "Gagal memuat jenis surat."));
          const row = (await res.json()) as ApiTemplate;
          if (row.villageId == null) {
            applyMeta({ name: row.name, description: row.description ?? "", category: row.category });
            return fail("needsFork", "Ini contoh bawaan sistem dan tidak bisa diubah langsung. Salin dulu ke desa Anda.");
          }
          fromRow(row);
          return;
        }
        fail("unsupported", "Pilih jenis surat yang akan diubah.");
      } catch {
        fail("unsupported", "Tidak tersambung ke server. Periksa koneksi lalu muat ulang.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [templateId, forkFromId, start, loadNonce, send, applyMeta, router, pathname]);

  // ------------------------------------------------------------------ simpan
  const runSave = useCallback(async () => {
    const before = stateRef.current;
    const doc = docRef.current;
    if (before.phase === "inflight" || !doc) return;

    const docDirty = before.revision > before.savedRevision;
    const metaSnapshot = metaRef.current;
    const metaDirty = before.metaDirty;
    const forced = before.forced;
    send({ type: "saveStarted" });

    try {
      let res: Response;
      if (before.templateId == null) {
        if (metaSnapshot.name.trim() === "") {
          return send({ type: "saveFailed", httpStatus: 400, message: "Beri nama jenis surat dulu sebelum disimpan." });
        }
        res = await fetch("/api/mail-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildCreatePayload(metaSnapshot, doc)),
        });
      } else {
        res = await fetch("/api/mail-templates", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            buildPatchPayload({
              id: before.templateId,
              expectedUpdatedAt: before.updatedAt ?? new Date(0).toISOString(),
              doc,
              docDirty,
              forced,
              metaDirty,
            }),
          ),
        });
      }

      const kind = classifyResponse(res.status);
      if (kind === "ok") {
        const row = (await res.json()) as ApiTemplate;
        send({ type: "saveSucceeded", templateId: row.id, updatedAt: row.updatedAt, at: Date.now() });
        if (before.templateId == null) {
          ownIdRef.current = row.id;
          router.replace(`${pathname}?templateId=${row.id}`);
        }
      } else if (kind === "conflict") {
        send({ type: "saveConflict" });
      } else {
        send({ type: "saveFailed", httpStatus: res.status, message: failureMessage(res.status, await readError(res)) });
      }
    } catch {
      send({ type: "saveFailed", httpStatus: null, message: failureMessage(null) });
    }
  }, [send, router, pathname]);

  // Jadwal simpan: debounce untuk perubahan, backoff untuk kegagalan sementara.
  useEffect(() => {
    const plan = planNext(state);
    if (!plan) return;
    const id = window.setTimeout(() => void runSave(), plan.delayMs);
    return () => window.clearTimeout(id);
  }, [state, runSave]);

  // Peringatan tutup tab saat masih ada yang belum tersimpan.
  const unsaved = (state.phase === "idle" || state.phase === "inflight" || state.phase === "error" || state.phase === "conflict") && (needsSave(state) || state.phase === "inflight");
  useEffect(() => {
    if (!unsaved) return;
    const onBeforeUnload = (ev: BeforeUnloadEvent) => {
      ev.preventDefault();
      ev.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [unsaved]);

  // ----------------------------------------------------------------- aksi
  const onDocumentChange = useCallback(
    (doc: LetterDocument, revision: number) => {
      docRef.current = doc;
      const v = validateDocument(doc);
      send({ type: "docChanged", revision, invalidCount: v.ok ? 0 : v.issues.length });
    },
    [send],
  );

  const setMeta = useCallback(
    (patch: Partial<TemplateMeta>) => {
      applyMeta({ ...metaRef.current, ...patch });
      send({ type: "metaChanged", patch });
    },
    [applyMeta, send],
  );

  const saveNow = useCallback(() => {
    return new Promise<void>((resolve) => {
      waiters.current.push(resolve);
      send({ type: "saveRequested" });
    });
  }, [send]);

  const reload = useCallback(() => {
    reloadRequestedRef.current = true;
    setLoadNonce((n) => n + 1);
  }, []);

  const forceSave = useCallback(async () => {
    const id = stateRef.current.templateId;
    if (id == null) return;
    try {
      const res = await fetch(`/api/mail-templates/${id}`);
      if (!res.ok) throw new Error("gagal");
      const row = (await res.json()) as ApiTemplate;
      send({ type: "overwriteRequested", updatedAt: row.updatedAt });
    } catch {
      send({ type: "saveFailed", httpStatus: null, message: failureMessage(null) });
    }
  }, [send]);

  const retry = useCallback(() => send({ type: "retryRequested" }), [send]);

  const forkFromCatalog = useCallback(() => {
    if (templateId != null) router.replace(`${pathname}?forkFromId=${templateId}`);
  }, [router, pathname, templateId]);

  return {
    status: statusOf(state),
    message: state.message,
    template: { id: state.templateId, ...meta, isActive, updatedAt: state.updatedAt },
    initialDoc,
    docKey,
    setMeta,
    onDocumentChange,
    saveNow,
    reload,
    forceSave,
    retry,
    forkFromCatalog,
    lastSavedAt: state.lastSavedAt != null ? new Date(state.lastSavedAt) : null,
    invalidCount: state.invalidCount,
  };
}
