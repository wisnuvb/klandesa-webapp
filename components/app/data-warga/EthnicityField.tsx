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

/**
 * Pemilih suku tanpa react-hook-form: pilih dari daftar baku (bisa dicari); suku di luar daftar diketik sendiri
 * supaya ejaan tetap terkendali. Dipakai form Ubah Warga (lewat EthnicityField) dan wizard Tambah Keluarga.
 */
export function EthnicitySelect({ value, onChange, onBlur, id }: { value: string; onChange: (v: string) => void; onBlur?: () => void; id?: string }) {
  const [customMode, setCustomMode] = useState(false);
  const custom = customMode || (value !== "" && !isKnownEthnicity(value));
  return (
    <>
      <Combobox
        id={id}
        value={custom ? OTHER : value}
        onValueChange={(next) => {
          if (next === OTHER) {
            setCustomMode(true);
            if (isKnownEthnicity(value)) onChange("");
          } else {
            setCustomMode(false);
            onChange(next);
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
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          maxLength={ETHNICITY_MAX_LENGTH}
          placeholder="Tulis nama suku"
          aria-label="Nama suku"
          autoFocus={customMode && value === ""}
        />
      ) : null}
    </>
  );
}

interface Props<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
}

export function EthnicityField<T extends FieldValues>({ name, control, label = "Suku" }: Props<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormFieldWrapper label={label} error={fieldState.error?.message}>
          <EthnicitySelect value={typeof field.value === "string" ? field.value : ""} onChange={field.onChange} onBlur={field.onBlur} />
        </FormFieldWrapper>
      )}
    />
  );
}
