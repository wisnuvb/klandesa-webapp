"use client";

import { useState } from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { FormFieldWrapper } from "@/components/ui/form-fields";
import { ETHNICITIES, ETHNICITY_MAX_LENGTH, isKnownEthnicity } from "@/lib/residents/ethnicity";

const OTHER = "__lainnya__";

const OPTIONS: ComboboxOption[] = [
  ...ETHNICITIES.map((e) => ({ value: e, label: e })),
  { value: OTHER, label: "Lainnya (ketik sendiri)" },
];

interface Props<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
}

/** Suku: pilih dari daftar baku (bisa dicari); suku di luar daftar diketik sendiri supaya ejaan tetap terkendali. */
export function EthnicityField<T extends FieldValues>({ name, control, label = "Suku" }: Props<T>) {
  const [customMode, setCustomMode] = useState(false);
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const value = typeof field.value === "string" ? field.value : "";
        const custom = customMode || (value !== "" && !isKnownEthnicity(value));
        return (
          <FormFieldWrapper label={label} error={fieldState.error?.message}>
            <Combobox
              value={custom ? OTHER : value}
              onValueChange={(next) => {
                if (next === OTHER) {
                  setCustomMode(true);
                  if (isKnownEthnicity(value)) field.onChange("");
                } else {
                  setCustomMode(false);
                  field.onChange(next);
                }
              }}
              options={OPTIONS}
              placeholder="Pilih suku"
              searchPlaceholder="Cari suku..."
              allowClear
            />
            {custom ? (
              <Input
                value={value}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                maxLength={ETHNICITY_MAX_LENGTH}
                placeholder="Tulis nama suku"
                aria-label="Nama suku"
                autoFocus={customMode && value === ""}
              />
            ) : null}
          </FormFieldWrapper>
        );
      }}
    />
  );
}
