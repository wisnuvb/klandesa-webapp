"use client";

import { memo, useMemo, useState } from "react";
import { Maximize2, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LetterPaper } from "@/components/letters/LetterPaper";
import type { LetterDocument } from "@/lib/letters/document/schema";
import type { LetterValues } from "@/lib/letters/values";
import { ScaledPaper, type ZoomMode } from "./ScaledPaper";

const Paper = memo(function Paper({
  doc,
  values,
  onFieldClick,
}: {
  doc: LetterDocument;
  values: LetterValues;
  onFieldClick: (ref: string) => void;
}) {
  return <LetterPaper doc={doc} values={values} mode="preview" onFieldClick={onFieldClick} />;
});

/** Kertas hidup + kontrol zoom + pesan "terisi otomatis" (region aria-live, tidak mencuri fokus). */
export function PaperPane({
  doc,
  values,
  onFieldClick,
  notice,
}: {
  doc: LetterDocument;
  values: LetterValues;
  onFieldClick: (ref: string) => void;
  notice: string;
}) {
  const [zoom, setZoom] = useState<ZoomMode>("fit");
  const paper = useMemo(() => <Paper doc={doc} values={values} onFieldClick={onFieldClick} />, [doc, values, onFieldClick]);

  return (
    <section aria-label="Pratinjau surat" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Klik bagian kuning di kertas untuk mengisinya.</p>
        <div className="flex gap-2" role="group" aria-label="Ukuran pratinjau">
          <Button type="button" size="sm" variant={zoom === "fit" ? "default" : "outline"} aria-pressed={zoom === "fit"}
            className="min-h-9 gap-1 pointer-coarse:min-h-11" onClick={() => setZoom("fit")}>
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
            Pas lebar
          </Button>
          <Button type="button" size="sm" variant={zoom === "100" ? "default" : "outline"} aria-pressed={zoom === "100"}
            className="min-h-9 gap-1 pointer-coarse:min-h-11" onClick={() => setZoom("100")}>
            <ZoomIn className="h-4 w-4" aria-hidden="true" />
            100%
          </Button>
        </div>
      </div>
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-foreground">{notice}</p>
      <ScaledPaper doc={doc} zoom={zoom}>{paper}</ScaledPaper>
    </section>
  );
}
