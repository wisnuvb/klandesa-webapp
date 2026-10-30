"use client";

import { memo, useId } from "react";
import {
  BLOCK_VARIANTS,
  defaultBlockVariant,
  hasBlockVariants,
  type BlockVariantMeta,
} from "@/lib/website-engine/block-variants";

type Props = {
  kind: string;
  label: string;
  /** Nilai varian yang diizinkan pack (sudah disaring server) */
  options: Array<{ value: string; label: string }>;
  value: string | undefined;
  disabled: boolean;
  onChange: (value: string) => void;
};

/** Sketsa tata letak 60x40: kotak gelap = judul/angka, kotak terang = badan/bingkai. */
function Wireframe({ meta }: { meta: BlockVariantMeta<string> }) {
  return (
    <svg viewBox="0 0 60 40" className="h-14 w-full text-slate-700" aria-hidden focusable="false">
      {meta.wire.map(([x, y, w, h, dark], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={w}
          height={h}
          rx={0.8}
          fill={dark ? "currentColor" : "#ffffff"}
          fillOpacity={dark ? 0.8 : 1}
          stroke="currentColor"
          strokeOpacity={dark ? 0 : 0.35}
          strokeWidth={0.5}
        />
      ))}
    </svg>
  );
}

export const VariantPicker = memo(function VariantPicker({
  kind,
  label,
  options,
  value,
  disabled,
  onChange,
}: Props) {
  const groupId = useId();
  if (!hasBlockVariants(kind) || options.length < 2) return null;
  const metas = BLOCK_VARIANTS[kind] as readonly BlockVariantMeta<string>[];
  const current = value && options.some((o) => o.value === value) ? value : defaultBlockVariant(kind);

  return (
    <div className="grid gap-2 md:col-span-2" role="radiogroup" aria-labelledby={groupId}>
      <div id={groupId} className="text-xs text-muted-foreground">
        {label}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((o) => {
          const meta = metas.find((m) => m.value === o.value);
          if (!meta) return null;
          const selected = current === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(o.value)}
              className={`grid gap-1.5 rounded-lg border p-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${
                selected ? "border-teal-600 bg-teal-50 ring-1 ring-teal-600" : "hover:bg-muted"
              }`}
            >
              <Wireframe meta={meta} />
              <span className="text-sm font-medium leading-tight">{meta.label}</span>
              <span className="text-xs leading-snug text-muted-foreground">{meta.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
