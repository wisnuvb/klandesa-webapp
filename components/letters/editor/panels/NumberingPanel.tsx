"use client";

import { memo, useMemo, useRef } from "react";
import type { EditorApi } from "@/lib/letters/editor";
import {
  NUMBER_MODE_LABELS, RESET_LABELS, TOKEN_INFO, TOKEN_LIST, insertTokenAt, previewNumber, validateCounterKey,
  validatePatternInput,
} from "./helpers";
import { Disclosure, RadioCards, Section, SelectField, TextField, hintClass } from "./ui";

const MODE_OPTIONS = Object.entries(NUMBER_MODE_LABELS).map(([value, v]) => ({
  value: value as keyof typeof NUMBER_MODE_LABELS, label: v.label, hint: v.hint,
}));
const RESET_OPTIONS = Object.entries(RESET_LABELS).map(([value, label]) => ({ value: value as keyof typeof RESET_LABELS, label }));
const PAD_OPTIONS = [0, 1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: n === 0 ? "Tanpa nol di depan (7)" : `${n} angka (${String(7).padStart(n, "0")})` }));

export const NumberingPanel = memo(function NumberingPanel({ editor }: { editor: EditorApi }) {
  const { numbering } = editor.doc;
  const { setNumbering } = editor;
  const patternRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(
    () => (numbering.mode === "none" ? "" : previewNumber(numbering)),
    [numbering],
  );

  const addToken = (token: (typeof TOKEN_LIST)[number]) => {
    const el = patternRef.current;
    const { value } = insertTokenAt(numbering.pattern, token, el?.selectionStart ?? undefined, el?.selectionEnd ?? undefined);
    setNumbering({ pattern: value });
  };

  return (
    <div className="space-y-6">
      <Section title="Nomor surat">
        <RadioCards
          legend="Cara penomoran"
          value={numbering.mode}
          onChange={(mode) => setNumbering({ mode })}
          options={MODE_OPTIONS}
        />
      </Section>

      {numbering.mode !== "none" && (
        <>
          <Section title="Susunan nomor" description="Ketik pola nomor, atau tekan tombol di bawah untuk menyisipkan bagian nomor.">
            <TextField
              label="Pola nomor"
              value={numbering.pattern}
              inputRef={patternRef}
              mono
              maxLength={120}
              validate={(v) => validatePatternInput(v, numbering.mode)}
              onCommit={(pattern) => setNumbering({ pattern })}
              hint="Contoh: {URUT}/{KLASIFIKASI}/{KODE_DESA}/{BULAN_ROMAWI}/{TAHUN}"
            />
            <div role="group" aria-label="Sisipkan bagian nomor" className="flex flex-wrap gap-2">
              {TOKEN_LIST.map((tok) => (
                <button
                  key={tok}
                  type="button"
                  title={TOKEN_INFO[tok].hint}
                  onClick={() => addToken(tok)}
                  className="min-h-11 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  + {TOKEN_INFO[tok].label}
                </button>
              ))}
            </div>
            <div className="rounded-md bg-muted px-3 py-2" aria-live="polite">
              <p className="text-xs text-muted-foreground">Contoh nomor ke-12:</p>
              <p className="break-all font-mono text-sm text-foreground">{preview || "—"}</p>
            </div>
          </Section>

          <Section title="Nomor urut">
            <SelectField
              label="Jumlah angka nomor urut"
              value={numbering.padding}
              options={PAD_OPTIONS}
              onChange={(padding) => setNumbering({ padding })}
            />
            <SelectField
              label="Mulai dari 1 lagi"
              value={numbering.reset}
              options={RESET_OPTIONS}
              onChange={(reset) => setNumbering({ reset })}
            />
            <TextField
              label="Kode klasifikasi (opsional)"
              value={numbering.klasifikasi ?? ""}
              maxLength={40}
              placeholder="mis. 470"
              onCommit={(v) => setNumbering({ klasifikasi: v.trim() || undefined })}
              hint="Dipakai bila pola memuat {KLASIFIKASI}."
            />
          </Section>

          <Disclosure>
            <TextField
              label="Buku nomor bersama"
              value={numbering.counterKey}
              mono
              maxLength={40}
              validate={validateCounterKey}
              onCommit={(counterKey) => setNumbering({ counterKey })}
            />
            <p className={hintClass}>
              Surat yang memakai nama buku yang sama berbagi satu urutan nomor, seperti satu buku agenda.
              Gunakan nama berbeda bila ingin urutan sendiri.
            </p>
          </Disclosure>
        </>
      )}
    </div>
  );
});
