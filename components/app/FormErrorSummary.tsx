import type { RefObject } from "react";

/** Ringkasan galat formulir (fokus dipindah ke sini saat gagal) dengan nama kolom yang mudah dibaca. */
export function FormErrorSummary({ innerRef, errors, general, labels }: { innerRef: RefObject<HTMLDivElement | null>; errors: Record<string, string>; general: string | null; labels: Record<string, string> }) {
  const keys = Object.keys(errors);
  if (!keys.length && !general) return null;
  return (
    <div ref={innerRef} tabIndex={-1} role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive outline-none">
      <p className="font-medium">Belum bisa disimpan:</p>
      <ul className="list-disc pl-5">
        {keys.map((k) => (
          <li key={k}>
            {labels[k] ?? k}: {errors[k]}
          </li>
        ))}
        {general ? <li>{general}</li> : null}
      </ul>
    </div>
  );
}

/** Pesan galat di bawah satu kolom, terhubung lewat aria-describedby. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={`${id}-err`} className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

export const fieldA11y = (id: string, message?: string) => ({ id, "aria-invalid": message ? true : undefined, "aria-describedby": message ? `${id}-err` : undefined });
