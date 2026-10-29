"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Eye, Redo2, Undo2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useDocumentEditor } from "@/lib/letters/editor";
import type { LetterDocument } from "@/lib/letters/document/schema";
import { sampleLetterValues } from "@/lib/letters/values";
import { Canvas } from "@/components/letters/editor/canvas";
import { SidePanel, checkSummary } from "@/components/letters/editor/panels";
import { V2TemplatePreviewDialog } from "../../_components/V2Views";
import type { UseTemplateDocument } from "../_hooks/useTemplateDocument";
import { ConflictBanner, TopBar } from "./TopBar";

/** Kertas + panel samping untuk satu dokumen yang sudah dimuat. */
export function EditorWorkspace({ tpl, initialDoc }: { tpl: UseTemplateDocument; initialDoc: LetterDocument }) {
  const router = useRouter();
  const editor = useDocumentEditor(initialDoc);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const { onDocumentChange } = tpl;
  const { doc, revision } = editor;
  // Revisi 0 = dokumen awal, belum ada yang perlu disimpan.
  useEffect(() => {
    if (revision > 0) onDocumentChange(doc, revision);
  }, [doc, revision, onDocumentChange]);

  // Pintasan undo/redo di luar kolom teks (di dalam kolom teks Tiptap punya riwayatnya sendiri).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); editor.undo(); }
      else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); editor.redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor]);

  const summary = checkSummary(editor);
  const sampleValues = useMemo(() => sampleLetterValues(doc), [doc]);

  const reveal = useCallback((id: string) => {
    editor.select(id);
    requestAnimationFrame(() => {
      document.querySelector(`[data-block-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, [editor]);

  const onDone = async () => {
    setLeaveError(null);
    if (summary.errors > 0) {
      setLeaveError(`Masih ada ${summary.errors} hal yang perlu diperbaiki sebelum jenis surat ini bisa dipakai. Lihat tab "Cek surat".`);
      return;
    }
    setLeaving(true);
    await tpl.saveNow();
    setLeaving(false);
    router.push("/layanan-surat");
  };

  const readOnlyStatus = tpl.status === "conflict";

  return (
    <div className="-m-6 flex flex-col">
      <div className="sticky top-0 z-20">
        <TopBar
          name={tpl.template.name}
          onNameChange={(name) => tpl.setMeta({ name })}
          status={tpl.status}
          message={tpl.message}
          invalidCount={tpl.invalidCount}
          lastSavedAt={tpl.lastSavedAt}
          onRetry={tpl.retry}
          onDone={onDone}
          doneLabel={leaving ? "Menyimpan…" : "Selesai"}
        >
          <Button type="button" variant="ghost" size="sm" className="min-h-11 gap-1.5" onClick={editor.undo} disabled={!editor.canUndo} aria-label="Urungkan (Ctrl+Z)">
            <Undo2 className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Urungkan</span>
          </Button>
          <Button type="button" variant="ghost" size="sm" className="min-h-11 gap-1.5" onClick={editor.redo} disabled={!editor.canRedo} aria-label="Ulangi (Ctrl+Shift+Z)">
            <Redo2 className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Ulangi</span>
          </Button>
          <Button type="button" variant="outline" size="sm" className="min-h-11 gap-1.5" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4" aria-hidden /> Pratinjau
          </Button>
        </TopBar>
        {readOnlyStatus && (
          <ConflictBanner onReload={tpl.reload} onOverwrite={() => void tpl.forceSave()} />
        )}
        {leaveError && (
          <Alert variant="destructive" className="mx-4 mt-3 w-auto" role="alert">
            <AlertTriangle aria-hidden />
            <AlertTitle>Belum bisa diselesaikan</AlertTitle>
            <AlertDescription>{leaveError}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start">
        <div className="h-[70dvh] min-h-96 min-w-0 flex-1 lg:h-[calc(100dvh-11rem)]">
          <Canvas editor={editor} values={sampleValues} />
        </div>
        <aside
          aria-label="Pengaturan surat"
          className="lg:sticky lg:top-24 lg:h-[calc(100dvh-11rem)] lg:w-[360px] lg:shrink-0"
        >
          <SidePanel editor={editor} onReveal={reveal} />
        </aside>
      </div>

      <V2TemplatePreviewDialog
        template={previewOpen ? { name: tpl.template.name || "Jenis surat", document: doc } : null}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}
