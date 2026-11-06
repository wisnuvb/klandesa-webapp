"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  /** Rahasia sekali-lihat: tautan atur sandi atau kode reset. Tidak pernah disimpan di tempat lain. */
  secret: string;
  warning: string;
  note?: string;
  onDismiss: () => void;
};

/** Kotak sekali-lihat: rahasia hanya ada di memori komponen ini; hilang saat disembunyikan, panel ditutup, atau halaman dimuat ulang. */
export function OneTimeSecretBox({ title, secret, warning, note, onDismiss }: Props) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(t);
  }, [copied]);

  async function copy() {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      setCopyError(true);
      inputRef.current?.select();
    }
  }

  return (
    <div role="region" aria-label={title} className="rounded-lg border border-amber-500/50 bg-amber-50 p-3 text-amber-950 dark:bg-amber-950/30 dark:text-amber-50">
      <p className="flex items-start gap-2 text-sm font-semibold">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        {title}
      </p>
      <p className="mt-1 text-xs">{warning}</p>
      <input
        ref={inputRef}
        readOnly
        value={secret}
        aria-label={title}
        onFocus={(e) => e.currentTarget.select()}
        className="mt-2 h-10 w-full rounded-md border bg-background px-2 font-mono text-sm tabular-nums text-foreground"
      />
      {note ? <p className="mt-1 text-xs">{note}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button type="button" size="sm" className="min-h-10" onClick={copy}>
          {copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
          {copied ? "Tersalin" : "Salin"}
        </Button>
        <Button type="button" size="sm" variant="outline" className="min-h-10" onClick={onDismiss}>
          <EyeOff aria-hidden="true" className="h-4 w-4" />
          Sembunyikan
        </Button>
      </div>
      <p className="sr-only" aria-live="polite">{copied ? "Tersalin ke papan klip." : ""}</p>
      {copyError ? <p role="alert" className="mt-1 text-xs text-destructive">Gagal menyalin otomatis. Teks sudah dipilih; tekan Ctrl+C.</p> : null}
    </div>
  );
}
