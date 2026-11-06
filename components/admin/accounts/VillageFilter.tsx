"use client";

import { useEffect, useState } from "react";
import { Building2, Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiJson, type VillageRef } from "./shared";

type Props = {
  id?: string;
  value: VillageRef | null;
  onChange: (v: VillageRef | null) => void;
};

/** Filter desa: cari nama/kode desa (maks. 12 hasil dari /api/admin/villages), pilih satu atau kosongkan. */
export function VillageFilter({ id, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<VillageRef[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const d = await apiJson<{ villages: VillageRef[] }>(`/api/admin/villages?limit=12&query=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        setItems(d.villages ?? []);
      } catch (e) {
        if ((e as { name?: string })?.name !== "AbortError") setItems([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [q, open]);

  return (
    <div className="flex gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" role="combobox" aria-expanded={open} className="min-h-10 min-w-0 flex-1 justify-between font-normal">
            <span className="flex min-w-0 items-center gap-2">
              <Building2 aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{value ? `${value.name} (${value.code})` : "Semua desa"}</span>
            </span>
            <ChevronsUpDown aria-hidden="true" className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(22rem,calc(100vw-2rem))] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Cari nama atau kode desa…" value={q} onValueChange={setQ} />
            <CommandList>
              {loading ? <p className="px-3 py-2 text-sm text-muted-foreground" role="status">Memuat…</p> : null}
              <CommandEmpty>Desa tidak ditemukan.</CommandEmpty>
              <CommandGroup>
                {items.map((v) => (
                  <CommandItem
                    key={v.id}
                    value={String(v.id)}
                    onSelect={() => {
                      onChange({ id: v.id, code: v.code, name: v.name });
                      setOpen(false);
                    }}
                  >
                    <Check aria-hidden="true" className={value?.id === v.id ? "h-4 w-4 opacity-100" : "h-4 w-4 opacity-0"} />
                    <span className="min-w-0 truncate">{v.name}</span>
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">{v.code}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value ? (
        <Button type="button" variant="ghost" size="icon" className="min-h-10 min-w-10" aria-label="Hapus filter desa" onClick={() => onChange(null)}>
          <X aria-hidden="true" className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
