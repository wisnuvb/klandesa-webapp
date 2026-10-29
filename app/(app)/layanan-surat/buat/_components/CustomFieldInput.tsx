"use client";

import { ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CustomField } from "@/lib/letters/document/schema";
import { formatAngka } from "@/lib/letters/format";
import { moneyDigits } from "../_utils/composer";

const TOUCH = "pointer-coarse:h-11";

/** Pembungkus label + bantuan + penanda "Data sensitif" (ikon + teks, bukan hanya warna). */
export function FieldShell({
  id,
  label,
  required,
  sensitive,
  help,
  children,
  asGroup,
}: {
  id: string;
  label: string;
  required?: boolean;
  sensitive?: boolean;
  help?: string;
  children: React.ReactNode;
  /** true untuk kontrol berisi banyak elemen (radio): label jadi teks penamaan grup. */
  asGroup?: boolean;
}) {
  const helpId = help ? `${id}-help` : undefined;
  const labelContent = (
    <>
      {label}
      {required ? (
        <>
          <span aria-hidden="true" className="text-destructive"> *</span>
          <span className="sr-only"> (wajib diisi)</span>
        </>
      ) : null}
    </>
  );
  return (
    <div data-lc-field="" className="space-y-1.5 rounded-md transition-shadow motion-reduce:transition-none data-[lc-flash=1]:ring-2 data-[lc-flash=1]:ring-ring data-[lc-flash=1]:ring-offset-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {asGroup ? (
          <span id={`${id}-label`} className="text-sm font-medium leading-none">{labelContent}</span>
        ) : (
          <Label htmlFor={id}>{labelContent}</Label>
        )}
        {sensitive ? (
          <span className="inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs text-muted-foreground">
            <ShieldAlert className="h-3 w-3" aria-hidden="true" />
            Data sensitif
          </span>
        ) : null}
      </div>
      {children}
      {help ? <p id={helpId} className="text-xs text-muted-foreground">{help}</p> : null}
    </div>
  );
}

/** Satu isian sesuai jenisnya (teks, uraian, angka, rupiah, tanggal, pilihan). */
export function CustomFieldInput({
  id,
  field,
  value,
  onChange,
}: {
  id: string;
  field: Pick<CustomField, "label" | "type" | "required" | "placeholder" | "help" | "options" | "sensitive">;
  value: string;
  onChange: (value: string) => void;
}) {
  const describedBy = field.help ? `${id}-help` : undefined;
  const shell = (children: React.ReactNode, asGroup = false) => (
    <FieldShell id={id} label={field.label} required={field.required} sensitive={field.sensitive} help={field.help} asGroup={asGroup}>
      {children}
    </FieldShell>
  );

  switch (field.type) {
    case "longtext":
      return shell(
        <Textarea id={id} rows={3} value={value} placeholder={field.placeholder} aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)} />,
      );
    case "number":
      return shell(
        <Input id={id} className={TOUCH} inputMode="decimal" value={value} placeholder={field.placeholder} aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)} />,
      );
    case "money": {
      const digits = moneyDigits(value);
      return shell(
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-sm text-muted-foreground">Rp</span>
          <Input id={id} className={TOUCH} inputMode="numeric" autoComplete="off" aria-describedby={describedBy}
            value={digits ? formatAngka(Number(digits)) : ""} placeholder={field.placeholder ?? "0"}
            onChange={(e) => onChange(moneyDigits(e.target.value))} />
        </div>,
      );
    }
    case "date":
      return shell(
        <Input id={id} type="date" className={TOUCH} value={value} aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)} />,
      );
    case "choice": {
      const options = field.options ?? [];
      if (options.length <= 3) {
        return shell(
          <RadioGroup id={id} value={value} onValueChange={onChange} aria-labelledby={`${id}-label`} aria-describedby={describedBy} className="gap-1">
            {options.map((o, i) => (
              <div key={o} className="flex min-h-11 items-center gap-2 pointer-coarse:min-h-11 sm:min-h-8">
                <RadioGroupItem id={`${id}-opt${i}`} value={o} />
                <Label htmlFor={`${id}-opt${i}`} className="cursor-pointer font-normal">{o}</Label>
              </div>
            ))}
          </RadioGroup>,
          true,
        );
      }
      return shell(
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger id={id} className={TOUCH} aria-describedby={describedBy}>
            <SelectValue placeholder={field.placeholder ?? "Pilih…"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>,
      );
    }
    default:
      return shell(
        <Input id={id} className={TOUCH} value={value} placeholder={field.placeholder} aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)} />,
      );
  }
}
