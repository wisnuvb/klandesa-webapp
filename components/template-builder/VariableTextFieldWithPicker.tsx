"use client";

import { useRef, useState, useCallback } from "react";
import { Variable } from "lucide-react";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { SmartVariableInput } from "./SmartVariableInput";
import { VariablePickerContent } from "./VariablePickerContent";

export interface VariableTextFieldWithPickerProps {
  /** Unik per field (mis. footer-signer-0-name) */
  fieldId: string;
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}

/**
 * Input teks dengan variabel {KEY}, trigger @ untuk picker, dan tombol ikon variabel
 * (sama seperti pola di ContentBlockEditor untuk sel tabel).
 */
export function VariableTextFieldWithPicker({
  fieldId,
  label,
  value,
  onChange,
  placeholder,
  hint,
}: VariableTextFieldWithPickerProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const insertVariable = useCallback(
    (key: string) => {
      const el = inputRef.current;
      const current = value ?? "";
      if (el && "selectionStart" in el) {
        let pos =
          el.selectionStart !== null ? el.selectionStart : current.length;
        let before = current.substring(0, pos);
        const after = current.substring(pos);
        if (before.endsWith("@")) {
          before = before.slice(0, -1);
          pos -= 1;
        }
        const insert = `{${key}}`;
        const newVal = before + insert + after;
        onChange(newVal);
        setPopoverOpen(false);
        const newPos = before.length + insert.length;
        requestAnimationFrame(() => {
          el.focus();
          el.setSelectionRange(newPos, newPos);
        });
      } else {
        onChange(current + `{${key}}`);
        setPopoverOpen(false);
      }
    },
    [onChange, value],
  );

  const handleValueChange = (v: string) => {
    onChange(v);
    if (v.endsWith("@")) {
      setPopoverOpen(true);
    }
  };

  return (
    <div className="space-y-2">
      <Label id={`${fieldId}-label`}>{label}</Label>
      <div className="flex gap-2 items-start">
        <div className="flex-1 min-w-0">
          <SmartVariableInput
            value={value}
            onChange={handleValueChange}
            placeholder={placeholder}
            inputRef={(el) => {
              inputRef.current = el;
            }}
          />
        </div>
        <Popover
          open={popoverOpen}
          onOpenChange={setPopoverOpen}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 mt-0.5"
              aria-label="Sisipkan variabel"
              title="Sisipkan variabel"
            >
              <Variable className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-125 p-0" align="end">
            <VariablePickerContent onSelect={insertVariable} />
          </PopoverContent>
        </Popover>
      </div>
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Ketik <kbd className="px-1 rounded bg-muted text-[10px]">@</kbd> atau
          klik ikon untuk menyisipkan variabel. Data diisi saat cetak dari
          form / pengaturan desa.
        </p>
      )}
    </div>
  );
}
