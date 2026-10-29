import type { Editor } from "@tiptap/core";

/** Sisipkan chip isian di posisi `pos` (atau seleksi saat ini) lalu kembalikan fokus ke teks. */
export function insertFieldChip(editor: Editor, ref: string, label: string, pos?: number): void {
  const at = pos ?? editor.state.selection.from;
  editor
    .chain()
    .focus()
    .insertContentAt(at, { type: "field", attrs: { ref, label } })
    .run();
}

/** Perbarui atribut chip pada posisi `pos` (ganti isian, format, teks pengganti). */
export function updateFieldChip(
  editor: Editor,
  pos: number,
  attrs: { ref: string; format: string | null; fallback: string | null; label?: string | null },
): void {
  const node = editor.state.doc.nodeAt(pos);
  if (!node || node.type.name !== "field") return;
  editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs, label: attrs.label ?? null }));
}

export function removeFieldChip(editor: Editor, pos: number): void {
  const node = editor.state.doc.nodeAt(pos);
  if (!node || node.type.name !== "field") return;
  editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
}
