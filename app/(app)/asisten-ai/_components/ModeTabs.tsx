"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MODES } from "./types";

type ModeTabsProps = {
  value: string;
  onChange: (mode: string) => void;
  /** Mode dikunci mengikuti percakapan yang dibuka. */
  locked: boolean;
};

/** Pemilih mode berupa tombol bersegmen: satu klik, semua pilihan terlihat (bukan dropdown). */
export function ModeTabs({ value, onChange, locked }: ModeTabsProps) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={value}
      onValueChange={(v) => v && onChange(v)}
      disabled={locked}
      aria-label="Mode percakapan"
      className="max-w-full flex-nowrap overflow-x-auto"
    >
      {MODES.map((m) => (
        <ToggleGroupItem
          key={m.id}
          value={m.id}
          className="shrink-0 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground disabled:opacity-100 data-[state=off]:disabled:opacity-50 sm:text-sm"
        >
          {m.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
