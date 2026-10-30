/**
 * Kelas tampilan "chip" isian. Dipisah dari field-node.ts agar komponen statis (StaticInlines) tidak
 * menarik seluruh Tiptap/ProseMirror ke bundel awal; Tiptap hanya dimuat saat bagian benar-benar diedit.
 */
export const CHIP_CLASS =
  "inline-block mx-px px-1.5 rounded border border-sky-400 bg-sky-100 text-sky-950 text-[0.9em] leading-[1.35] align-baseline cursor-pointer select-none whitespace-nowrap";
