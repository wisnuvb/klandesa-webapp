"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { FieldError, fieldA11y } from "@/components/app/FormErrorSummary";

export const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-input-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";
export const INPUT_CLASS = "h-11";

export function Field({ id, label, required, error, hint, children }: { id: string; label: string; required?: boolean; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true" className="text-destructive"> *</span> : null}
        {required ? <span className="sr-only"> (wajib)</span> : null}
      </Label>
      {children}
      {hint && !error ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      <FieldError id={id} message={error} />
    </div>
  );
}

export function TextField({ id, label, value, onChange, error, required, hint, maxLength, inputMode, placeholder, type = "text", className }: {
  id: string; label: string; value: string; onChange: (v: string) => void; error?: string; required?: boolean; hint?: string;
  maxLength?: number; inputMode?: "numeric" | "text" | "tel"; placeholder?: string; type?: string; className?: string;
}) {
  return (
    <Field id={id} label={label} required={required} error={error} hint={hint}>
      <Input {...fieldA11y(id, error)} className={`${INPUT_CLASS} ${className ?? ""}`} type={type} value={value} maxLength={maxLength} inputMode={inputMode} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} autoComplete="off" />
    </Field>
  );
}

export function SelectField({ id, label, value, onChange, options, error, required, placeholder = "Pilih", hint }: {
  id: string; label: string; value: string; onChange: (v: string) => void; options: ReadonlyArray<readonly [string, string]>; error?: string; required?: boolean; placeholder?: string; hint?: string;
}) {
  return (
    <Field id={id} label={label} required={required} error={error} hint={hint}>
      <SearchSelect {...fieldA11y(id, error)} className={SELECT_CLASS} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}>
        <option value="">{placeholder}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </SearchSelect>
    </Field>
  );
}

export const entries = (rec: Record<string, string>): Array<readonly [string, string]> => Object.entries(rec).map(([k, v]) => [k, v] as const);
