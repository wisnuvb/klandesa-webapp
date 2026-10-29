"use client";

import { memo, useState } from "react";
import { Info } from "lucide-react";
import type { EditorApi } from "@/lib/letters/editor";
import { FONTS, MARGIN_PRESETS, PAPER_SIZES, type MarginMm } from "@/lib/letters/paper";
import { cn } from "@/components/ui/utils";
import {
  FONT_SIZES, KIND_LABELS, LETTERHEAD_LABELS, LINE_HEIGHT_LABELS, audienceChange, clampMargin, marginPresetOf,
} from "./helpers";
import { ConfirmDialog, Disclosure, NumberField, RadioCards, Section, SelectField } from "./ui";

const SIZE_OPTIONS = Object.entries(PAPER_SIZES).map(([value, p]) => ({ value: value as keyof typeof PAPER_SIZES, label: p.label }));
const FONT_OPTIONS = Object.entries(FONTS).map(([value, f]) => ({ value: value as keyof typeof FONTS, label: f.label }));
const KIND_OPTIONS = Object.entries(KIND_LABELS).map(([value, label]) => ({ value: value as keyof typeof KIND_LABELS, label }));
const LETTERHEAD_OPTIONS = Object.entries(LETTERHEAD_LABELS).map(([value, v]) => ({
  value: value as keyof typeof LETTERHEAD_LABELS, label: v.label, hint: v.hint,
}));

const MARGIN_SIDES: Array<{ key: keyof MarginMm; label: string }> = [
  { key: "top", label: "Atas" },
  { key: "bottom", label: "Bawah" },
  { key: "left", label: "Kiri" },
  { key: "right", label: "Kanan" },
];

export const PagePanel = memo(function PagePanel({ editor }: { editor: EditorApi }) {
  const { doc, setPage, setMeta, addPerson } = editor;
  const { page } = doc;
  const [pendingInternal, setPendingInternal] = useState(false);
  const preset = marginPresetOf(page.margin);

  const sizeOptions = FONT_SIZES.includes(page.fontSizePt as (typeof FONT_SIZES)[number])
    ? FONT_SIZES.map((n) => ({ value: n, label: `${n} pt` }))
    : [...FONT_SIZES, page.fontSizePt].sort((a, b) => a - b).map((n) => ({ value: n, label: `${n} pt` }));

  const changeAudience = (to: "warga" | "internal") => {
    const plan = audienceChange(doc, to);
    if (plan.warning) {
      setPendingInternal(true);
      return;
    }
    // Surat untuk warga selalu membutuhkan "Pemohon".
    if (plan.needsPemohon) addPerson("Pemohon");
    setMeta({ audience: to });
  };

  return (
    <div className="space-y-6">
      <Section title="Kertas" description="Ukuran standar surat dinas desa adalah F4 / Folio.">
        <SelectField label="Ukuran kertas" value={page.size} options={SIZE_OPTIONS} onChange={(size) => setPage({ size })} />
        <RadioCards
          legend="Arah kertas"
          columns={2}
          value={page.orientation}
          onChange={(orientation) => setPage({ orientation })}
          options={[
            { value: "portrait", label: "Tegak" },
            { value: "landscape", label: "Mendatar" },
          ]}
        />
      </Section>

      <Section title="Tepi kertas (margin)">
        <div role="group" aria-label="Pilihan margin cepat" className="grid grid-cols-3 gap-2">
          {Object.entries(MARGIN_PRESETS).map(([id, p]) => (
            <button
              key={id}
              type="button"
              aria-pressed={preset === id}
              onClick={() => setPage({ margin: { ...p.margin } })}
              className={cn(
                "min-h-11 rounded-md border px-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                preset === id ? "border-primary bg-accent" : "border-input bg-background hover:bg-accent/60",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === "custom" && <p className="text-xs text-muted-foreground">Margin disesuaikan sendiri.</p>}
        <div className="grid grid-cols-2 gap-3">
          {MARGIN_SIDES.map((s) => (
            <NumberField
              key={s.key}
              label={s.label}
              unit="mm"
              min={5}
              max={60}
              value={page.margin[s.key]}
              onCommit={(v) => setPage({ margin: { ...page.margin, [s.key]: clampMargin(v) } })}
            />
          ))}
        </div>
      </Section>

      <Section title="Huruf">
        <SelectField label="Jenis huruf" value={page.font} options={FONT_OPTIONS} onChange={(font) => setPage({ font })} />
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Ukuran huruf" value={page.fontSizePt} options={sizeOptions} onChange={(fontSizePt) => setPage({ fontSizePt })} />
          <SelectField label="Jarak antarbaris" value={page.lineHeight} options={LINE_HEIGHT_LABELS} onChange={(lineHeight) => setPage({ lineHeight })} />
        </div>
      </Section>

      <Section title="Kop surat">
        <RadioCards
          legend="Kop yang dipakai"
          value={doc.letterhead}
          onChange={(letterhead) => setMeta({ letterhead })}
          options={LETTERHEAD_OPTIONS}
        />
      </Section>

      <Section title="Jenis surat">
        <SelectField label="Jenis" value={doc.kind} options={KIND_OPTIONS} onChange={(kind) => setMeta({ kind })} />
        <RadioCards
          legend="Surat ini untuk"
          value={doc.audience}
          onChange={changeAudience}
          options={[
            { value: "warga", label: "Warga", hint: "Ada pemohon; data warga bisa diisi otomatis." },
            { value: "internal", label: "Internal desa", hint: "Surat dinas tanpa pemohon." },
          ]}
        />
        {doc.audience === "warga" && !doc.people.some((p) => p.id === "pemohon") && (
          <p className="flex items-start gap-1.5 text-sm text-destructive">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Surat untuk warga membutuhkan orang berperan &ldquo;Pemohon&rdquo;. Buka tab Orang &amp; isian untuk menambahkannya.
          </p>
        )}
      </Section>

      <Disclosure>
        <p className="text-xs text-muted-foreground">
          Ukuran: {PAPER_SIZES[page.size].widthMm} × {PAPER_SIZES[page.size].heightMm} mm. Margin dan huruf berlaku untuk seluruh halaman surat.
        </p>
      </Disclosure>

      <ConfirmDialog
        open={pendingInternal}
        onOpenChange={setPendingInternal}
        title="Jadikan surat internal?"
        description={audienceChange(doc, "internal").warning ?? ""}
        confirmLabel="Ya, jadikan internal"
        onConfirm={() => setMeta({ audience: "internal" })}
      />
    </div>
  );
});
