"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, FileText, Info, Loader2, Printer, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePageHeader, usePageScrollLock } from "@/components/layout/PageHeaderContext";
import { lintDocument } from "@/lib/letters/document/form-spec";
import { useLetterComposer } from "../_hooks/useLetterComposer";
import { buildPreviewValues, isoToDate, missingForCompletion, refToTarget, stateSignature } from "../_utils/composer";
import { focusInput } from "../_utils/dom";
import { CheckPanel } from "./CheckPanel";
import { FieldsSection } from "./FieldsSection";
import { GroupsSection } from "./GroupsSection";
import { LetterComposerTour } from "./LetterComposerTour";
import { PaperPane } from "./PaperPane";
import { PeopleSection } from "./PeopleSection";
import { SuccessPanel } from "./SuccessPanel";

type Tab = "isi" | "pratinjau";

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex max-w-xl flex-col items-center gap-4 p-10 text-center">{children}</div>;
}

export function LetterComposer({ templateId, suratId }: { templateId: number | null; suratId: number | null }) {
  const router = useRouter();
  const c = useLetterComposer(templateId, suratId);
  const [tab, setTab] = useState<Tab>("isi");
  const { doc, spec, context, state, numberingMode, setNotice } = c;

  // Judul, status, dan tombol kembali tampil di header aplikasi (hemat ruang di halaman).
  const showMain = Boolean(doc && spec && state && context) && c.phase !== "loading" && c.phase !== "error" && c.phase !== "legacy" && c.phase !== "issued";
  usePageScrollLock(showMain);
  usePageHeader(
    showMain
      ? {
          title: c.templateName || "Buat Surat",
          subtitle: `${c.letterId ? "Melanjutkan draf" : "Surat baru"}${c.dirty ? " · ada perubahan yang belum disimpan" : ""}`,
          backLabel: "Kembali ke daftar surat",
          onBack: () => void c.goBack(),
        }
      : null,
  );

  // ---- nilai pratinjau (ditunda agar mengetik tetap lancar)
  // Kunci hanya bagian state yang tampil di kertas: mengetik di kotak pencarian warga (query) tidak
  // menyusun ulang nilai maupun merender ulang kertas.
  const previewKey = useMemo(() => (state ? stateSignature(state) : ""), [state]);
  const values = useMemo(
    () =>
      doc && context && state
        ? buildPreviewValues({ doc, context, state, date: isoToDate(state.date), nomor: numberingMode === "manual" ? state.number : "" })
        : null,
    // `state` sengaja tidak masuk dependensi; `previewKey` memuat semua yang dipakai buildPreviewValues.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc, context, previewKey, numberingMode],
  );
  const deferredValues = useDeferredValue(values);

  const missing = useMemo(() => (spec && state ? missingForCompletion(spec, state, numberingMode) : []), [spec, state, numberingMode]);
  const warnings = useMemo(() => (doc ? lintDocument(doc) : []), [doc]);

  // ---- klik isian di kertas → fokus ke input
  const pendingFocus = useRef<{ id: string; fallbackId?: string } | null>(null);
  const onFieldClick = useCallback(
    (ref: string) => {
      const target = refToTarget(ref);
      if (!target) return;
      if (target.kind === "auto") {
        setNotice(target.message);
        return;
      }
      setNotice("");
      pendingFocus.current = { id: target.id, fallbackId: target.fallbackId };
      setTab("isi");
    },
    [setNotice],
  );
  // Jalankan fokus setelah tab "Isi" tampil (di layar kecil pratinjau menyembunyikan formulir).
  useEffect(() => {
    const t = pendingFocus.current;
    if (!t || tab !== "isi") return;
    pendingFocus.current = null;
    const raf = requestAnimationFrame(() => {
      if (!focusInput(t.id, t.fallbackId)) setNotice("Isian ini tidak bisa diubah di sini.");
    });
    return () => cancelAnimationFrame(raf);
  }, [tab, state, setNotice]);

  // ---- fokus ke judul panel sukses
  useEffect(() => {
    if (c.phase === "issued") document.getElementById("issued-heading")?.focus();
  }, [c.phase]);

  const newLetter = () => {
    if (c.issued) router.push(`/layanan-surat/buat?templateId=${c.issued.templateId}`);
  };

  if (c.phase === "loading") {
    return (
      <Centered>
        <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        <p role="status">Memuat surat…</p>
      </Centered>
    );
  }
  if (c.phase === "error" || c.phase === "legacy") {
    return (
      <Centered>
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
        <h1 className="text-lg font-semibold">
          {c.phase === "legacy" ? "Jenis surat ini masih berformat lama" : "Surat tidak dapat dibuka"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {c.phase === "legacy"
            ? "Jenis surat ini belum bisa dipakai di pembuatan surat baru. Pilih jenis surat lain dari katalog."
            : c.loadError}
        </p>
        <Button type="button" className="min-h-10 gap-2 pointer-coarse:min-h-11" onClick={() => router.push("/layanan-surat")}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke daftar surat
        </Button>
      </Centered>
    );
  }
  if (c.phase === "issued" && c.issued) {
    return (
      <div className="p-4 md:p-6">
        <SuccessPanel issued={c.issued} templateName={c.templateName} onNew={newLetter} onList={() => router.push("/layanan-surat")} />
      </div>
    );
  }
  if (!doc || !spec || !state || !context || !deferredValues) return null;

  const a = c.actions;
  const busy = c.busy !== null;
  // Data warga/isian otomatis yang masih diambil: simpan/terbit ditahan agar surat tidak tersimpan tanpa data itu.
  const waitingData = c.loadingKeys.size > 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <LetterComposerTour active={showMain} />
      {c.openedDraft ? (
        <Alert className="shrink-0">
          <Info className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Draf dibuka sebagai isian manual</AlertTitle>
          <AlertDescription>
            Data warga yang dipilih sebelumnya tidak terhubung lagi ke database. Isiannya tetap ada dan bisa Anda ubah; pilih warga lagi bila ingin mengambil ulang datanya.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Tab untuk layar kecil: pratinjau selalu bisa dibuka */}
      <div role="tablist" aria-label="Bagian halaman" className="grid shrink-0 grid-cols-2 gap-1 rounded-lg bg-muted p-1 lg:hidden">
        {(["isi", "pratinjau"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            onClick={() => setTab(t)}
            className="flex min-h-11 items-center justify-center gap-2 rounded-md text-sm font-medium aria-selected:bg-background aria-selected:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t === "isi" ? "Isi" : "Pratinjau"}
            {t === "isi" && missing.length > 0 ? (
              <Badge variant="secondary" aria-label={`${missing.length} isian wajib belum diisi`}>{missing.length}</Badge>
            ) : null}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(360px,520px)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-6">
        {/* ---------------- formulir ---------------- */}
        <div
          id="panel-isi"
          role="tabpanel"
          aria-labelledby="tab-isi"
          className={`${tab === "isi" ? "block" : "hidden"} lg:block relative h-full min-h-0 overflow-y-auto lg:pr-2`}
        >
          <form
            className="space-y-5"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void c.submit("completed");
            }}
          >
            <fieldset className="space-y-3 rounded-lg border p-4">
              <legend className="flex items-center gap-2 px-1 text-sm font-semibold">
                <FileText className="h-4 w-4" aria-hidden="true" />
                Tentang surat
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="letter-date">Tanggal surat</Label>
                  <Input id="letter-date" type="date" className="pointer-coarse:h-11" value={state.date} onChange={(e) => a.setDate(e.target.value)} />
                </div>
                {numberingMode === "manual" ? (
                  <div data-lc-field="" className="space-y-1.5 rounded-md data-[lc-flash=1]:ring-2 data-[lc-flash=1]:ring-ring data-[lc-flash=1]:ring-offset-2">
                    <Label htmlFor="letter-number">
                      Nomor surat
                      <span aria-hidden="true" className="text-destructive"> *</span>
                      <span className="sr-only"> (wajib diisi)</span>
                    </Label>
                    <Input id="letter-number" className="pointer-coarse:h-11" value={state.number} onChange={(e) => a.setNumber(e.target.value)} />
                  </div>
                ) : null}
              </div>
              {numberingMode === "auto" ? (
                <p className="text-sm text-muted-foreground">Nomor dibuat otomatis saat surat diterbitkan.</p>
              ) : null}
            </fieldset>

            <PeopleSection spec={spec} people={state.people} loadingKeys={c.loadingKeys} actions={a} />

            <FieldsSection fields={spec.fields} values={state.fields} onChange={a.setField} />

            <GroupsSection spec={spec} groups={state.groups} loadingKeys={c.loadingKeys} actions={a} />

            <CheckPanel missing={missing} warnings={warnings} />

            {/* ---- aksi: satu tombol utama + satu sekunder ---- */}
            <div className="sticky bottom-0 -mx-1 space-y-2 border-t bg-background px-1 py-3">
              {c.submitError ? (
                <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{c.submitError}</span>
                </p>
              ) : null}
              {c.notice ? <p role="status" className="text-sm text-muted-foreground">{c.notice}</p> : null}
              {waitingData ? <p role="status" className="text-sm text-muted-foreground">Mengambil data warga… tombol simpan aktif setelah data terisi.</p> : null}
              <div data-tour="composer-actions" className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy || waitingData} aria-busy={c.busy === "completed"} className="min-h-10 flex-1 gap-2 pointer-coarse:min-h-11">
                  {c.busy === "completed" ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Printer className="h-4 w-4" aria-hidden="true" />}
                  {c.busy === "completed" ? "Menerbitkan…" : "Terbitkan & Cetak"}
                </Button>
                <Button type="button" variant="outline" disabled={busy || waitingData} aria-busy={c.busy === "draft"} className="min-h-10 gap-2 pointer-coarse:min-h-11" onClick={() => void c.submit("draft")}>
                  {c.busy === "draft" ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                  {c.busy === "draft" ? "Menyimpan…" : "Simpan draf"}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* ---------------- kertas hidup ---------------- */}
        <div
          id="panel-pratinjau"
          role="tabpanel"
          aria-labelledby="tab-pratinjau"
          className={`${tab === "pratinjau" ? "block" : "hidden"} lg:block relative h-full min-h-0 overflow-y-auto`}
        >
          <PaperPane doc={doc} values={deferredValues} onFieldClick={onFieldClick} notice={c.notice && !c.submitError ? c.notice : ""} />
        </div>
      </div>
    </div>
  );
}
