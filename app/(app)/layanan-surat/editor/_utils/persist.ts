/**
 * Logika simpan editor template — MURNI (tanpa React/jaringan) agar bisa diuji.
 *
 * Aturan inti:
 * - Autosave hanya untuk dokumen yang lolos validasi; yang tidak lolos berstatus `invalid`.
 * - Satu permintaan simpan berjalan sekaligus; perubahan yang terjadi saat menyimpan memicu
 *   simpan lagi setelahnya (tidak hilang).
 * - 409 = template diubah di tempat lain → berhenti, operator memilih muat ulang / timpa.
 * - Gangguan jaringan/5xx diulang dengan jeda bertahap (maks 5 kali), lalu menunggu "Coba lagi".
 */
import { flattenBlocks } from "@/lib/letters/document/validate";
import type { Inline, LetterDocument } from "@/lib/letters/document/schema";

export const AUTOSAVE_DEBOUNCE_MS = 1500;
export const MAX_AUTO_RETRIES = 5;
const BACKOFF_BASE_MS = 2000;
const BACKOFF_MAX_MS = 30_000;

export type TemplateMeta = { name: string; description: string; category: string };

export type PersistPhase =
  | "loading"
  | "idle"
  | "inflight"
  | "conflict"
  | "error"
  | "unsupported"
  | "needsFork";

export type PersistStatus =
  | "loading"
  | "ready"
  | "saving"
  | "saved"
  | "invalid"
  | "conflict"
  | "error"
  | "unsupported"
  | "needsFork";

export type PersistState = {
  phase: PersistPhase;
  message: string | null;
  /** null = belum pernah disimpan (template baru dari contoh/kosong). */
  templateId: number | null;
  /** `updatedAt` server terakhir yang kita ketahui (untuk `expectedUpdatedAt`). */
  updatedAt: string | null;
  revision: number;
  savedRevision: number;
  /** Perubahan nama/deskripsi/kategori yang belum tersimpan. */
  metaDirty: Partial<TemplateMeta>;
  inFlight: { revision: number; meta: Partial<TemplateMeta>; forced: boolean } | null;
  /** Jumlah masalah validasi dokumen saat ini (0 = lolos). */
  invalidCount: number;
  /** Simpan walau tidak ada perubahan (tombol Simpan / timpa / coba lagi). */
  forced: boolean;
  attempt: number;
  retryable: boolean;
  lastSavedAt: number | null;
};

export function initialPersistState(): PersistState {
  return {
    phase: "loading",
    message: null,
    templateId: null,
    updatedAt: null,
    revision: 0,
    savedRevision: 0,
    metaDirty: {},
    inFlight: null,
    invalidCount: 0,
    forced: false,
    attempt: 0,
    retryable: true,
    lastSavedAt: null,
  };
}

export type PersistEvent =
  | { type: "loading" }
  | { type: "ready"; templateId: number | null; updatedAt: string | null }
  | { type: "unsupported"; message: string }
  | { type: "needsFork"; message: string }
  | { type: "docChanged"; revision: number; invalidCount: number }
  | { type: "metaChanged"; patch: Partial<TemplateMeta> }
  | { type: "saveRequested" }
  | { type: "saveStarted" }
  | { type: "saveSucceeded"; templateId: number; updatedAt: string; at: number }
  | { type: "saveConflict" }
  | { type: "saveFailed"; httpStatus: number | null; message: string }
  | { type: "retryRequested" }
  | { type: "overwriteRequested"; updatedAt: string };

/** true bila ada sesuatu yang perlu disimpan. */
export function needsSave(s: PersistState): boolean {
  return s.forced || s.revision > s.savedRevision || Object.keys(s.metaDirty).length > 0;
}

export function persistReducer(s: PersistState, e: PersistEvent): PersistState {
  switch (e.type) {
    case "loading":
      return initialPersistState();
    case "ready":
      return {
        ...initialPersistState(),
        phase: "idle",
        templateId: e.templateId,
        updatedAt: e.updatedAt,
      };
    case "unsupported":
      return { ...s, phase: "unsupported", message: e.message };
    case "needsFork":
      return { ...s, phase: "needsFork", message: e.message };
    case "docChanged": {
      if (s.phase === "loading" || s.phase === "unsupported" || s.phase === "needsFork") return s;
      return { ...s, revision: Math.max(s.revision, e.revision), invalidCount: e.invalidCount };
    }
    case "metaChanged":
      if (s.phase === "loading" || s.phase === "unsupported" || s.phase === "needsFork") return s;
      return { ...s, metaDirty: { ...s.metaDirty, ...e.patch } };
    case "saveRequested":
      if (s.phase === "loading" || s.phase === "unsupported" || s.phase === "needsFork") return s;
      return { ...s, forced: true };
    case "saveStarted":
      if (s.phase === "inflight") return s;
      return {
        ...s,
        phase: "inflight",
        message: null,
        forced: false,
        inFlight: { revision: s.revision, meta: { ...s.metaDirty }, forced: s.forced },
      };
    case "saveSucceeded": {
      const sent = s.inFlight;
      const metaDirty = { ...s.metaDirty };
      if (sent) {
        for (const k of Object.keys(sent.meta) as Array<keyof TemplateMeta>) {
          // Hanya bersihkan bila tidak diubah lagi selama permintaan berjalan.
          if (metaDirty[k] === sent.meta[k]) delete metaDirty[k];
        }
      }
      return {
        ...s,
        phase: "idle",
        message: null,
        templateId: e.templateId,
        updatedAt: e.updatedAt,
        savedRevision: sent ? sent.revision : s.revision,
        metaDirty,
        inFlight: null,
        attempt: 0,
        retryable: true,
        lastSavedAt: e.at,
      };
    }
    case "saveConflict":
      return {
        ...s,
        phase: "conflict",
        message: "Jenis surat ini sudah diubah di tempat lain.",
        forced: s.forced || (s.inFlight?.forced ?? false),
        inFlight: null,
      };
    case "saveFailed": {
      const retryable = isRetryableHttp(e.httpStatus);
      return {
        ...s,
        phase: "error",
        message: e.message,
        forced: s.forced || (s.inFlight?.forced ?? false),
        inFlight: null,
        attempt: s.attempt + 1,
        retryable,
      };
    }
    case "retryRequested":
      if (s.phase !== "error") return s;
      return { ...s, phase: "idle", message: null, attempt: 0, retryable: true, forced: true };
    case "overwriteRequested":
      return {
        ...s,
        phase: "idle",
        message: null,
        updatedAt: e.updatedAt,
        forced: true,
        attempt: 0,
        retryable: true,
      };
  }
}

/** Status untuk UI, diturunkan dari state. */
export function statusOf(s: PersistState): PersistStatus {
  switch (s.phase) {
    case "loading":
    case "conflict":
    case "error":
    case "unsupported":
    case "needsFork":
      return s.phase;
    case "inflight":
      return "saving";
    case "idle":
      if (s.invalidCount > 0 && needsSave(s)) return "invalid";
      if (needsSave(s)) return "ready";
      return s.lastSavedAt != null ? "saved" : "ready";
  }
}

/** Respons HTTP yang masuk akal untuk diulang (gangguan sementara). `null` = jaringan putus. */
export function isRetryableHttp(status: number | null): boolean {
  if (status == null) return true;
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export function classifyResponse(status: number): "ok" | "conflict" | "retry" | "fatal" {
  if (status >= 200 && status < 300) return "ok";
  if (status === 409) return "conflict";
  return isRetryableHttp(status) ? "retry" : "fatal";
}

export function backoffMs(attempt: number): number {
  return Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, attempt - 1));
}

/** Pesan ramah untuk kegagalan simpan. */
export function failureMessage(status: number | null, serverMessage?: string): string {
  if (status == null) return "Tidak tersambung ke server. Perubahan Anda belum tersimpan.";
  if (status === 401 || status === 403) return "Sesi berakhir atau Anda tidak berhak mengubah jenis surat ini.";
  if (status === 404) return "Jenis surat tidak ditemukan.";
  if (status === 413) return "Jenis surat terlalu besar untuk disimpan.";
  if (status >= 500) return "Server sedang bermasalah. Perubahan Anda belum tersimpan.";
  return serverMessage || "Gagal menyimpan.";
}

/** Kapan simpan berikutnya dijalankan (ms), atau null bila tidak ada yang perlu dijadwalkan. */
export function planNext(s: PersistState): { delayMs: number } | null {
  switch (s.phase) {
    case "loading":
    case "conflict":
    case "unsupported":
    case "needsFork":
    case "inflight":
      return null;
    case "error":
      if (!s.retryable || s.attempt >= MAX_AUTO_RETRIES || !needsSave(s)) return null;
      return { delayMs: backoffMs(s.attempt) };
    case "idle":
      if (!needsSave(s)) return null;
      // Dokumen tidak valid tidak dikirim; kecuali operator sengaja menekan Simpan? Tetap tidak:
      // server menolak dokumen v2 yang rusak.
      if (s.invalidCount > 0) return null;
      // Template baru: jangan simpan sebelum ada perubahan pertama atau Simpan eksplisit.
      return { delayMs: s.forced ? 0 : AUTOSAVE_DEBOUNCE_MS };
  }
}

// ------------------------------------------------------------------ payload

export type SavedSnapshot = { savedRevision: number };

/** Ringkasan teks polos dokumen (tanpa HTML); isian ditulis `{rujukan}`. */
export function summarizeDocument(doc: LetterDocument): string {
  const text = (list: readonly Inline[] | undefined) => {
    let out = "";
    for (const n of list ?? []) {
      if (n.type === "text") out += n.text;
      else if (n.type === "br") out += "\n";
      else out += `{${n.ref}}`;
    }
    return out;
  };
  const parts: string[] = [];
  for (const b of flattenBlocks(doc.body)) {
    switch (b.type) {
      case "paragraph":
      case "heading":
        parts.push(text(b.content));
        break;
      case "title":
        parts.push(text(b.title));
        break;
      case "memo":
        parts.push(...b.rows.map((r) => `${r.label}: ${text(r.value)}`));
        break;
      case "list":
      case "dictum":
      case "cc":
        parts.push(...b.items.map(text));
        break;
      default:
        break;
    }
  }
  // Batas jauh di bawah batas server (200 KB) agar ringkasan tidak pernah menolak simpan.
  return parts.filter((p) => p.trim() !== "").join("\n\n").slice(0, 50_000);
}

export type CreatePayload = {
  name: string;
  description: string;
  category: string;
  templateStructure: LetterDocument;
  contentTemplate: string;
};

export function buildCreatePayload(meta: TemplateMeta, doc: LetterDocument): CreatePayload {
  return {
    name: meta.name.trim(),
    description: meta.description,
    category: meta.category,
    templateStructure: doc,
    contentTemplate: summarizeDocument(doc),
  };
}

export type PatchPayload = {
  id: number;
  expectedUpdatedAt: string;
  templateStructure?: LetterDocument;
  contentTemplate?: string;
  name?: string;
  description?: string;
  category?: string;
};

/** Hanya field yang berubah: dokumen bila revisi lebih baru dari yang tersimpan, meta bila diubah. */
export function buildPatchPayload(args: {
  id: number;
  expectedUpdatedAt: string;
  doc: LetterDocument;
  docDirty: boolean;
  forced: boolean;
  metaDirty: Partial<TemplateMeta>;
}): PatchPayload {
  const p: PatchPayload = { id: args.id, expectedUpdatedAt: args.expectedUpdatedAt };
  if (args.docDirty || args.forced) {
    p.templateStructure = args.doc;
    p.contentTemplate = summarizeDocument(args.doc);
  }
  const m = args.metaDirty;
  if (m.name !== undefined && m.name.trim() !== "") p.name = m.name.trim();
  if (m.description !== undefined) p.description = m.description;
  if (m.category !== undefined && m.category.trim() !== "") p.category = m.category.trim();
  return p;
}

/** Semua permintaan simpan selesai (atau tidak ada yang dapat dijalankan) — dipakai `saveNow()` menunggu. */
export function isSettled(s: PersistState): boolean {
  if (s.phase === "inflight" || s.phase === "loading") return false;
  if (s.phase === "idle") return !needsSave(s) || s.invalidCount > 0;
  return true;
}
