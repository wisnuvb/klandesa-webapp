"use client";

import * as React from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./select";
import { cn } from "./utils";
import { parseNativeOptions } from "./select-utils";

/** Batas jumlah opsi untuk mengukur opsi terpanjang (lebih banyak: lebar mengikuti pilihan saat ini). */
const MAX_SIZER_OPTIONS = 80;

/** Ada kelas lebar eksplisit? (`min-w-*`/`max-w-*` bukan lebar.) */
const HAS_WIDTH_CLASS = /(^|[\s:])(w-|flex-1\b|basis-|grow\b)/;

/** Bentuk event yang diberikan ke `onChange`: cukup untuk `e.target.value`. */
export type SearchSelectChangeEvent = {
  target: { value: string; name: string; id: string };
  currentTarget: { value: string; name: string; id: string };
};

export type SearchSelectProps = React.AriaAttributes & {
  id?: string;
  name?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  title?: string;
  tabIndex?: number;
  autoFocus?: boolean;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (event: SearchSelectChangeEvent) => void;
  /** Isi `<option>` dan `<optgroup>`, persis seperti `<select>` biasa. */
  children?: React.ReactNode;
  /** Teks saat belum ada pilihan dan tidak ada `<option value="">`. */
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
};

/**
 * Pengganti `<select>` native yang bisa dicari. Cukup ganti nama tag: `value`,
 * `onChange`, `className`, `disabled`, `id`, `name`, `required`, dan atribut aria
 * dipakai sama seperti sebelumnya, begitu pula `<option>`/`<optgroup>` di dalamnya.
 */
export function SearchSelect({
  value,
  defaultValue,
  onChange,
  children,
  placeholder,
  searchPlaceholder,
  emptyText,
  className,
  id,
  name,
  disabled,
  required,
  ...triggerProps
}: SearchSelectProps) {
  const entries = React.useMemo(() => parseNativeOptions(children), [children]);

  const firstValue = React.useMemo(() => {
    for (const e of entries) {
      if (e.kind === "option") return e.value;
      if (e.options.length) return e.options[0].value;
    }
    return "";
  }, [entries]);

  // Seperti <select> native tanpa value: opsi pertama dianggap terpilih.
  const [inner, setInner] = React.useState(
    defaultValue !== undefined ? String(defaultValue) : firstValue,
  );
  const current = value !== undefined ? String(value) : inner;

  // Label dicari dari props, bukan dari daftar yang terbuka, agar ikut tampil di HTML server.
  const currentLabel = React.useMemo(() => {
    for (const e of entries) {
      const found = e.kind === "option" ? (e.value === current ? e : undefined) : e.options.find((o) => o.value === current);
      if (found) return found.label;
    }
    return undefined;
  }, [entries, current]);

  // <select> native selebar opsi terpanjangnya. Tanpa kelas lebar, tiru itu dengan teks
  // tak terlihat yang ditumpuk di sel grid yang sama, agar lebar tidak berubah saat memilih.
  const autoWidth = !HAS_WIDTH_CLASS.test(className ?? "");
  const sizerTexts = React.useMemo(() => {
    if (!autoWidth) return [];
    const texts = entries.flatMap((e) => (e.kind === "option" ? [e.text] : e.options.map((o) => o.text)));
    return texts.length <= MAX_SIZER_OPTIONS ? [...new Set(texts)] : [];
  }, [autoWidth, entries]);

  // Opsi `<option value="">Semua …</option>` adalah pilihan nyata: tampil normal, bukan placeholder.
  const hasEmptyOption = entries.some((e) =>
    e.kind === "option" ? e.value === "" : e.options.some((o) => o.value === ""),
  );

  const handleChange = (next: string) => {
    if (value === undefined) setInner(next);
    const target = { value: next, name: name ?? "", id: id ?? "" };
    onChange?.({ target, currentTarget: target });
  };

  const renderOption = (o: { value: string; label: React.ReactNode; text: string; disabled: boolean }, key: string) => (
    <SelectItem key={key} value={o.value} textValue={o.text} disabled={o.disabled}>
      {o.label}
    </SelectItem>
  );

  return (
    <Select
      value={current}
      onValueChange={handleChange}
      disabled={disabled}
      name={name}
      required={required}
    >
      <SelectTrigger
        id={id}
        size="auto"
        muteWhenEmpty={!hasEmptyOption}
        // Seperti <select> native: `border` saja memakai warna border tema, bukan `border-input` (transparan).
        className={cn("border-border", autoWidth && "w-auto", className)}
        {...triggerProps}
      >
        {autoWidth ? (
          <span className="grid min-w-0 flex-1">
            <SelectValue placeholder={placeholder} className="col-start-1 row-start-1 truncate text-left">
              {currentLabel}
            </SelectValue>
            {sizerTexts.map((text) => (
              <span key={text} aria-hidden="true" className="invisible col-start-1 row-start-1 h-0 overflow-hidden whitespace-nowrap">
                {text}
              </span>
            ))}
          </span>
        ) : (
          <SelectValue placeholder={placeholder}>{currentLabel}</SelectValue>
        )}
      </SelectTrigger>
      <SelectContent searchPlaceholder={searchPlaceholder} emptyText={emptyText}>
        {entries.map((e, i) =>
          e.kind === "option" ? (
            renderOption(e, `o:${i}:${e.value}`)
          ) : (
            <SelectGroup key={`g:${i}:${e.label}`}>
              <SelectLabel>{e.label}</SelectLabel>
              {e.options.map((o, j) => renderOption(o, `o:${i}:${j}:${o.value}`))}
            </SelectGroup>
          ),
        )}
      </SelectContent>
    </Select>
  );
}
