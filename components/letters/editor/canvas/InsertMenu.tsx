"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  BookOpen, Columns2, FilePlus, FileText, Gavel, GitBranch, Heading, Image as ImageIcon, List, ListChecks,
  ListOrdered, Mail, Minus, MoveVertical, PenLine, Plus, QrCode, Scale, Signature, Stamp, Table, Type,
  UserRound, Users, Shapes, type LucideIcon,
} from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BLOCK_PRESETS } from "@/lib/letters/editor";
import type { BlockPreset, PresetId } from "@/lib/letters/editor";
import { groupPresets } from "./helpers";

const ICONS: Readonly<Record<string, LucideIcon>> = {
  BookOpen, Columns2, FilePlus, FileText, Gavel, GitBranch, Heading, Image: ImageIcon, List, ListChecks,
  ListOrdered, Mail, Minus, MoveVertical, PenLine, QrCode, Scale, Signature, Stamp, Table, Type, UserRound, Users,
};

export function PresetIcon({ name, className }: { name: string; className?: string }) {
  const Icon = Object.prototype.hasOwnProperty.call(ICONS, name) ? ICONS[name] : Shapes;
  return <Icon className={className ?? "h-4 w-4"} aria-hidden />;
}

export type InsertMenuProps = {
  onPick: (preset: PresetId) => void;
  onCancel?: () => void;
  presets?: readonly BlockPreset[];
};

/** Menu "Tambah bagian": pencarian + daftar bergrup (combobox ARIA, panah/Enter/Esc). */
export function InsertMenu({ onPick, onCancel, presets = BLOCK_PRESETS }: InsertMenuProps) {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => groupPresets(presets, query), [presets, query]);
  return (
    <Command
      shouldFilter={false}
      label="Tambah bagian"
      className="bg-transparent"
      onKeyDown={(e) => {
        if (e.key === "Escape" && onCancel) {
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <CommandInput value={query} onValueChange={setQuery} placeholder="Cari bagian, mis. tanda tangan, tabel…" />
      <CommandList className="max-h-80">
        <CommandEmpty>Tidak ada bagian “{query.trim()}”.</CommandEmpty>
        {groups.map((g) => (
          <CommandGroup key={g.category} heading={g.title}>
            {g.presets.map((p) => (
              <CommandItem key={p.id} value={p.id} onSelect={() => onPick(p.id)} className="min-h-11 items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-muted/50">
                  <PresetIcon name={p.icon} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">{p.label}</span>
                  <span className="text-xs text-muted-foreground">{p.description}</span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  );
}

type ButtonProps = {
  onPick: (preset: PresetId) => void;
  /** Teks tombol; tanpa `children` tombol hanya berisi ikon + dan memakai `label` sebagai nama aksesibel. */
  label: string;
  children?: ReactNode;
  className?: string;
};

/** Tombol + yang membuka InsertMenu dalam popover. */
export function InsertMenuButton({ onPick, label, children, className }: ButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={children ? undefined : label}
          title={label}
          className={
            className ??
            "inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border bg-background px-3 text-sm font-medium text-foreground shadow-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          }
        >
          <Plus className="h-4 w-4" aria-hidden />
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-[22rem] max-w-[calc(100vw-1.5rem)] p-0">
        <InsertMenu
          onCancel={() => setOpen(false)}
          onPick={(id) => {
            setOpen(false);
            onPick(id);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
