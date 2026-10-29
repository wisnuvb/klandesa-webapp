"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { inlinesToTiptap, tiptapToInlines } from "@/lib/letters/editor";
import type { Inline, LetterDocument } from "@/lib/letters/document/schema";
import type { FormatId } from "@/lib/letters/format";
import { createInlineExtensions } from "./extensions";
import { AnchoredPopover, type AnchorRect } from "./AnchoredPopover";
import { FieldPicker, type NewFieldInput } from "./FieldPicker";
import { ChipEditor, type ChipValue } from "./ChipEditor";
import { InsertMenu } from "./InsertMenu";
import { insertFieldChip, removeFieldChip, updateFieldChip } from "./editor-actions";
import { refLabel, slashTrigger } from "./helpers";
import type { PresetId } from "@/lib/letters/editor";

export type InlineEditorProps = {
  value: Inline[];
  doc: Pick<LetterDocument, "people" | "fields">;
  ariaLabel: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** Titik klik (layar): kursor diletakkan di huruf terdekat, bukan di ujung teks. */
  focusPoint?: { x: number; y: number };
  onFocusPlaced?: () => void;
  className?: string;
  style?: CSSProperties;
  onChange: (inlines: Inline[]) => void;
  /** Daftarkan/lepas instance Tiptap agar bilah alat bisa memformat teks. */
  onEditor?: (editor: Editor | null) => void;
  /** Membuat isian tambahan baru; mengembalikan id. */
  onCreateField: (input: NewFieldInput) => string;
  /** Enter pada butir daftar: kembalikan true bila sudah ditangani (membuat butir baru). */
  onEnterItem?: () => boolean;
  /** Backspace di butir kosong: kembalikan true bila sudah ditangani (menghapus butir). */
  onBackspaceEmpty?: () => boolean;
  /** Bila diisi, `/` di paragraf kosong membuka menu "Tambah bagian" (hasil dipakai pemanggil). */
  onPickBlockFromSlash?: (preset: PresetId) => void;
};

type Pop =
  | { kind: "field"; pos: number; anchor: AnchorRect }
  | { kind: "chip"; pos: number; anchor: AnchorRect; value: ChipValue }
  | { kind: "block"; anchor: AnchorRect };

const same = (a: Inline[], b: Inline[]) => a === b || JSON.stringify(a) === JSON.stringify(b);

const toRect = (r: { left: number; top: number; right?: number; bottom: number }): AnchorRect => ({
  x: r.left, y: r.top, width: Math.max(1, (r.right ?? r.left + 1) - r.left), height: Math.max(1, r.bottom - r.top),
});

/**
 * Editor teks kecil untuk satu kolom teks di kertas. Ekstensi dibatasi: dokumen, paragraf, teks,
 * baris baru, tebal, miring, garis bawah, dan node `field` (chip isian). Semua yang lain dimatikan.
 */
export default function InlineEditor({
  value, doc, ariaLabel, placeholder, autoFocus, focusPoint, onFocusPlaced, className, style, onChange, onEditor, onCreateField,
  onEnterItem, onBackspaceEmpty, onPickBlockFromSlash,
}: InlineEditorProps) {
  const docRef = useRef(doc);
  docRef.current = doc;
  const cb = useRef({ onChange, onEnterItem, onBackspaceEmpty, onPickBlockFromSlash });
  cb.current = { onChange, onEnterItem, onBackspaceEmpty, onPickBlockFromSlash };
  const lastEmitted = useRef<Inline[]>(value);
  const [empty, setEmpty] = useState(value.length === 0);
  const [pop, setPop] = useState<Pop | null>(null);
  const editorRef = useRef<Editor | null>(null);

  const extensions = useMemo(() => createInlineExtensions((ref: string) => refLabel(ref, docRef.current)), []);

  const editor = useEditor({
    extensions,
    content: inlinesToTiptap(value),
    immediatelyRender: false,
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": ariaLabel,
        spellcheck: "true",
        lang: "id",
        class: "outline-none min-h-[1.2em]",
      },
      handleTextInput(view, from, _to, text) {
        if (text !== "/") return false;
        const $from = view.state.doc.resolve(from);
        const before = $from.parent.textBetween(0, $from.parentOffset, undefined, "￼");
        if (!slashTrigger(before)) return false;
        const coords = view.coordsAtPos(from);
        const anchor = toRect({ left: coords.left, top: coords.top, bottom: coords.bottom });
        const wholeEmpty = view.state.doc.textContent === "" && view.state.doc.content.size <= 2;
        if (wholeEmpty && cb.current.onPickBlockFromSlash) setPop({ kind: "block", anchor });
        else setPop({ kind: "field", pos: from, anchor });
        return true;
      },
      handleClickOn(view, _pos, node, nodePos, event) {
        if (node.type.name !== "field") return false;
        const el = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-field-ref]");
        const r = (el ?? (event.target as HTMLElement)).getBoundingClientRect();
        setPop({
          kind: "chip", pos: nodePos, anchor: toRect(r),
          value: { ref: String(node.attrs.ref), format: (node.attrs.format ?? null) as FormatId | null, fallback: (node.attrs.fallback ?? null) as string | null },
        });
        return true;
      },
      handleKeyDown(view, event) {
        const sel = view.state.selection;
        if (event.key === "Enter" && sel instanceof NodeSelection && sel.node.type.name === "field") {
          const el = view.nodeDOM(sel.from) as HTMLElement | null;
          const r = el?.getBoundingClientRect();
          if (r) {
            setPop({
              kind: "chip", pos: sel.from, anchor: toRect(r),
              value: { ref: String(sel.node.attrs.ref), format: (sel.node.attrs.format ?? null) as FormatId | null, fallback: (sel.node.attrs.fallback ?? null) as string | null },
            });
            return true;
          }
        }
        if (event.key === "Enter" && !event.shiftKey && cb.current.onEnterItem?.()) return true;
        if (event.key === "Backspace" && view.state.doc.content.size <= 2 && cb.current.onBackspaceEmpty?.()) return true;
        return false;
      },
    },
    onUpdate({ editor: ed }) {
      const inl = tiptapToInlines(ed.getJSON());
      setEmpty(ed.isEmpty);
      if (same(inl, lastEmitted.current)) return;
      lastEmitted.current = inl;
      cb.current.onChange(inl);
    },
  });

  editorRef.current = editor;

  // Letakkan kursor di titik yang diklik begitu editor terpasang di DOM.
  useEffect(() => {
    if (!editor || !focusPoint) return;
    const raf = requestAnimationFrame(() => {
      const hit = editor.view.posAtCoords({ left: focusPoint.x, top: focusPoint.y });
      editor.commands.focus(hit ? hit.pos : "end");
      onFocusPlaced?.();
    });
    return () => cancelAnimationFrame(raf);
    // hanya sekali per editor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  useEffect(() => {
    onEditor?.(editor ?? null);
    return () => onEditor?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Perubahan dari luar (undo/redo, ganti dokumen): selaraskan isi editor tanpa memicu simpan ulang.
  useEffect(() => {
    if (!editor || same(value, lastEmitted.current)) return;
    lastEmitted.current = value;
    editor.commands.setContent(inlinesToTiptap(value), { emitUpdate: false });
    setEmpty(editor.isEmpty);
  }, [value, editor]);

  const closePop = () => setPop(null);
  const refocus = (e: Event) => {
    e.preventDefault();
    editorRef.current?.commands.focus();
  };

  const create = (input: NewFieldInput) => {
    const id = onCreateField(input);
    return { ref: `isian.${id}`, label: input.label };
  };

  return (
    <div className={["lc-inline relative", className].filter(Boolean).join(" ")} style={style}>
      {empty && placeholder ? (
        <span aria-hidden className="pointer-events-none absolute left-0 top-0 select-none text-slate-500 italic">
          {placeholder}
        </span>
      ) : null}
      <EditorContent editor={editor} />

      <AnchoredPopover
        open={pop?.kind === "field"}
        onOpenChange={(o) => !o && closePop()}
        anchor={pop?.anchor ?? { x: 0, y: 0, width: 1, height: 1 }}
        label="Sisipkan isian"
        onCloseAutoFocus={refocus}
      >
        {pop?.kind === "field" && (
          <FieldPicker
            doc={doc}
            onCancel={closePop}
            onCreate={create}
            onPick={(ref, label) => {
              const at = pop.pos;
              closePop();
              if (editor) insertFieldChip(editor, ref, label, at);
            }}
          />
        )}
      </AnchoredPopover>

      <AnchoredPopover
        open={pop?.kind === "chip"}
        onOpenChange={(o) => !o && closePop()}
        anchor={pop?.anchor ?? { x: 0, y: 0, width: 1, height: 1 }}
        label="Ubah isian"
        className="w-80 p-0"
        onCloseAutoFocus={refocus}
      >
        {pop?.kind === "chip" && editor && (
          <ChipEditor
            doc={doc}
            value={pop.value}
            onCreate={create}
            onClose={closePop}
            onRemove={() => {
              removeFieldChip(editor, pop.pos);
              closePop();
            }}
            onChange={(next, label) => {
              updateFieldChip(editor, pop.pos, { ref: next.ref, format: next.format, fallback: next.fallback, label: label ?? null });
              setPop({ ...pop, value: next });
            }}
          />
        )}
      </AnchoredPopover>

      <AnchoredPopover
        open={pop?.kind === "block"}
        onOpenChange={(o) => !o && closePop()}
        anchor={pop?.anchor ?? { x: 0, y: 0, width: 1, height: 1 }}
        label="Tambah bagian"
        className="w-[22rem] max-w-[calc(100vw-1.5rem)] p-0"
        onCloseAutoFocus={refocus}
      >
        {pop?.kind === "block" && (
          <InsertMenu
            onCancel={closePop}
            onPick={(id) => {
              closePop();
              cb.current.onPickBlockFromSlash?.(id);
            }}
          />
        )}
      </AnchoredPopover>
    </div>
  );
}
