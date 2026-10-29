"use client";

import { useId, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FORMAT_IDS, type FormatId } from "@/lib/letters/format";
import type { LetterDocument } from "@/lib/letters/document/schema";
import { FieldPicker, type NewFieldInput } from "./FieldPicker";
import { FORMAT_LABELS, refLabel } from "./helpers";

export type ChipValue = { ref: string; format: FormatId | null; fallback: string | null };

type Props = {
  doc: Pick<LetterDocument, "people" | "fields">;
  value: ChipValue;
  onChange: (next: ChipValue, label?: string) => void;
  onRemove: () => void;
  onClose: () => void;
  onCreate: (input: NewFieldInput) => { ref: string; label: string };
};

/** Isi popover saat chip isian di teks diklik: ganti isian, atur format, teks pengganti, atau hapus. */
export function ChipEditor({ doc, value, onChange, onRemove, onClose, onCreate }: Props) {
  const uid = useId();
  const [replacing, setReplacing] = useState(false);

  if (replacing) {
    return (
      <FieldPicker
        doc={doc}
        onCreate={onCreate}
        onCancel={() => setReplacing(false)}
        onPick={(ref, label) => {
          onChange({ ...value, ref }, label);
          setReplacing(false);
        }}
      />
    );
  }

  const field = "h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <div
      className="space-y-3 p-3"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div>
        <p className="text-xs text-muted-foreground">Isian</p>
        <p className="text-sm font-medium">{refLabel(value.ref, doc)}</p>
      </div>
      <Button type="button" variant="outline" className="min-h-11 w-full" onClick={() => setReplacing(true)}>
        Ganti dengan isian lain
      </Button>
      <div className="space-y-1">
        <label htmlFor={`${uid}-fmt`} className="text-sm font-medium">Cara menulis</label>
        <select
          id={`${uid}-fmt`}
          className={field}
          value={value.format ?? ""}
          onChange={(e) => onChange({ ...value, format: (e.target.value || null) as FormatId | null })}
        >
          <option value="">Apa adanya</option>
          {FORMAT_IDS.map((f) => (
            <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor={`${uid}-fb`} className="text-sm font-medium">Jika kosong, tulis</label>
        <input
          id={`${uid}-fb`}
          className={field}
          value={value.fallback ?? ""}
          maxLength={100}
          placeholder="mis. -"
          onChange={(e) => onChange({ ...value, fallback: e.target.value === "" ? null : e.target.value })}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="min-h-11 flex-1 gap-1 text-destructive" onClick={onRemove}>
          <Trash2 className="h-4 w-4" aria-hidden /> Hapus isian
        </Button>
        <Button type="button" className="min-h-11 flex-1" onClick={onClose}>Selesai</Button>
      </div>
    </div>
  );
}
