"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { validateDocument } from "@/lib/letters/document/validate";
import { deriveFormSpec, type FormSpec } from "@/lib/letters/document/form-spec";
import type { LetterDocument } from "@/lib/letters/document/schema";
import type { ResidentOption } from "@/components/AutocompleteResidentInput";
import { personRowFromPerson, type LetterValues, type PersonValues } from "@/lib/letters/values";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";
import {
  buildPayload,
  emptyPerson,
  emptyRow,
  initialState,
  missingForCompletion,
  stateFromValues,
  stateSignature,
  type ComposerState,
  type MissingItem,
  type PreviewContext,
} from "../_utils/composer";
import { focusInput } from "../_utils/dom";

export type Phase = "loading" | "error" | "legacy" | "ready" | "issued";

export type IssuedLetter = {
  id: number;
  letterNumber: string;
  templateId: number;
  document: LetterDocument;
  values: LetterValues;
  /** true bila surat ini sudah terbit sebelum halaman dibuka (bukan baru saja diterbitkan). */
  wasAlready: boolean;
};

const BACK_URL = "/layanan-surat";

async function readError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error || fallback;
}

export function useLetterComposer(templateParam: number | null, suratParam: number | null) {
  const router = useRouter();
  const { appConfirm } = useAppDialogs();

  const [phase, setPhase] = useState<Phase>("loading");
  const [loadError, setLoadError] = useState("");
  const [doc, setDoc] = useState<LetterDocument | null>(null);
  const [spec, setSpec] = useState<FormSpec | null>(null);
  const [context, setContext] = useState<PreviewContext | null>(null);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [letterId, setLetterId] = useState<number | null>(null);
  const [state, setState] = useState<ComposerState | null>(null);
  const [openedDraft, setOpenedDraft] = useState(false);
  const [issued, setIssued] = useState<IssuedLetter | null>(null);
  const [busy, setBusy] = useState<null | "draft" | "completed">(null);
  const [loadingKeys, setLoadingKeys] = useState<ReadonlySet<string>>(new Set());
  const [submitError, setSubmitError] = useState("");
  const [notice, setNotice] = useState("");
  const [missing, setMissing] = useState<MissingItem[]>([]);

  const savedSig = useRef("");
  /** Id surat yang baru kita buat/ubah sendiri: perubahan URL ke id ini tidak perlu memuat ulang. */
  const handledSurat = useRef<number | null>(null);

  // ------------------------------------------------------------------ pemuatan
  useEffect(() => {
    const tid = templateParam;
    const suratId = suratParam;
    if (suratId != null && handledSurat.current === suratId) return;
    handledSurat.current = null;
    let cancelled = false;
    setPhase("loading");
    setLoadError("");
    setIssued(null);
    setSubmitError("");
    setNotice("");
    setMissing([]);
    setOpenedDraft(false);

    const json = async <T,>(url: string, fallback: string): Promise<T> => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(await readError(res, fallback));
      return (await res.json()) as T;
    };

    (async () => {
      try {
        if (suratId == null && tid == null) throw new Error("Pilih jenis surat dari daftar terlebih dahulu.");
        const ctxPromise = json<{ desa: Record<string, string>; pejabat: PreviewContext["pejabat"]; logoUrl: string | null }>(
          "/api/letters/context",
          "Gagal memuat data desa",
        );

        if (suratId != null) {
          const [detail, ctx] = await Promise.all([
            json<{
              id: number; status: string; letterNumber: string; letterDate: string; templateId: number;
              templateName: string; document: unknown; values: LetterValues;
            }>(`/api/letters/${suratId}`, "Gagal memuat surat"),
            ctxPromise,
          ]);
          if (cancelled) return;
          const v = validateDocument(detail.document);
          if (!v.ok) throw new Error("Dokumen surat tidak valid.");
          setTemplateId(detail.templateId);
          setTemplateName(detail.templateName);
          setLetterId(detail.id);
          setContext(ctx);
          setDoc(v.doc);
          if (detail.status !== "draft") {
            setIssued({ id: detail.id, letterNumber: detail.letterNumber, templateId: detail.templateId, document: v.doc, values: detail.values, wasAlready: true });
            setPhase("issued");
            return;
          }
          const fs = deriveFormSpec(v.doc);
          setSpec(fs);
          const st = stateFromValues({ doc: v.doc, spec: fs, values: detail.values, letterDate: detail.letterDate, letterNumber: detail.letterNumber });
          setState(st);
          savedSig.current = stateSignature(st);
          setOpenedDraft(true);
          setPhase("ready");
          return;
        }

        const [tpl, ctx] = await Promise.all([
          json<{ id: number; name: string; templateStructure: unknown }>(`/api/mail-templates/${tid}`, "Jenis surat tidak ditemukan"),
          ctxPromise,
        ]);
        if (cancelled) return;
        setTemplateId(tpl.id);
        setTemplateName(tpl.name);
        setContext(ctx);
        setLetterId(null);
        const ts = tpl.templateStructure as { schemaVersion?: unknown } | null;
        if (!ts || ts.schemaVersion !== 2) {
          setPhase("legacy");
          return;
        }
        const v = validateDocument(ts);
        if (!v.ok) throw new Error("Jenis surat ini tidak valid. Hubungi admin untuk memperbaikinya.");
        const fs = deriveFormSpec(v.doc);
        const st = initialState(fs);
        setDoc(v.doc);
        setSpec(fs);
        setState(st);
        savedSig.current = stateSignature(st);
        setPhase("ready");
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "Gagal memuat halaman");
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [templateParam, suratParam]);

  const dirty = useMemo(() => state != null && phase === "ready" && stateSignature(state) !== savedSig.current, [state, phase]);

  // Peringatan sebelum menutup tab dengan perubahan belum tersimpan.
  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const update = useCallback((fn: (s: ComposerState) => ComposerState) => {
    setState((s) => (s ? fn(s) : s));
    setSubmitError("");
  }, []);

  const withLoading = useCallback(async (key: string, fn: () => Promise<void>) => {
    setLoadingKeys((k) => new Set(k).add(key));
    try {
      await fn();
    } finally {
      setLoadingKeys((k) => {
        const n = new Set(k);
        n.delete(key);
        return n;
      });
    }
  }, []);

  const fetchPerson = useCallback(async (id: number): Promise<PersonValues> => {
    const res = await fetch(`/api/letters/residents/${id}`);
    if (!res.ok) throw new Error(await readError(res, "Gagal mengambil data warga"));
    return ((await res.json()) as { person: PersonValues }).person;
  }, []);

  // ------------------------------------------------------------------ orang
  const selectPerson = useCallback(
    (role: string, resident: ResidentOption) =>
      withLoading(`person-${role}`, async () => {
        try {
          const person = await fetchPerson(resident.id);
          update((s) => ({
            ...s,
            people: { ...s.people, [role]: { mode: "resident", residentId: resident.id, query: resident.name, db: person, values: { ...person } } },
          }));
        } catch (e) {
          setNotice(e instanceof Error ? e.message : "Gagal mengambil data warga");
        }
      }),
    [fetchPerson, update, withLoading],
  );

  const clearPerson = useCallback(
    (role: string) => update((s) => ({ ...s, people: { ...s.people, [role]: emptyPerson() } })),
    [update],
  );

  const setPersonQuery = useCallback(
    (role: string, query: string) =>
      update((s) => {
        const p = s.people[role];
        if (!p) return s;
        return { ...s, people: { ...s.people, [role]: { ...p, query } } };
      }),
    [update],
  );

  const setPersonManual = useCallback(
    (role: string, manual: boolean) =>
      update((s) => {
        const p = s.people[role] ?? emptyPerson();
        const next = manual
          ? { mode: "manual" as const, query: "", db: {}, values: p.mode === "resident" ? { ...p.values } : p.values }
          : emptyPerson();
        return { ...s, people: { ...s.people, [role]: next } };
      }),
    [update],
  );

  const setPersonValue = useCallback(
    (role: string, key: string, value: string) =>
      update((s) => {
        const p = s.people[role];
        if (!p) return s;
        return { ...s, people: { ...s.people, [role]: { ...p, values: { ...p.values, [key]: value } } } };
      }),
    [update],
  );

  // ------------------------------------------------------------------ isian & tanggal
  const setField = useCallback((id: string, value: string) => update((s) => ({ ...s, fields: { ...s.fields, [id]: value } })), [update]);
  const setDate = useCallback((date: string) => update((s) => ({ ...s, date })), [update]);
  const setNumber = useCallback((number: string) => update((s) => ({ ...s, number })), [update]);

  // ------------------------------------------------------------------ grup
  const addRow = useCallback(
    (gid: string) => update((s) => ({ ...s, groups: { ...s.groups, [gid]: [...(s.groups[gid] ?? []), emptyRow()] } })),
    [update],
  );
  const removeRow = useCallback(
    (gid: string, index: number) => update((s) => ({ ...s, groups: { ...s.groups, [gid]: (s.groups[gid] ?? []).filter((_, i) => i !== index) } })),
    [update],
  );
  const setRowValue = useCallback(
    (gid: string, index: number, fid: string, value: string) =>
      update((s) => ({
        ...s,
        groups: { ...s.groups, [gid]: (s.groups[gid] ?? []).map((r, i) => (i === index ? { ...r, values: { ...r.values, [fid]: value } } : r)) },
      })),
    [update],
  );
  const setRowQuery = useCallback(
    (gid: string, index: number, query: string) =>
      update((s) => ({ ...s, groups: { ...s.groups, [gid]: (s.groups[gid] ?? []).map((r, i) => (i === index ? { ...r, query } : r)) } })),
    [update],
  );
  const clearRowResident = useCallback(
    (gid: string, index: number) =>
      update((s) => ({
        ...s,
        groups: { ...s.groups, [gid]: (s.groups[gid] ?? []).map((r, i) => (i === index ? { ...r, residentId: undefined, db: {} } : r)) },
      })),
    [update],
  );
  const selectRowResident = useCallback(
    (gid: string, index: number, resident: ResidentOption) =>
      withLoading(`group-${gid}-${index}`, async () => {
        try {
          const person = await fetchPerson(resident.id);
          const ids = spec?.groups.find((g) => g.id === gid)?.fields.map((f) => f.id) ?? [];
          const db = personRowFromPerson(ids, person);
          update((s) => ({
            ...s,
            groups: {
              ...s.groups,
              [gid]: (s.groups[gid] ?? []).map((r, i) =>
                i === index ? { ...r, residentId: resident.id, query: resident.name, db, values: { ...r.values, ...db } } : r,
              ),
            },
          }));
        } catch (e) {
          setNotice(e instanceof Error ? e.message : "Gagal mengambil data warga");
        }
      }),
    [fetchPerson, spec, update, withLoading],
  );

  // ------------------------------------------------------------------ simpan & terbitkan
  const numberingMode = doc?.numbering.mode ?? "auto";

  const submit = useCallback(
    async (status: "draft" | "completed"): Promise<boolean> => {
      if (!state || !spec || !doc) return false;
      setSubmitError("");
      setNotice("");

      if (status === "completed") {
        const list = missingForCompletion(spec, state, numberingMode);
        setMissing(list);
        if (list.length > 0) {
          setSubmitError(`Lengkapi dulu: ${list[0].message}${list.length > 1 ? ` (dan ${list.length - 1} isian lain)` : ""}.`);
          focusInput(list[0].inputId);
          return false;
        }
        const ok = await appConfirm({
          title: "Terbitkan surat?",
          description: "Surat akan mendapat nomor dan tidak bisa diubah lagi setelah terbit.",
          confirmLabel: "Terbitkan",
        });
        if (!ok) return false;
      } else {
        setMissing([]);
      }

      setBusy(status);
      try {
        const payload = buildPayload({ spec, state, status, templateId: letterId == null ? (templateId ?? undefined) : undefined, numberingMode });
        const res = await fetch(letterId == null ? "/api/letters" : `/api/letters/${letterId}`, {
          method: letterId == null ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          setSubmitError(await readError(res, "Gagal menyimpan surat"));
          return false;
        }
        const saved = (await res.json()) as { id: number; letterNumber: string };
        handledSurat.current = saved.id;
        setLetterId(saved.id);

        if (status === "draft") {
          savedSig.current = stateSignature(state);
          setNotice("Draf tersimpan. Anda bisa melanjutkannya nanti dari daftar surat.");
          if (suratParam !== saved.id) router.replace(`${BACK_URL}/buat?surat=${saved.id}`);
          return true;
        }

        const dres = await fetch(`/api/letters/${saved.id}`);
        if (!dres.ok) {
          setSubmitError(await readError(dres, "Surat terbit, tetapi gagal memuat hasilnya. Buka dari daftar surat."));
          return false;
        }
        const d = (await dres.json()) as { letterNumber: string; templateId: number; document: unknown; values: LetterValues };
        const v = validateDocument(d.document);
        if (!v.ok) {
          setSubmitError("Surat terbit, tetapi dokumennya tidak dapat ditampilkan. Buka dari daftar surat.");
          return false;
        }
        savedSig.current = stateSignature(state);
        setIssued({ id: saved.id, letterNumber: d.letterNumber, templateId: d.templateId, document: v.doc, values: d.values, wasAlready: false });
        setPhase("issued");
        router.replace(`${BACK_URL}/buat?surat=${saved.id}`);
        return true;
      } catch {
        setSubmitError("Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.");
        return false;
      } finally {
        setBusy(null);
      }
    },
    [state, spec, doc, numberingMode, appConfirm, letterId, templateId, suratParam, router],
  );

  const goBack = useCallback(async () => {
    if (dirty) {
      const ok = await appConfirm({
        title: "Tinggalkan halaman?",
        description: "Perubahan yang belum disimpan akan hilang. Simpan draf dulu bila ingin melanjutkan nanti.",
        confirmLabel: "Tinggalkan",
        cancelLabel: "Tetap di sini",
        tone: "destructive",
      });
      if (!ok) return;
    }
    router.push(BACK_URL);
  }, [dirty, appConfirm, router]);

  return {
    phase, loadError, doc, spec, context, templateId, templateName, letterId, state, openedDraft, issued,
    busy, loadingKeys, submitError, notice, missing, dirty, numberingMode,
    setNotice, setMissing, submit, goBack,
    actions: {
      selectPerson, clearPerson, setPersonQuery, setPersonManual, setPersonValue,
      setField, setDate, setNumber,
      addRow, removeRow, setRowValue, setRowQuery, selectRowResident, clearRowResident,
    },
  };
}
