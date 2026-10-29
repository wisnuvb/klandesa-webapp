"use client";

import { memo } from "react";
import { AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";
import type { EditorApi } from "@/lib/letters/editor";
import { Button } from "@/components/ui/button";
import { checkSummary, plainIssueMessage } from "./helpers";

type Props = {
  editor: EditorApi;
  /** Dipanggil setelah bagian dipilih, mis. untuk menggulir kertas ke bagian itu. */
  onReveal?: (blockId: string) => void;
};

export const CheckPanel = memo(function CheckPanel({ editor, onReveal }: Props) {
  const { issues, hints, select } = editor;
  const summary = checkSummary({ issues, hints });

  const reveal = (blockId: string) => {
    select(blockId);
    onReveal?.(blockId);
  };

  if (summary.ok) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-input bg-muted/40 p-4" role="status">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
        <div>
          <p className="text-sm font-semibold">Surat siap dipakai</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Tidak ada yang perlu diperbaiki. Perubahan tersimpan otomatis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground" role="status">{summary.label}</p>

      {issues.length > 0 && (
        <section aria-labelledby="cek-galat" className="space-y-2">
          <h3 id="cek-galat" className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden /> Perlu diperbaiki ({issues.length})
          </h3>
          <p className="text-xs text-muted-foreground">Surat belum bisa disimpan sebelum hal berikut diperbaiki.</p>
          <ul className="space-y-2">
            {issues.map((it, i) => (
              <li key={`${it.path}-${i}`} className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                <p className="text-sm">{plainIssueMessage(it.message)}</p>
                {it.blockId && (
                  <Button type="button" variant="outline" size="sm" className="mt-2 min-h-11" onClick={() => reveal(it.blockId!)}>
                    Tunjukkan di kertas
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {hints.length > 0 && (
        <section aria-labelledby="cek-saran" className="space-y-2">
          <h3 id="cek-saran" className="flex items-center gap-1.5 text-sm font-semibold">
            <Lightbulb className="h-4 w-4" aria-hidden /> Saran ({hints.length})
          </h3>
          <p className="text-xs text-muted-foreground">Tidak wajib, tetapi membuat surat lebih lengkap.</p>
          <ul className="space-y-2">
            {hints.map((h, i) => (
              <li key={`${h.code}-${i}`} className="rounded-md border border-input p-3">
                <p className="text-sm">{h.message}</p>
                {h.blockId && (
                  <Button type="button" variant="outline" size="sm" className="mt-2 min-h-11" onClick={() => reveal(h.blockId!)}>
                    Tunjukkan di kertas
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
});
