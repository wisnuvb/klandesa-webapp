import type { Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { FieldNode } from "./field-node";

/**
 * Himpunan ekstensi Tiptap yang BOLEH dipakai penyunting teks surat. Dibatasi persis ke:
 * doc, paragraph, text, hardBreak, bold, italic, underline, dan node atom `field`.
 * Semua ekstensi lain bawaan StarterKit dimatikan (undo/redo diurus riwayat editor surat sendiri).
 */
export function createInlineExtensions(getLabel: (ref: string) => string): Extensions {
  return [
    StarterKit.configure({
      blockquote: false, bulletList: false, orderedList: false, listItem: false, listKeymap: false,
      code: false, codeBlock: false, heading: false, horizontalRule: false, strike: false, link: false,
      dropcursor: false, gapcursor: false, undoRedo: false, trailingNode: false,
    }),
    FieldNode.configure({ getLabel }),
  ];
}
