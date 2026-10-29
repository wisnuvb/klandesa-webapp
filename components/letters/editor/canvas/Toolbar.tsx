"use client";

import { useEffect, useReducer, useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/core";
import { ArrowDown, ArrowUp, Bold, Copy, Italic, Minus, Plus, Trash2, Underline, Variable } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FieldPicker, type NewFieldInput } from "./FieldPicker";
import { InsertMenuButton } from "./InsertMenu";
import { insertFieldChip } from "./editor-actions";
import { ZOOM_MAX, ZOOM_MIN } from "./helpers";
import type { LetterDocument } from "@/lib/letters/document/schema";
import type { PresetId } from "@/lib/letters/editor";

type Props = {
  doc: Pick<LetterDocument, "people" | "fields">;
  /** Instance Tiptap yang sedang aktif (null bila tidak ada kolom teks yang sedang diketik). */
  textEditor: Editor | null;
  hasSelection: boolean;
  selectionLabel: string | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onAddBlock: (preset: PresetId) => void;
  onCreateField: (input: NewFieldInput) => string;
  zoom: number;
  scalePercent: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onZoomReset: () => void;
};

const btn =
  "inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-pressed:bg-accent aria-pressed:border-border";

function Label({ children }: { children: ReactNode }) {
  // Label hanya tampil bila kanvas cukup lebar; selain itu aksi tetap punya aria-label dan tooltip.
  return <span className="hidden @[1180px]:inline">{children}</span>;
}

/** Bilah alat tunggal di atas kanvas: format teks, sisipkan isian, dan aksi bagian terpilih. */
export function Toolbar(p: Props) {
  const [, force] = useReducer((n: number) => n + 1, 0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [insertPos, setInsertPos] = useState(0);
  const ed = p.textEditor;

  useEffect(() => {
    if (!ed) return;
    ed.on("transaction", force);
    return () => {
      ed.off("transaction", force);
    };
  }, [ed]);

  const keepSelection = (e: React.MouseEvent) => e.preventDefault();
  const fmt = (mark: "bold" | "italic" | "underline") => {
    if (!ed) return;
    const chain = ed.chain().focus();
    (mark === "bold" ? chain.toggleBold() : mark === "italic" ? chain.toggleItalic() : chain.toggleUnderline()).run();
  };

  return (
    <div className="@container flex-none border-b bg-background">
    <div
      role="toolbar"
      aria-label="Alat penyunting surat"
      className="flex h-14 flex-nowrap items-center gap-1 overflow-x-auto overflow-y-hidden px-2 [&>*]:flex-none"
    >
      <div role="group" aria-label="Format teks" className="flex items-center gap-0.5">
        <button type="button" className={btn} disabled={!ed} aria-pressed={ed?.isActive("bold") ?? false} aria-label="Tebal (Ctrl+B)" title="Tebal (Ctrl+B)" onMouseDown={keepSelection} onClick={() => fmt("bold")}>
          <Bold className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" className={btn} disabled={!ed} aria-pressed={ed?.isActive("italic") ?? false} aria-label="Miring (Ctrl+I)" title="Miring (Ctrl+I)" onMouseDown={keepSelection} onClick={() => fmt("italic")}>
          <Italic className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" className={btn} disabled={!ed} aria-pressed={ed?.isActive("underline") ?? false} aria-label="Garis bawah (Ctrl+U)" title="Garis bawah (Ctrl+U)" onMouseDown={keepSelection} onClick={() => fmt("underline")}>
          <Underline className="h-4 w-4" aria-hidden />
        </button>
        <Popover
          open={pickerOpen}
          onOpenChange={(o) => {
            if (o && ed) setInsertPos(ed.state.selection.from);
            setPickerOpen(o);
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className={btn}
              disabled={!ed}
              title={ed ? "Sisipkan isian data (atau ketik /)" : "Klik teks di kertas dulu, lalu sisipkan isian"}
              onMouseDown={keepSelection}
            >
              <Variable className="h-4 w-4" aria-hidden />
              <span className="sr-only @[900px]:not-sr-only">Sisipkan isian</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-0" onCloseAutoFocus={(e) => { e.preventDefault(); ed?.commands.focus(); }}>
            {ed && (
              <FieldPicker
                doc={p.doc}
                onCancel={() => setPickerOpen(false)}
                onCreate={(input) => ({ ref: `isian.${p.onCreateField(input)}`, label: input.label })}
                onPick={(ref, label) => {
                  setPickerOpen(false);
                  insertFieldChip(ed, ref, label, insertPos);
                }}
              />
            )}
          </PopoverContent>
        </Popover>
      </div>

      <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />

      <div role="group" aria-label="Bagian terpilih" className="flex items-center gap-0.5">
        {p.hasSelection ? (
          <>
            <span className="mr-1 hidden max-w-[12rem] truncate rounded bg-sky-100 px-2 py-1 text-xs font-medium text-sky-950 @[900px]:inline-block" title={p.selectionLabel ?? undefined}>
              {p.selectionLabel}
            </span>
            <button type="button" className={btn} disabled={!p.canMoveUp} aria-label="Naikkan bagian" title="Naikkan bagian (Alt+↑)" onClick={p.onMoveUp}>
              <ArrowUp className="h-4 w-4" aria-hidden /><Label>Naik</Label>
            </button>
            <button type="button" className={btn} disabled={!p.canMoveDown} aria-label="Turunkan bagian" title="Turunkan bagian (Alt+↓)" onClick={p.onMoveDown}>
              <ArrowDown className="h-4 w-4" aria-hidden /><Label>Turun</Label>
            </button>
            <button type="button" className={btn} aria-label="Gandakan bagian" title="Gandakan bagian" onClick={p.onDuplicate}>
              <Copy className="h-4 w-4" aria-hidden /><Label>Gandakan</Label>
            </button>
            <button type="button" className={`${btn} text-destructive`} aria-label="Hapus bagian" title="Hapus bagian (bisa diurungkan)" onClick={p.onRemove}>
              <Trash2 className="h-4 w-4" aria-hidden /><Label>Hapus</Label>
            </button>
          </>
        ) : (
          <span className="hidden px-1 text-sm text-muted-foreground @[900px]:inline">Klik bagian surat untuk mengubahnya</span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-0.5">
        <InsertMenuButton label="Tambah bagian" onPick={p.onAddBlock} className={`${btn} border-border`}>
          <span className="sr-only @[900px]:not-sr-only">Tambah bagian</span>
        </InsertMenuButton>
        <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />
        <div role="group" aria-label="Perbesar atau perkecil kertas" className="flex items-center">
          <button type="button" className={btn} disabled={p.zoom <= ZOOM_MIN} aria-label="Perkecil kertas" title="Perkecil kertas" onClick={p.onZoomOut}>
            <Minus className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" className={`${btn} tabular-nums`} aria-label={`Ukuran kertas ${p.scalePercent} persen. Klik untuk kembali ke pas lebar.`} title="Pas lebar" onClick={p.onZoomReset}>
            {p.scalePercent}%
          </button>
          <button type="button" className={btn} disabled={p.zoom >= ZOOM_MAX} aria-label="Perbesar kertas" title="Perbesar kertas" onClick={p.onZoomIn}>
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
