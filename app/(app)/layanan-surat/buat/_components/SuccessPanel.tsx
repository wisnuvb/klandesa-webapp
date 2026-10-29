"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileText, ListChecks, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LetterPaper, letterPrintCss } from "@/components/letters/LetterPaper";
import { ScaledPaper } from "./ScaledPaper";
import { printInIframe } from "../_utils/dom";
import type { IssuedLetter } from "../_hooks/useLetterComposer";

/** Cadangan bila iframe cetak tidak tersedia: sembunyikan semuanya kecuali kertas. */
const FALLBACK_PRINT_CSS =
  "@media print{body *{visibility:hidden!important}#letter-print,#letter-print *{visibility:visible!important}" +
  "#letter-print{position:absolute;left:0;top:0;width:100%}.lc-scale{transform:none!important;width:auto!important}}";

export function SuccessPanel({
  issued,
  templateName,
  onNew,
  onList,
}: {
  issued: IssuedLetter;
  templateName: string;
  onNew: () => void;
  onList: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const [printHelp, setPrintHelp] = useState("");
  const hasNumber = issued.letterNumber && !/^(DRAFT-|TANPA-NOMOR-)/.test(issued.letterNumber);

  const print = async () => {
    setPrintHelp("");
    const el = printRef.current;
    if (!el) return;
    const ok = await printInIframe(el, issued.document, `${templateName} ${hasNumber ? issued.letterNumber : ""}`.trim());
    if (ok) return;
    try {
      window.print();
    } catch {
      setPrintHelp("Peramban memblokir pencetakan. Izinkan jendela cetak untuk situs ini, atau gunakan menu Cetak peramban (Ctrl/⌘ + P).");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <style>{letterPrintCss(issued.document) + FALLBACK_PRINT_CSS}</style>
      <div className="lc-no-print space-y-4 rounded-lg border bg-card p-6 text-card-foreground">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold" tabIndex={-1} id="issued-heading">
              {issued.wasAlready ? "Surat ini sudah terbit" : "Surat berhasil diterbitkan"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {templateName}
              {hasNumber ? <> · Nomor <strong className="text-foreground">{issued.letterNumber}</strong></> : null}
            </p>
            {issued.wasAlready ? <p className="mt-1 text-sm text-muted-foreground">Surat yang sudah terbit tidak bisa diubah. Buat surat baru bila ada kesalahan.</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="min-h-10 gap-2 pointer-coarse:min-h-11" onClick={print}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Cetak
          </Button>
          <Button type="button" variant="outline" className="min-h-10 gap-2 pointer-coarse:min-h-11" onClick={onNew}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Buat surat lagi
          </Button>
          <Button type="button" variant="outline" className="min-h-10 gap-2 pointer-coarse:min-h-11" onClick={onList}>
            <ListChecks className="h-4 w-4" aria-hidden="true" />
            Ke daftar surat
          </Button>
        </div>
        {printHelp ? <p role="alert" className="text-sm text-destructive">{printHelp}</p> : null}
      </div>

      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground lc-no-print">
          <FileText className="h-4 w-4" aria-hidden="true" />
          Hasil akhir
        </h3>
        <ScaledPaper doc={issued.document} zoom="fit">
          <div id="letter-print" ref={printRef} className="shadow-md">
            <LetterPaper doc={issued.document} values={issued.values} mode="print" />
          </div>
        </ScaledPaper>
      </div>
    </div>
  );
}
