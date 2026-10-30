import { Fragment } from "react";
import type { Inline, LetterDocument } from "@/lib/letters/document/schema";
import { CHIP_CLASS } from "./chip-class";
import { refLabel } from "./helpers";

/** Teks bergaya dengan isian sebagai chip — tampilan "diam" dari kolom teks yang belum sedang diketik. */
export function StaticInlines({
  inlines,
  doc,
  placeholder,
}: {
  inlines: readonly Inline[];
  doc: Pick<LetterDocument, "people" | "fields">;
  placeholder?: string;
}) {
  if (inlines.length === 0) {
    return <span className="text-slate-500 italic">{placeholder ?? "Ketik di sini"}</span>;
  }
  return (
    <>
      {inlines.map((n, i) => {
        if (n.type === "br") return <br key={i} />;
        if (n.type === "field") {
          return (
            <span key={i} className={CHIP_CLASS} data-field-ref={n.ref}>
              {refLabel(n.ref, doc)}
            </span>
          );
        }
        let node = <Fragment>{n.text}</Fragment>;
        if (n.marks?.includes("u")) node = <u>{node}</u>;
        if (n.marks?.includes("i")) node = <em>{node}</em>;
        if (n.marks?.includes("b")) node = <strong>{node}</strong>;
        return <Fragment key={i}>{node}</Fragment>;
      })}
    </>
  );
}
