"use client";

import { useEffect, type RefObject } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/components/ui/utils";

type ComposerProps = {
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** Jawaban sedang disusun: pengguna tetap bisa mengetik, tetapi belum bisa mengirim. */
  busy: boolean;
  /** Tidak boleh mengirim (mis. kredit habis atau percakapan sedang dimuat). */
  sendDisabled: boolean;
};

const MAX_HEIGHT_PX = 176;

export function Composer({ value, onChange, onSend, textareaRef, busy, sendDisabled }: ComposerProps) {
  // Kotak tumbuh mengikuti isi (hingga batas), supaya pertanyaan panjang tidak tersembunyi di satu baris.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value, textareaRef]);

  const canSend = !busy && !sendDisabled && value.trim().length > 0;

  return (
    <div>
      <div className="flex items-end gap-2 rounded-2xl border bg-background px-3 py-2 shadow-sm transition-shadow focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-ring/30">
        <label htmlFor="laras-input" className="sr-only">
          Pertanyaan untuk Laras
        </label>
        <Textarea
          id="laras-input"
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tulis pertanyaan Anda…"
          rows={1}
          // text-base di layar kecil mencegah iOS memperbesar halaman saat kotak difokuskan.
          className={cn(
            "max-h-44 min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-base md:text-sm",
            "!border-0 !shadow-none !ring-0 !rounded-none outline-none focus-visible:!ring-0",
          )}
          onKeyDown={(e) => {
            // isComposing: Enter yang mengonfirmasi teks IME (mis. keyboard seluler) bukan perintah kirim.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
        />
        <Button
          type="button"
          size="icon"
          className="mb-0.5 size-9 shrink-0 rounded-full"
          disabled={!canSend}
          onClick={onSend}
          aria-label={busy ? "Menunggu jawaban Laras" : "Kirim pertanyaan"}
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
        </Button>
      </div>
      <p className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 px-1 text-xs text-muted-foreground">
        <span>
          Menggunakan AI pihak ketiga: jangan kirim NIK, nomor telp, atau data pribadi warga.
        </span>
        <span className="hidden sm:inline">Enter kirim · Shift+Enter baris baru</span>
      </p>
    </div>
  );
}
