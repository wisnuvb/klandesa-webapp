"use client";

import { CircleAlert, ClipboardCheck } from "lucide-react";
import type { LintWarning } from "@/lib/letters/document/form-spec";
import { focusInput } from "../_utils/dom";
import type { MissingItem } from "../_utils/composer";

/** Kode saran yang bisa dipahami/diperbaiki operator pembuat surat; sisanya urusan penyusun jenis surat. */
const RELEVANT = new Set(["EMPTY_BODY", "NO_SIGNATURE", "NUMBER_NOT_SHOWN", "NUMBER_DISABLED"]);

export function CheckPanel({
  missing,
  warnings,
}: {
  missing: MissingItem[];
  warnings: LintWarning[];
}) {
  const notes = warnings.filter((w) => RELEVANT.has(w.code));
  if (missing.length === 0 && notes.length === 0) {
    return (
      <p data-tour="composer-check" className="flex items-center gap-2 text-sm text-muted-foreground">
        <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
        Semua isian wajib sudah terisi.
      </p>
    );
  }
  return (
    <section data-tour="composer-check" aria-label="Cek surat" className="space-y-2 rounded-lg border p-3 text-sm">
      <h3 className="flex items-center gap-2 font-semibold">
        <CircleAlert className="h-4 w-4" aria-hidden="true" />
        Cek surat
      </h3>
      {missing.length > 0 ? (
        <div>
          <p className="text-muted-foreground">Masih perlu diisi ({missing.length}):</p>
          <ul className="mt-1 space-y-1">
            {missing.slice(0, 6).map((m) => (
              <li key={m.inputId + m.message}>
                <button type="button" className="min-h-8 text-left underline underline-offset-2 hover:text-primary pointer-coarse:min-h-11"
                  onClick={() => focusInput(m.inputId)}>
                  {m.message}
                </button>
              </li>
            ))}
            {missing.length > 6 ? <li className="text-muted-foreground">…dan {missing.length - 6} lainnya</li> : null}
          </ul>
        </div>
      ) : null}
      {notes.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          {notes.map((w) => <li key={w.code}>{w.message}</li>)}
        </ul>
      ) : null}
    </section>
  );
}
