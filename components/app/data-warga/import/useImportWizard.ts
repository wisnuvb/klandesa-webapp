"use client";

import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  analyzeBatch,
  applyMappingToSameSignature,
  buildSheetRows,
  linkParents,
  mergeAcrossSheets,
  normalizeRow,
  statusOf,
  summarize,
  summarizeReadiness,
  type BatchIssues,
  type ColumnMapping,
  type FieldId,
  type ImportRow,
  type Issue,
  type PlannedSheet,
  type RowStatus,
  type SheetRole,
} from "@/lib/residents-import";
import { readAndPlan } from "@/lib/residents-import/read-plan";
import type { ReportLine } from "@/lib/residents-import/template";

export type Step = "upload" | "map" | "review" | "result";
export type ExistingMode = "skip" | "fill" | "overwrite" | "status";

export const MAX_FILE_MB = 30;
export const MAX_IMPORT_ROWS = 50_000;
const SEND_CHUNK = 1000;
const CHECK_CHUNK = 5000;
const STORAGE_KEY = "klandesa:residents-import:mappings";

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  /** Akun mobile warga yang dinonaktifkan karena kini berstatus meninggal/pindah. */
  accountsSuspended: number;
  rejected: Array<{ key: number; errors: string[] }>;
  /** Pesan bila impor berhenti di tengah jalan. */
  failedMessage?: string;
  /** Jumlah baris yang belum terkirim akibat berhenti. */
  notSent: number;
}

function loadSaved(): Record<string, ColumnMapping> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, ColumnMapping>;
  } catch {
    return {};
  }
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/** Field yang memengaruhi analisis lintas-baris. Edit field lain tidak perlu menghitung ulang seluruh batch. */
const BATCH_FIELDS = new Set<FieldId>(["id_number", "name", "date_of_birth", "family_card_number", "status_family_id"]);

/** Kirim hanya nilai yang terisi: payload jauh lebih kecil (sebagian besar dari ±48 kolom kosong). */
const compact = (values: ImportRow["values"]) =>
  Object.fromEntries(Object.entries(values).filter(([, v]) => v !== "" && v !== undefined));

export function useImportWizard(onImported?: () => void) {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [plans, setPlans] = useState<PlannedSheet[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [rows, setRows] = useState<ImportRow[]>([]);
  // Pemeriksaan lintas-baris (NIK ganda, KK, nama+tgl lahir) mahal di data besar: hitung hanya saat field kuncinya berubah.
  const [batch, setBatch] = useState<BatchIssues>(() => new Map());
  const rowsRef = useRef<ImportRow[]>([]);
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<ExistingMode>("skip");
  const [saveMapping, setSaveMapping] = useState(true);
  const [mergedCount, setMergedCount] = useState(0);
  const [linkedParents, setLinkedParents] = useState(0);
  const [busy, setBusy] = useState<{ label: string; done?: number; total?: number } | null>(null);
  const [sending, setSending] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const cancelRef = useRef(false);
  const sentRowsRef = useRef<ImportRow[]>([]);

  const reset = useCallback(() => {
    cancelRef.current = true;
    setStep("upload");
    setFileName("");
    setPlans([]);
    setActiveSheet(0);
    rowsRef.current = [];
    setRows([]);
    setBatch(new Map());
    setExisting(new Set());
    setMode("skip");
    setMergedCount(0);
    setLinkedParents(0);
    setBusy(null);
    setSending(null);
    setResult(null);
    sentRowsRef.current = [];
  }, []);

  // ───────────── Langkah 1: baca file ─────────────
  const loadFile = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`Ukuran file maksimal ${MAX_FILE_MB} MB`);
      return;
    }
    cancelRef.current = false;
    setBusy({ label: "Membaca file Excel…" });
    await tick();
    try {
      const buf = await file.arrayBuffer();
      // Beri kesempatan browser menggambar indikator "Membaca file…" sebelum parsing (sinkron) dimulai.
      await tick();
      const planned = readAndPlan(buf, loadSaved());
      const usable = planned.filter((p) => p.sheet.dataRows.length > 0);
      if (usable.length === 0) {
        toast.error("File tidak berisi data. Pastikan ada baris data di bawah header.");
        return;
      }
      setFileName(file.name);
      setPlans(planned);
      const firstSel = planned.findIndex((p) => p.selected);
      setActiveSheet(firstSel >= 0 ? firstSel : planned.findIndex((p) => p.sheet.dataRows.length > 0));
      setStep("map");
      const total = planned.filter((p) => p.selected).reduce((n, p) => n + p.sheet.dataRows.length, 0);
      if (total === 0) toast.warning("Kolom NIK/Nama belum terdeteksi — silakan cocokkan kolom secara manual.");
    } catch (e) {
      console.error(e);
      toast.error("Gagal membaca file. Pastikan formatnya .xlsx, .xls, atau .csv yang valid.");
    } finally {
      setBusy(null);
    }
  }, []);

  // ───────────── Langkah 2: sheet & kolom ─────────────
  const setSheetSelected = useCallback((index: number, selected: boolean) => {
    setPlans((prev) => prev.map((p, i) => (i === index ? { ...p, selected, note: selected ? undefined : p.note } : p)));
  }, []);

  const setSheetRole = useCallback((index: number, role: SheetRole) => {
    setPlans((prev) => prev.map((p, i) => (i === index ? { ...p, role } : p)));
  }, []);

  const setColumnField = useCallback((sheetIndex: number, col: number, field: FieldId | null) => {
    setPlans((prev) => {
      const next = prev.map((p, i) => {
        if (i !== sheetIndex) return p;
        const mapping = [...p.mapping];
        // Satu field hanya boleh dipakai satu kolom (kecuali jenis kelamin yang boleh terpecah L/P)
        if (field && field !== "gender") {
          mapping.forEach((f, ci) => {
            if (f === field && ci !== col) mapping[ci] = null;
          });
        }
        mapping[col] = field;
        const guesses = p.guesses.map((g) => {
          if (g.index === col) return { ...g, field, confidence: field ? 1 : 0, reason: "manual" as const };
          if (field && field !== "gender" && g.field === field) return { ...g, field: null, confidence: 0, reason: "none" as const };
          return g;
        });
        return { ...p, mapping, guesses };
      });
      return applyMappingToSameSignature(next, sheetIndex);
    });
  }, []);

  const selectedPlans = useMemo(() => plans.filter((p) => p.selected), [plans]);

  const mappingProblems = useMemo(() => {
    const out: string[] = [];
    for (const p of selectedPlans) {
      const missing: string[] = [];
      if (!p.mapping.includes("id_number")) missing.push("NIK");
      if (!p.mapping.includes("name")) missing.push("Nama");
      if (missing.length) out.push(`Sheet "${p.sheet.name}": kolom ${missing.join(" dan ")} belum dipilih`);
    }
    if (selectedPlans.length === 0) out.push("Pilih minimal satu sheet");
    return out;
  }, [selectedPlans]);

  // ───────────── Langkah 3: bangun baris, periksa, review ─────────────
  const checkExisting = useCallback(async (list: ImportRow[]) => {
    const niks = [...new Set(list.map((r) => r.values.id_number ?? "").filter((n) => n.length === 16))];
    const found = new Set<string>();
    try {
      for (let i = 0; i < niks.length; i += CHECK_CHUNK) {
        const res = await fetch("/api/residents/bulk/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ niks: niks.slice(i, i + CHECK_CHUNK) }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { existing: string[] };
        json.existing.forEach((n) => found.add(n));
      }
    } catch {
      toast.warning("Tidak bisa memeriksa NIK yang sudah terdaftar sekarang. Pemeriksaan tetap dilakukan saat impor.");
    }
    return found;
  }, []);

  const proceedToReview = useCallback(async () => {
    if (mappingProblems.length) {
      toast.error(mappingProblems[0]);
      return;
    }
    cancelRef.current = false;
    setBusy({ label: "Menyusun & memeriksa data…", done: 0, total: 1 });
    await tick();
    try {
      const all: ImportRow[] = [];
      let key = 0;
      const grand = selectedPlans.reduce((n, p) => n + p.sheet.dataRows.length, 0);
      let done = 0;
      for (const p of selectedPlans) {
        const built = await buildSheetRows(p, {
          startKey: key,
          onProgress: async (d) => {
            setBusy({ label: "Menyusun & memeriksa data…", done: done + d, total: grand });
            await tick();
          },
        });
        key += built.length;
        done += built.length;
        all.push(...built);
      }
      const { rows: merged, summary } = mergeAcrossSheets(all);
      let finalRows = merged;
      if (finalRows.length > MAX_IMPORT_ROWS) {
        toast.error(`Maksimal ${MAX_IMPORT_ROWS.toLocaleString("id-ID")} baris per impor. Hanya ${MAX_IMPORT_ROWS.toLocaleString("id-ID")} baris pertama yang dimuat.`);
        finalRows = finalRows.slice(0, MAX_IMPORT_ROWS);
      }
      const linked = linkParents(finalRows);

      setBusy({ label: "Memeriksa NIK yang sudah terdaftar…" });
      const found = await checkExisting(finalRows);

      if (saveMapping) {
        const saved = loadSaved();
        for (const p of selectedPlans) saved[p.signature] = p.mapping;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        } catch {
          /* kuota penuh: abaikan, pemetaan tersimpan hanyalah kenyamanan */
        }
      }

      rowsRef.current = finalRows;
      setRows(finalRows);
      setBatch(analyzeBatch(finalRows));
      setExisting(found);
      setMergedCount(summary.merged);
      setLinkedParents(linked);
      setStep("review");
    } catch (e) {
      console.error(e);
      toast.error("Gagal menyusun data dari file");
    } finally {
      setBusy(null);
    }
  }, [mappingProblems, selectedPlans, saveMapping, checkExisting]);

  const issuesOf = useCallback((r: ImportRow): Issue[] => {
    const b = batch.get(r.key);
    return b ? r.issues.concat(b) : r.issues;
  }, [batch]);

  const statusOfRow = useCallback((r: ImportRow): RowStatus => statusOf(r.issues, batch.get(r.key)), [batch]);

  const summary = useMemo(() => summarize(rows, batch), [rows, batch]);
  // Kesiapan mendaftar di aplikasi mobile; dihitung dari versi tertunda agar edit sel tetap responsif.
  const deferredRows = useDeferredValue(rows);
  const readiness = useMemo(() => summarizeReadiness(deferredRows), [deferredRows]);
  // Baris yang ditandai meninggal/pindah (relevan bagi warga yang sudah ada di database)
  const statusRowCount = useMemo(
    () => rows.reduce((n, r) => n + (r.values.is_alive === "N" || r.values.move_date ? 1 : 0), 0),
    [rows],
  );
  const existingCount = useMemo(
    () => rows.reduce((n, r) => n + (existing.has(r.values.id_number ?? "") ? 1 : 0), 0),
    [rows, existing],
  );

  const editCell = useCallback((key: number, field: FieldId, value: string) => {
    const prev = rowsRef.current;
    const idx = prev.findIndex((r) => r.key === key);
    if (idx < 0) return;
    const { values, issues } = normalizeRow({ ...prev[idx].values, [field]: value });
    const next = prev.slice();
    next[idx] = { ...prev[idx], values, issues };
    rowsRef.current = next;
    setRows(next);
    if (BATCH_FIELDS.has(field)) setBatch(analyzeBatch(next));
  }, []);

  const removeRows = useCallback((keys: Set<number>) => {
    const next = rowsRef.current.filter((r) => !keys.has(r.key));
    rowsRef.current = next;
    setRows(next);
    setBatch(analyzeBatch(next));
  }, []);

  /** Ganti nilai enumerasi yang tidak dikenali di seluruh baris sekaligus. */
  const replaceValue = useCallback((field: FieldId, from: string, to: string) => {
    const next = rowsRef.current.map((r) => {
      if (r.values[field] !== from) return r;
      const { values, issues } = normalizeRow({ ...r.values, [field]: to });
      return { ...r, values, issues };
    });
    rowsRef.current = next;
    setRows(next);
    if (BATCH_FIELDS.has(field)) setBatch(analyzeBatch(next));
  }, []);

  // ───────────── Langkah 4: kirim ─────────────
  const sendableRows = useMemo(() => rows.filter((r) => statusOfRow(r) !== "error"), [rows, statusOfRow]);

  const submit = useCallback(async () => {
    const toSend = sendableRows;
    if (toSend.length === 0) {
      toast.error("Tidak ada baris valid untuk diimpor");
      return;
    }
    sentRowsRef.current = toSend;
    cancelRef.current = false;
    setResult(null);
    setSending({ done: 0, total: toSend.length });
    setStep("result");

    const agg: ImportResult = { created: 0, updated: 0, skipped: 0, accountsSuspended: 0, rejected: [], notSent: 0 };
    for (let i = 0; i < toSend.length; i += SEND_CHUNK) {
      if (cancelRef.current) {
        agg.notSent = toSend.length - i;
        agg.failedMessage = "Impor dibatalkan";
        break;
      }
      const chunk = toSend.slice(i, i + SEND_CHUNK);
      try {
        const res = await fetch("/api/residents/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, rows: chunk.map((r) => ({ ref: r.key, values: compact(r.values) })) }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          agg.notSent = toSend.length - i;
          agg.failedMessage = json?.error || `Server menolak permintaan (HTTP ${res.status})`;
          break;
        }
        const d = json.data;
        agg.created += d.residentsCreated ?? 0;
        agg.updated += d.residentsUpdated ?? 0;
        agg.skipped += d.skipped ?? 0;
        agg.accountsSuspended += d.accountsSuspended ?? 0;
        for (const rj of (d.rejected ?? []) as Array<{ ref: number; errors: string[] }>) {
          agg.rejected.push({ key: rj.ref, errors: rj.errors });
        }
      } catch {
        agg.notSent = toSend.length - i;
        agg.failedMessage = "Koneksi terputus saat mengirim data";
        break;
      }
      setSending({ done: Math.min(i + SEND_CHUNK, toSend.length), total: toSend.length });
    }
    setSending(null);
    setResult(agg);
    if (agg.created + agg.updated > 0) onImported?.();
  }, [sendableRows, mode, onImported]);

  const cancelSending = useCallback(() => {
    cancelRef.current = true;
  }, []);

  /** Baris yang tidak masuk (error di browser + ditolak server + belum terkirim) untuk diunduh. */
  const buildReport = useCallback((): ReportLine[] => {
    const lines: ReportLine[] = [];
    const sent = new Set(sentRowsRef.current.map((r) => r.key));
    const rejectedByKey = new Map((result?.rejected ?? []).map((r) => [r.key, r.errors]));
    for (const r of rows) {
      const base = { sheet: r.sheet, row: r.srcRow, nik: r.values.id_number ?? "", name: r.values.name ?? "" };
      const rj = rejectedByKey.get(r.key);
      if (rj) {
        lines.push({ ...base, level: "Ditolak", message: rj.join("; ") });
      } else if (!sent.has(r.key)) {
        const msgs = issuesOf(r).filter((i) => i.level === "error").map((i) => i.message);
        if (msgs.length) lines.push({ ...base, level: "Ditolak", message: msgs.join("; ") });
      }
    }
    return lines;
  }, [rows, result, issuesOf]);

  return {
    step, setStep, fileName, plans, activeSheet, setActiveSheet, rows, existing, existingCount, mode, setMode,
    saveMapping, setSaveMapping, mergedCount, linkedParents, busy, sending, result, summary, readiness, statusRowCount,
    mappingProblems, sendableRows, batch,
    reset, loadFile, setSheetSelected, setSheetRole, setColumnField, proceedToReview,
    editCell, removeRows, replaceValue, issuesOf, statusOfRow, submit, cancelSending, buildReport,
  };
}

export type ImportWizard = ReturnType<typeof useImportWizard>;
