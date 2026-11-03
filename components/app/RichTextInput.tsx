"use client";

import { useLayoutEffect, useRef, type MouseEvent } from "react";
import { Bold, Italic, List, ListOrdered, Underline } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { RICH_MAX_LENGTH } from "@/lib/letters/rich";
import { BOLD, ITALIC, UNDERLINE, toggleList, toggleWrap, type Edit } from "@/lib/letters/rich-edit";

const TOOLS = [
  { id: "bold", label: "Tebal", Icon: Bold, run: (v: string, s: number, e: number) => toggleWrap(v, s, e, BOLD) },
  { id: "italic", label: "Miring", Icon: Italic, run: (v: string, s: number, e: number) => toggleWrap(v, s, e, ITALIC) },
  { id: "underline", label: "Garis bawah", Icon: Underline, run: (v: string, s: number, e: number) => toggleWrap(v, s, e, UNDERLINE) },
  { id: "ol", label: "Daftar bernomor", Icon: ListOrdered, run: (v: string, s: number, e: number) => toggleList(v, s, e, "ol") },
  { id: "ul", label: "Daftar berpoin", Icon: List, run: (v: string, s: number, e: number) => toggleList(v, s, e, "ul") },
] as const;

/**
 * Kolom teks berformat: textarea biasa + bilah format. Isinya markdown aman (paragraf, daftar, **tebal**, *miring*, <u>garis bawah</u>) dan beberapa tag HTML kecil;
 * hasilnya langsung terlihat di kertas. Bilah hanyalah pintasan — mengetik penandanya langsung juga berfungsi.
 */
export function RichTextInput({
  id,
  value,
  onChange,
  placeholder,
  rows = 8,
  "aria-describedby": describedBy,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  "aria-describedby"?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const pending = useRef<{ start: number; end: number } | null>(null);
  const hintId = `${id}-rich-hint`;

  // Pulihkan seleksi sesudah React menulis nilai baru (nilai terkontrol mereset kursor).
  useLayoutEffect(() => {
    const sel = pending.current;
    const el = ref.current;
    if (sel && el) {
      pending.current = null;
      el.focus();
      el.setSelectionRange(sel.start, sel.end);
    }
  }, [value]);

  const apply = (run: (v: string, s: number, e: number) => Edit) => {
    const el = ref.current;
    if (!el) return;
    const edit = run(value, el.selectionStart ?? value.length, el.selectionEnd ?? value.length);
    if (edit.value.length > RICH_MAX_LENGTH) return;
    pending.current = { start: edit.start, end: edit.end };
    onChange(edit.value);
  };

  return (
    <div className="space-y-1.5">
      <div role="toolbar" aria-label="Format teks" aria-controls={id} className="flex flex-wrap gap-1">
        {TOOLS.map(({ id: tid, label, Icon, run }) => (
          <button
            key={tid}
            type="button"
            title={label}
            aria-label={label}
            // Cegah tombol merebut fokus agar seleksi di textarea tidak hilang.
            onMouseDown={(e: MouseEvent) => e.preventDefault()}
            onClick={() => apply(run)}
            className="inline-flex size-9 items-center justify-center rounded-md border border-input bg-background text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:size-11"
          >
            <Icon className="size-4" aria-hidden />
          </button>
        ))}
      </div>
      <Textarea
        ref={ref}
        id={id}
        rows={rows}
        maxLength={RICH_MAX_LENGTH}
        value={value}
        placeholder={placeholder}
        aria-describedby={[describedBy, hintId].filter(Boolean).join(" ")}
        onChange={(e) => onChange(e.target.value)}
      />
      <p id={hintId} className="text-xs text-muted-foreground">
        Baris kosong = paragraf baru. Awali baris dengan “1.” atau “-” untuk daftar. Tag &lt;br&gt;, &lt;p&gt;, &lt;b&gt;, &lt;i&gt;, &lt;u&gt; juga dikenali.
      </p>
    </div>
  );
}
