"use client";

import { useState } from "react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { cn } from "@/components/ui/utils";
import { GOLONGAN_MAX_LENGTH, GOLONGAN_OPTIONS, isKnownGolongan } from "@/lib/letters/golongan";

const OTHER = "__lainnya__";

const OPTIONS: ComboboxOption[] = [
  ...GOLONGAN_OPTIONS.map((o) => ({ value: o.value, label: o.label, keywords: o.keywords })),
  { value: OTHER, label: "Lainnya (tulis sendiri)", keywords: "custom manual ketik" },
];

/** Gaya tombol agar sama dengan kolom isian di sekitarnya (bawaan Combobox bergaya formulir publik). */
const BUTTON = {
  form: "h-9 rounded-md border-input bg-input-background px-3 py-1 text-sm shadow-sm focus:border-ring focus:ring-[3px] focus:ring-ring/50 pointer-coarse:h-11",
  panel:
    "min-h-11 rounded-md border-input bg-input-background px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-ring",
} as const;

/**
 * Pemilih pangkat/golongan: pilih dari daftar baku (PNS I/a–IV/e dan PPPK I–XVII, bisa dicari) atau tulis sendiri.
 * Nilai kosong berarti "tidak diisi". `onChange` menerima teks akhir yang disimpan.
 */
export function GolonganSelect({
  id,
  value,
  onChange,
  onBlur,
  placeholder = "Pilih pangkat/golongan",
  clearLabel = "Tanpa pangkat/golongan",
  variant = "form",
  disabled,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
  /** Teks di tombol saat kosong (mis. nilai bawaan dari Pengaturan Desa). */
  placeholder?: string;
  clearLabel?: string;
  variant?: keyof typeof BUTTON;
  disabled?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const [customMode, setCustomMode] = useState(false);
  const custom = customMode || (value !== "" && !isKnownGolongan(value));
  return (
    <div className="space-y-2">
      <Combobox
        id={id}
        value={custom ? OTHER : value}
        onValueChange={(next) => {
          if (next === OTHER) {
            setCustomMode(true);
            if (isKnownGolongan(value)) onChange("");
          } else {
            setCustomMode(false);
            onChange(next);
          }
        }}
        options={OPTIONS}
        placeholder={placeholder}
        searchPlaceholder="Cari, mis. III/d atau Penata…"
        allowClear
        clearLabel={clearLabel}
        disabled={disabled}
        buttonClassName={cn(BUTTON[variant])}
        aria-describedby={describedBy}
        aria-invalid={invalid}
      />
      {custom ? (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          maxLength={GOLONGAN_MAX_LENGTH}
          placeholder="Tulis pangkat/golongan"
          aria-label="Pangkat/golongan (tulis sendiri)"
          autoFocus={customMode && value === ""}
          disabled={disabled}
          className={variant === "panel" ? "min-h-11" : "pointer-coarse:h-11"}
        />
      ) : null}
    </div>
  );
}
