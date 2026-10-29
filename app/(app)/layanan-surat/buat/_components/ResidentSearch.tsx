"use client";

import { useEffect, useRef } from "react";
import { AutocompleteResidentInput, type ResidentOption } from "@/components/AutocompleteResidentInput";
import { Label } from "@/components/ui/label";

/**
 * Pencarian warga berlabel. `AutocompleteResidentInput` tidak menerima `id`, jadi id dan
 * atribut aksesibilitas dipasang pada <input> di dalamnya agar label & fokus-dari-kertas bekerja.
 */
export function ResidentSearch({
  id,
  label,
  value,
  onChange,
  onSelect,
  onClear,
  required,
  help,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSelect: (r: ResidentOption) => void;
  onClear: () => void;
  required?: boolean;
  help?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const input = host.current?.querySelector("input");
    if (!input) return;
    input.id = id;
    if (required) input.setAttribute("aria-required", "true");
    if (help) input.setAttribute("aria-describedby", `${id}-help`);
  }, [id, required, help]);

  return (
    <div data-lc-field="" className="space-y-1.5 rounded-md transition-shadow motion-reduce:transition-none data-[lc-flash=1]:ring-2 data-[lc-flash=1]:ring-ring data-[lc-flash=1]:ring-offset-2">
      <Label htmlFor={id}>
        {label}
        {required ? (
          <>
            <span aria-hidden="true" className="text-destructive"> *</span>
            <span className="sr-only"> (wajib diisi)</span>
          </>
        ) : null}
      </Label>
      <div ref={host}>
        <AutocompleteResidentInput
          value={value}
          onChange={onChange}
          onResidentSelect={(r) => (r ? onSelect(r) : onClear())}
          placeholder="Ketik nama atau NIK warga…"
          className="pointer-coarse:h-11"
        />
      </div>
      {help ? <p id={`${id}-help`} className="text-xs text-muted-foreground">{help}</p> : null}
    </div>
  );
}
