import { Node, mergeAttributes } from "@tiptap/core";
import { CHIP_CLASS } from "./chip-class";

export { CHIP_CLASS };

export type FieldNodeOptions = {
  /** Label awam untuk ref; dipakai bila node belum punya `label` (mis. dari dokumen tersimpan). */
  getLabel: (ref: string) => string;
};

/**
 * Isian di dalam teks: node atom sebaris dengan atribut `{ref, format, fallback}` (plus `label`
 * hanya untuk tampilan). Konversi ke/dari `Inline` ada di `lib/letters/editor/inline-tiptap`.
 */
export const FieldNode = Node.create<FieldNodeOptions>({
  name: "field",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return { getLabel: (ref: string) => ref };
  },

  addAttributes() {
    return {
      ref: { default: "", rendered: false },
      format: { default: null, rendered: false },
      fallback: { default: null, rendered: false },
      label: { default: null, rendered: false },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-field-ref]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const ref = String(node.attrs.ref ?? "");
    const label = (node.attrs.label as string | null) || this.options.getLabel(ref);
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-field-ref": ref,
        class: CHIP_CLASS,
        role: "button",
        "aria-label": `Isian ${label}. Tekan Enter untuk mengubah.`,
        title: `Isian: ${label}`,
      }),
      label,
    ];
  },
});
