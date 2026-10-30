"use client";

import { memo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageAssetModal } from "@/components/ImageAssetModal";
import type { SectionCmsField } from "@/lib/website-engine/site-sections";
import type { SectionListValue } from "@/lib/website-engine/section-items";

type ListField = Extract<SectionCmsField, { type: "list" }>;

type Props = {
  field: ListField;
  value: SectionListValue;
  saving: boolean;
  onChange: (next: SectionListValue) => void;
};

function ImageCell(props: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <Input
        aria-label={props.label}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        disabled={props.disabled}
        className="min-w-0 flex-1"
      />
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} disabled={props.disabled}>
        Pilih gambar
      </Button>
      <ImageAssetModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSelectImage={(url) => props.onChange(url)}
      />
    </div>
  );
}

export const ListFieldEditor = memo(function ListFieldEditor({ field, value, saving, onChange }: Props) {
  const items = value;
  const set = (i: number, name: string, v: string) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, [name]: v } : it)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="grid gap-3 md:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">
          {field.label}{" "}
          <span className="text-muted-foreground text-xs font-normal">
            ({items.length}/{field.max})
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
          Belum ada {field.itemLabel}. Tekan tombol di bawah untuk menambah.
        </p>
      ) : null}

      <ol className="grid gap-3">
        {items.map((item, i) => (
          <li key={i} className="grid gap-2 rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {field.itemLabel[0].toUpperCase() + field.itemLabel.slice(1)} {i + 1}
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Naikkan ${field.itemLabel} ${i + 1}`}
                  disabled={saving || i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Turunkan ${field.itemLabel} ${i + 1}`}
                  disabled={saving || i === items.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Hapus ${field.itemLabel} ${i + 1}`}
                  disabled={saving}
                  onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="size-4 text-red-600" />
                </Button>
              </div>
            </div>
            {field.fields.map((f) => {
              const v = item[f.name] ?? "";
              return (
                <div key={f.name} className="grid gap-1">
                  <div className="text-xs text-muted-foreground">{f.label}</div>
                  {f.type === "textarea" ? (
                    <Textarea
                      rows={3}
                      value={v}
                      aria-label={`${f.label} ${field.itemLabel} ${i + 1}`}
                      onChange={(e) => set(i, f.name, e.target.value)}
                      disabled={saving}
                    />
                  ) : f.type === "image" ? (
                    <ImageCell
                      label={`${f.label} ${field.itemLabel} ${i + 1}`}
                      value={v}
                      disabled={saving}
                      onChange={(nv) => set(i, f.name, nv)}
                    />
                  ) : (
                    <Input
                      value={v}
                      aria-label={`${f.label} ${field.itemLabel} ${i + 1}`}
                      onChange={(e) => set(i, f.name, e.target.value)}
                      disabled={saving}
                    />
                  )}
                </div>
              );
            })}
          </li>
        ))}
      </ol>

      <div>
        <Button
          type="button"
          variant="outline"
          disabled={saving || items.length >= field.max}
          onClick={() => onChange([...items, Object.fromEntries(field.fields.map((f) => [f.name, ""]))])}
        >
          <Plus className="size-4" />
          Tambah {field.itemLabel}
        </Button>
        {items.length >= field.max ? (
          <span className="text-muted-foreground ml-3 text-xs">Sudah mencapai batas {field.max}.</span>
        ) : null}
      </div>
    </div>
  );
});
