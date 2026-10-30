"use client";

import { memo } from "react";
import type { FormSpec } from "@/lib/letters/document/form-spec";
import { CustomFieldInput } from "./CustomFieldInput";

type FieldSpec = FormSpec["fields"][number];

/** Isian surat (di luar data orang & daftar). Dirender ulang hanya saat nilai isiannya berubah. */
export const FieldsSection = memo(function FieldsSection({
  fields: specs,
  values,
  onChange,
}: {
  fields: ReadonlyArray<FieldSpec>;
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
}) {
  if (specs.length === 0) return null;
  return (
    <fieldset className="space-y-4 rounded-lg border p-4">
      <legend className="px-1 text-sm font-semibold">Isian surat</legend>
      {specs.map((f) => (
        <CustomFieldInput key={f.id} id={`field-${f.id}`} field={f} value={values[f.id] ?? ""} onChange={(v) => onChange(f.id, v)} />
      ))}
    </fieldset>
  );
});
