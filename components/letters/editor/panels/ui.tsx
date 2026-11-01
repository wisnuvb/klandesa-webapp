"use client";

/**
 * Kontrol formulir kecil untuk panel samping: label selalu terlihat, galat di bawah kolom
 * (aria-describedby), target ≥ 44 px, dan input teks yang menunda penyimpanan sebentar agar
 * mengetik tidak membuat seluruh surat dirender ulang di tiap huruf.
 */
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/components/ui/utils";
import { clampNum } from "./helpers";
import { SearchSelect } from "@/components/ui/search-select";

export const controlClass =
  "block w-full min-h-11 rounded-md border border-input bg-input-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive";

export const labelClass = "mb-1 block text-sm font-medium text-foreground";
export const hintClass = "mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]";

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1 flex items-start gap-1.5 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

// ----------------------------------------------------------------- input teks

const DEFAULT_DELAY = 250;

/** Nilai lokal yang disimpan ke dokumen setelah jeda singkat, saat berpindah kolom, atau saat kolom ditutup. */
function useBuffered<T extends string>(value: T, commit: (v: T) => void, delay: number) {
  const [local, setLocal] = useState<string>(value);
  const [dirty, setDirty] = useState(false);
  const [prev, setPrev] = useState<string>(value);
  if (value !== prev) {
    setPrev(value);
    if (!dirty) setLocal(value);
  }

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<T | null>(null);
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  });

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current !== null) {
      const v = pending.current;
      pending.current = null;
      commitRef.current(v);
    }
    setDirty(false);
  }, []);

  const change = useCallback(
    (v: T, immediate = false) => {
      setLocal(v);
      setDirty(true);
      pending.current = v;
      if (timer.current) clearTimeout(timer.current);
      if (immediate) flush();
      else timer.current = setTimeout(flush, delay);
    },
    [delay, flush],
  );

  // Simpan yang tertunda bila kolom hilang (mis. pilihan bagian berganti).
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (pending.current !== null) commitRef.current(pending.current);
    },
    [],
  );

  return { local, setLocal, change, flush, dirty };
}

type BaseFieldProps = {
  label: string;
  hint?: string;
  error?: string | null;
  className?: string;
  disabled?: boolean;
};

export function TextField({
  label, value, onCommit, hint, error, className, disabled, delay = DEFAULT_DELAY,
  maxLength, placeholder, multiline, rows = 3, validate, commitInvalid, inputRef, autoComplete = "off", mono,
}: BaseFieldProps & {
  value: string;
  onCommit: (v: string) => void;
  delay?: number;
  maxLength?: number;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  /** Galat sebaris; nilai yang tidak lolos tidak disimpan kecuali `commitInvalid`. */
  validate?: (v: string) => string | null;
  commitInvalid?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  autoComplete?: string;
  mono?: boolean;
}) {
  const id = useId();
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  const guarded = useCallback(
    (v: string) => {
      if (!validate || commitInvalid || !validate(v)) onCommit(v);
    },
    [validate, commitInvalid, onCommit],
  );
  const { local, change, flush } = useBuffered(value, guarded, delay);
  const own = validate ? validate(local) : null;
  const shown = error ?? own;
  const describedBy = [shown ? errId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  const common = {
    id, value: local, maxLength, placeholder, disabled, autoComplete,
    "aria-invalid": shown ? true : undefined,
    "aria-describedby": describedBy,
    onBlur: flush,
    className: cn(controlClass, mono && "font-mono"),
  } as const;
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>{label}</label>
      {multiline ? (
        <textarea {...common} rows={rows} onChange={(e) => change(e.target.value)} />
      ) : (
        <input
          {...common}
          ref={inputRef}
          type="text"
          onChange={(e) => change(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") flush(); }}
        />
      )}
      {hint && <p id={hintId} className={hintClass}>{hint}</p>}
      <FieldError id={errId}>{shown}</FieldError>
    </div>
  );
}

export function NumberField({
  label, value, onCommit, min, max, step = 1, unit, hint, error, className, disabled, delay = 400,
}: BaseFieldProps & {
  value: number;
  onCommit: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  delay?: number;
}) {
  const id = useId();
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  const commit = useCallback(
    (raw: string) => {
      if (!raw.trim()) return;
      const n = Number(raw.replace(",", "."));
      if (Number.isFinite(n)) onCommit(clampNum(n, min, max));
    },
    [onCommit, min, max],
  );
  const { local, setLocal, change, flush } = useBuffered(String(value), commit, delay);
  const typed = Number(local.replace(",", "."));
  const out = local.trim() !== "" && Number.isFinite(typed) && (typed < min || typed > max);
  const shown = error ?? (out ? `Isi antara ${min} dan ${max}${unit ? ` ${unit}` : ""}.` : null);
  const describedBy = [shown ? errId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}{unit ? <span className="font-normal text-muted-foreground"> ({unit})</span> : null}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={local}
        disabled={disabled}
        aria-invalid={shown ? true : undefined}
        aria-describedby={describedBy}
        className={controlClass}
        onChange={(e) => change(e.target.value)}
        onBlur={() => {
          flush();
          const n = Number(local.replace(",", "."));
          setLocal(local.trim() && Number.isFinite(n) ? String(clampNum(n, min, max)) : String(value));
        }}
      />
      {hint && <p id={hintId} className={hintClass}>{hint}</p>}
      <FieldError id={errId}>{shown}</FieldError>
    </div>
  );
}

// ------------------------------------------------------------ pilihan & saklar

export function SelectField<V extends string | number>({
  label, value, onChange, options, hint, error, className, disabled, placeholder,
}: BaseFieldProps & {
  value: V | "";
  onChange: (v: V) => void;
  options: ReadonlyArray<{ value: V; label: string; disabled?: boolean }>;
  placeholder?: string;
}) {
  const id = useId();
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <SearchSelect
        id={id}
        value={String(value)}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={controlClass}
        onChange={(e) => {
          const picked = options.find((o) => String(o.value) === e.target.value);
          if (picked) onChange(picked.value);
        }}
      >
        {placeholder !== undefined && <option value="" disabled>{placeholder}</option>}
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)} disabled={o.disabled}>{o.label}</option>
        ))}
      </SearchSelect>
      {hint && <p id={hintId} className={hintClass}>{hint}</p>}
      <FieldError id={errId}>{error}</FieldError>
    </div>
  );
}

export function CheckField({
  label, checked, onChange, hint, disabled, className,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={cn(
          "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 text-sm",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-describedby={hint ? hintId : undefined}
          onChange={(e) => onChange(e.target.checked)}
          className="h-5 w-5 shrink-0 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span>{label}</span>
      </label>
      {hint && <p id={hintId} className="ml-9 -mt-1 mb-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Pilihan satu dari beberapa (radio) tampil sebagai kartu; hanya teks + garis tepi, tidak mengandalkan warna. */
export function RadioCards<V extends string>({
  legend, value, onChange, options, name, columns = 1,
}: {
  legend: string;
  value: V;
  onChange: (v: V) => void;
  options: ReadonlyArray<{ value: V; label: string; hint?: string }>;
  name?: string;
  columns?: 1 | 2 | 3;
}) {
  const auto = useId();
  const group = name ?? auto;
  return (
    <fieldset className="min-w-0">
      <legend className={labelClass}>{legend}</legend>
      <div className={cn("grid gap-2", columns === 2 && "grid-cols-2", columns === 3 && "grid-cols-3")}>
        {options.map((o) => (
          <label
            key={o.value}
            className="flex min-h-11 cursor-pointer items-start gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
          >
            <input
              type="radio"
              name={group}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary focus-visible:outline-none"
            />
            <span>
              <span className="block font-medium">{o.label}</span>
              {o.hint && <span className="block text-xs text-muted-foreground">{o.hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// ------------------------------------------------------------------- struktur

export function Section({
  title, description, children, action, className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cn("space-y-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 id={id} className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** "Pengaturan lanjutan": tertutup bawaan agar operator awam tidak kewalahan. */
export function Disclosure({
  label = "Pengaturan lanjutan", children, defaultOpen = false,
}: {
  label?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-1 text-left text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span>{label}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
      </button>
      <div id={id} hidden={!open} className="space-y-3 pt-1">
        {open && children}
      </div>
    </div>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-dashed border-input px-3 py-4 text-center text-sm text-muted-foreground">{children}</p>;
}

// -------------------------------------------------------------------- dialog

export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel = "Ya, lanjutkan", cancelLabel = "Batal",
  destructive, onConfirm, hideConfirm, extra,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Sembunyikan tombol konfirmasi (mis. hapus tidak diizinkan, hanya penjelasan). */
  hideConfirm?: boolean;
  onConfirm?: () => void;
  extra?: ReactNode;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild><div>{description}</div></AlertDialogDescription>
        </AlertDialogHeader>
        {extra}
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11">{hideConfirm ? "Mengerti" : cancelLabel}</AlertDialogCancel>
          {!hideConfirm && (
            <AlertDialogAction
              className={cn("min-h-11", destructive && "bg-destructive text-white hover:bg-destructive/90")}
              onClick={onConfirm}
            >
              {confirmLabel}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
