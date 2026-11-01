"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

import { cn } from "./utils";
import { matchScore, nodeText } from "./select-utils";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "./command";

/**
 * Select yang selalu bisa dicari. API-nya sama dengan Select shadcn/Radix
 * (Select, SelectTrigger, SelectValue, SelectContent, SelectItem, ...), tetapi
 * daftarnya berupa Popover + Command: ada kolom cari, navigasi panah, dan Enter.
 *
 * Item hanya dipasang saat daftar terbuka. Supaya `SelectValue` tetap tahu label
 * nilai terpilih saat tertutup, item dirender sekali ke wadah DOM lepas
 * ("pengumpul") yang hanya mendaftarkan label, tanpa menggambar apa pun.
 */

type RegistryEntry = {
  node: React.ReactNode;
  text: string;
  count: number;
  ready: boolean;
};

type SelectContextValue = {
  value: string;
  select: (value: string) => void;
  open: boolean;
  disabled: boolean;
  entries: Map<string, RegistryEntry>;
  retain: (value: string) => void;
  release: (value: string) => void;
  register: (value: string, node: React.ReactNode, text: string) => void;
  listId: string;
  setTriggerNode: (node: HTMLButtonElement | null) => void;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);
/** Benar saat item dirender ke pengumpul: daftarkan label saja, jangan gambar. */
const CollectingContext = React.createContext(false);

function useSelectContext(component: string): SelectContextValue {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error(`<${component}> harus berada di dalam <Select>.`);
  return ctx;
}

type SelectProps = {
  value?: string;
  defaultValue?: string;
  // Sintaks method (bivarian) seperti Radix, agar pemanggil bertipe sempit seperti
  // `(v: "M" | "F") => void` tetap diterima.
  onValueChange?(value: string): void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?(open: boolean): void;
  disabled?: boolean;
  /** Bila diisi, nilai ikut terkirim pada `<form>` lewat input tersembunyi. */
  name?: string;
  /** Dengan `required`, form native menolak submit selama belum ada pilihan. */
  required?: boolean;
  children?: React.ReactNode;
};

function Select({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disabled,
  name,
  required,
  children,
}: SelectProps & { id?: string }) {
  const [innerValue, setInnerValue] = React.useState(defaultValue);
  const value = valueProp !== undefined ? valueProp : innerValue;

  const [innerOpen, setInnerOpen] = React.useState(defaultOpen);
  const open = openProp !== undefined ? openProp : innerOpen;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setInnerOpen(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );

  const entriesRef = React.useRef(new Map<string, RegistryEntry>());
  const [version, bump] = React.useReducer((n: number) => n + 1, 0);

  const retain = React.useCallback((v: string) => {
    const cur = entriesRef.current.get(v);
    if (cur) cur.count += 1;
    else entriesRef.current.set(v, { node: null, text: "", count: 1, ready: false });
  }, []);

  const release = React.useCallback((v: string) => {
    const cur = entriesRef.current.get(v);
    if (!cur) return;
    cur.count -= 1;
    if (cur.count <= 0) {
      entriesRef.current.delete(v);
      bump();
    }
  }, []);

  const register = React.useCallback((v: string, node: React.ReactNode, text: string) => {
    const cur = entriesRef.current.get(v);
    if (!cur) return;
    const changed = !cur.ready || cur.text !== text;
    cur.node = node;
    cur.text = text;
    cur.ready = true;
    if (changed) bump();
  }, []);

  const select = React.useCallback(
    (next: string) => {
      if (valueProp === undefined) setInnerValue(next);
      if (next !== value) onValueChange?.(next);
      setOpen(false);
    },
    [valueProp, value, onValueChange, setOpen],
  );

  const listId = React.useId();
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const setTriggerNode = React.useCallback((node: HTMLButtonElement | null) => {
    triggerRef.current = node;
  }, []);

  const ctx = React.useMemo<SelectContextValue>(
    () => ({
      value,
      select,
      open,
      disabled: Boolean(disabled),
      entries: entriesRef.current,
      retain,
      release,
      register,
      listId,
      setTriggerNode,
    }),
    // `version` memaksa konsumen (SelectValue) menggambar ulang saat label berubah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, select, open, disabled, retain, release, register, listId, setTriggerNode, version],
  );

  return (
    <SelectContext.Provider value={ctx}>
      <Popover open={disabled ? false : open} onOpenChange={setOpen}>
        {children}
      </Popover>
      {required ? (
        // Input teks tersembunyi agar validasi native browser tetap menahan submit.
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          name={name}
          value={value}
          disabled={disabled}
          onChange={() => {}}
          onFocus={() => triggerRef.current?.focus()}
          className="pointer-events-none absolute size-px overflow-hidden opacity-0"
        />
      ) : name ? (
        <input type="hidden" name={name} value={value} disabled={disabled} />
      ) : null}
    </SelectContext.Provider>
  );
}

function SelectGroup({ children }: { children?: React.ReactNode }) {
  const collecting = React.useContext(CollectingContext);
  if (collecting) return <>{children}</>;
  return <CommandGroup data-slot="select-group">{children}</CommandGroup>;
}

type SelectValueProps = {
  placeholder?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

function SelectValue({ placeholder, children, className }: SelectValueProps) {
  const ctx = useSelectContext("SelectValue");
  const entry = ctx.entries.get(ctx.value);
  // Urutan sama dengan Radix: placeholder menang saat belum ada nilai, lalu `children`
  // kustom, lalu label item terdaftar.
  let content: React.ReactNode;
  if (ctx.value === "" && placeholder !== undefined) content = placeholder;
  else if (children !== undefined) content = children;
  else content = entry?.ready ? entry.node : null;

  return (
    <span data-slot="select-value" className={className}>
      {content}
    </span>
  );
}

function SelectTrigger({
  className,
  size = "default",
  muteWhenEmpty = true,
  disabled,
  children,
  onKeyDown,
  ref,
  ...props
}: Omit<React.ComponentProps<"button">, "ref"> & {
  /** "auto": tinggi mengikuti className pemanggil (mis. `h-11`), bukan angka bawaan. */
  size?: "sm" | "default" | "auto";
  /** Tampilkan teks redup saat nilai kosong. Matikan bila nilai kosong adalah opsi nyata (mis. "Semua"). */
  muteWhenEmpty?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}) {
  const ctx = useSelectContext("SelectTrigger");
  const { setTriggerNode } = ctx;

  const setRefs = React.useCallback(
    (node: HTMLButtonElement | null) => {
      setTriggerNode(node);
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
    },
    [setTriggerNode, ref],
  );

  return (
    <PopoverTrigger asChild>
      <button
        type="button"
        ref={setRefs}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={ctx.open}
        aria-controls={ctx.open ? ctx.listId : undefined}
        data-slot="select-trigger"
        data-size={size}
        disabled={ctx.disabled || disabled}
        data-placeholder={muteWhenEmpty && ctx.value === "" ? "" : undefined}
        className={cn(
          "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border bg-input-background px-3 py-2 text-left text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:shadow-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          className,
        )}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented || ctx.open) return;
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            event.currentTarget.click();
          }
        }}
        {...props}
      >
        {children}
        <ChevronDownIcon className="size-4 opacity-50" aria-hidden="true" />
      </button>
    </PopoverTrigger>
  );
}

function SelectContent({
  className,
  children,
  searchPlaceholder = "Cari…",
  emptyText = "Tidak ditemukan.",
  align = "start",
  sideOffset = 4,
}: {
  className?: string;
  children?: React.ReactNode;
  searchPlaceholder?: string;
  emptyText?: string;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  /** Diterima agar kompatibel dengan Select Radix; daftar selalu berposisi popper. */
  position?: "popper" | "item-aligned";
}) {
  const ctx = useSelectContext("SelectContent");

  // Wadah lepas dibuat setelah mount, sehingga HTML server dan klien tetap sama.
  const [collector, setCollector] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => setCollector(document.createElement("div")), []);

  return (
    <>
      {!ctx.open && collector
        ? createPortal(
            <CollectingContext.Provider value={true}>{children}</CollectingContext.Provider>,
            collector,
          )
        : null}
      <PopoverContent
        data-slot="select-content"
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        // Di atas modal kustom (z-100) maupun Dialog shadcn (z-50).
        className={cn(
          "z-110 w-(--radix-popover-trigger-width) min-w-32 max-w-[min(32rem,calc(100vw-1rem))] p-0",
          className,
        )}
        // Dialog modal memblokir gulir di luar dirinya; daftar ini ada di portal terpisah.
        onWheel={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
      >
        <SelectList
          listId={ctx.listId}
          selected={ctx.value}
          searchPlaceholder={searchPlaceholder}
          emptyText={emptyText}
        >
          {children}
        </SelectList>
      </PopoverContent>
    </>
  );
}

const itemKey = (value: string) => `v:${value}`;

/** Ref item terpilih: saat daftar dibuka, bawa pilihan saat ini ke tengah daftar. */
function centerInList(el: HTMLElement | null) {
  const list = el?.closest<HTMLElement>("[cmdk-list]");
  if (!el || !list) return;
  const listRect = list.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  list.scrollTop += elRect.top - listRect.top - (list.clientHeight - elRect.height) / 2;
}

function SelectList({
  listId,
  selected,
  searchPlaceholder,
  emptyText,
  children,
}: {
  listId: string;
  selected: string;
  searchPlaceholder: string;
  emptyText: string;
  children?: React.ReactNode;
}) {
  const [active, setActive] = React.useState(itemKey(selected));

  return (
    <Command
      value={active}
      onValueChange={setActive}
      filter={(_value, search, keywords) => matchScore((keywords ?? []).join(" "), search)}
    >
      <CommandInput placeholder={searchPlaceholder} aria-label={searchPlaceholder} className="text-base md:text-sm" />
      <CommandList
        id={listId}
        // Tidak memakai var(--radix-popover-content-available-height): nilainya baru terisi setelah
        // Popper mengukur, sehingga pada render pertama batas tinggi hilang dan scroll-ke-pilihan gagal.
        className="max-h-[min(18rem,60dvh)]"
      >
        <CommandEmpty>{emptyText}</CommandEmpty>
        {children}
      </CommandList>
    </Command>
  );
}

type SelectItemProps = Omit<
  React.ComponentProps<typeof CommandItem>,
  "value" | "onSelect" | "keywords" | "children"
> & {
  value: string;
  children?: React.ReactNode;
  /** Teks untuk pencarian bila `children` bukan teks polos. */
  textValue?: string;
  /** Kata kunci tambahan yang ikut dicari. */
  keywords?: string[];
};

function SelectItem({ value, children, textValue, keywords, className, disabled, ...props }: SelectItemProps) {
  const ctx = useSelectContext("SelectItem");
  const collecting = React.useContext(CollectingContext);
  const text = textValue ?? nodeText(children);
  const { retain, release, register } = ctx;

  React.useEffect(() => {
    retain(value);
    return () => release(value);
  }, [value, retain, release]);

  React.useEffect(() => {
    register(value, children, text);
  }, [value, children, text, register]);

  if (collecting) return null;

  const checked = ctx.value === value;
  return (
    <CommandItem
      data-slot="select-item"
      data-checked={checked}
      ref={checked ? centerInList : undefined}
      value={itemKey(value)}
      keywords={[text, ...(keywords ?? [])]}
      disabled={disabled}
      onSelect={() => ctx.select(value)}
      className={cn(
        "relative min-h-11 w-full cursor-pointer py-2 pr-8 pl-2 whitespace-normal break-words md:min-h-0 md:py-1.5 data-[disabled=true]:cursor-not-allowed",
        className,
      )}
      {...props}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">{children}</span>
      {checked ? (
        <span className="absolute right-2 flex size-3.5 items-center justify-center">
          <CheckIcon className="size-4" aria-hidden="true" />
        </span>
      ) : null}
    </CommandItem>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<"div">) {
  const collecting = React.useContext(CollectingContext);
  if (collecting) return null;
  return (
    <div
      data-slot="select-label"
      className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
      {...props}
    />
  );
}

function SelectSeparator({ className }: { className?: string }) {
  const collecting = React.useContext(CollectingContext);
  if (collecting) return null;
  return <CommandSeparator data-slot="select-separator" className={cn("my-1", className)} />;
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
