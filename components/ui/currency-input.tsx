"use client";

import * as React from "react";

import {
  caretAfterDigits,
  countDigitsBefore,
  formatDigits,
  toDigits,
} from "@/lib/currency-input";
import { Input, type InputProps } from "./input";
import { cn } from "./utils";

export type CurrencyInputProps = Omit<
  InputProps,
  "value" | "defaultValue" | "onChange" | "type" | "inputMode" | "prefix"
> & {
  /** Nilai mentah (hanya digit), mis. "89000000". Angka juga diterima. */
  value: string | number | null | undefined;
  /** Dipanggil dengan nilai mentah tanpa pemisah ribuan ("" bila kosong). */
  onValueChange: (digits: string) => void;
  /** Penanda mata uang di dalam field; `null` untuk menyembunyikannya. */
  prefix?: string | null;
  /** Kelas untuk elemen <input>; `className` dipakai pada pembungkus. */
  inputClassName?: string;
};

/**
 * Input nominal rupiah: tampil "89.000.000", tetapi state/payload tetap angka mentah
 * ("89000000"). Kursor dijaga saat pemisah ribuan muncul/hilang.
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, prefix = "Rp", className, inputClassName, ...props }, forwardedRef) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);
    const pendingDigitsBeforeCaret = React.useRef<number | null>(null);
    const [, rerender] = React.useReducer((n: number) => n + 1, 0);

    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );

    const display = formatDigits(toDigits(value == null ? "" : String(value)));

    React.useLayoutEffect(() => {
      const digitCount = pendingDigitsBeforeCaret.current;
      const el = innerRef.current;
      if (digitCount === null || !el) return;
      pendingDigitsBeforeCaret.current = null;
      if (document.activeElement !== el) return;
      const pos = caretAfterDigits(display, digitCount);
      el.setSelectionRange(pos, pos);
    });

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const el = event.target;
      const caret = el.selectionStart ?? el.value.length;
      const digits = toDigits(el.value);
      pendingDigitsBeforeCaret.current = Math.min(
        countDigitsBefore(el.value, caret),
        digits.length,
      );
      onValueChange(digits);
      // Bila nilai akhir sama dengan sebelumnya React tidak merender ulang; paksa agar kursor dipulihkan.
      rerender();
    };

    return (
      <div className={cn("relative", className)}>
        {prefix ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
          >
            {prefix}
          </span>
        ) : null}
        <Input
          {...props}
          ref={setRefs}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={display}
          onChange={handleChange}
          className={cn("tabular-nums", prefix ? "pl-10" : undefined, inputClassName)}
        />
      </div>
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
