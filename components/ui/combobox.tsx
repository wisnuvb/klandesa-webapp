"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "./utils";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";

export type ComboboxOption = {
  value: string;
  label: string;
  keywords?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
};

type Props = {
  value: string;
  onValueChange: (next: string) => void;
  options: ComboboxOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowClear?: boolean;
  clearLabel?: string;
  disabled?: boolean;
  buttonClassName?: string;
  /** Override popover panel styles; default z-index is above app modals (z-100). */
  contentClassName?: string;
};

export function Combobox(props: Props) {
  const {
    value,
    onValueChange,
    options,
    placeholder,
    searchPlaceholder = "Cari...",
    emptyText = "Tidak ditemukan.",
    allowClear,
    clearLabel = "Kosongkan pilihan",
    disabled,
    buttonClassName,
    contentClassName,
  } = props;

  const [open, setOpen] = React.useState(false);

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? "";
  const selectedOption = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400 flex items-center justify-between gap-3 cursor-pointer disabled:cursor-not-allowed",
            buttonClassName,
          )}
        >
          <span
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2",
              !value && "text-gray-500",
            )}
          >
            {selectedOption?.icon}
            <span className="truncate">
              {value ? selectedLabel : placeholder}
            </span>
          </span>
          <ChevronsUpDown className="w-4 h-4 text-gray-500 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          "z-110 w-[--radix-popover-trigger-width] p-0",
          contentClassName,
        )}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {allowClear ? (
                <CommandItem
                  value={clearLabel}
                  disabled={!value}
                  onSelect={() => {
                    onValueChange("");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {clearLabel}
                </CommandItem>
              ) : null}
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={`${o.label} ${o.value} ${o.keywords ?? ""}`}
                  disabled={o.disabled}
                  onSelect={() => {
                    onValueChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === o.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {o.icon ? (
                    <span className="mr-2 shrink-0">{o.icon}</span>
                  ) : null}
                  <span className="truncate">{o.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
