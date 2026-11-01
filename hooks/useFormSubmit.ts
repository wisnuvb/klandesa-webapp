"use client";

import { useRef, useState } from "react";

/** Kirim formulir JSON dan simpan status: sedang kirim, galat per kolom, galat umum. Fokus dipindah ke ringkasan galat. */
export function useFormSubmit() {
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  /** Mengembalikan isi JSON jawaban bila sukses, atau null bila gagal (galat sudah tersimpan di state). */
  async function submit<T = Record<string, unknown>>(url: string, method: "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown, fallback = "Gagal menyimpan. Coba lagi."): Promise<T | null> {
    setBusy(true);
    setErrors({});
    setGeneral(null);
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        const fe = (j?.fieldErrors ?? {}) as Record<string, string>;
        setErrors(fe);
        setGeneral(Object.keys(fe).length ? null : typeof j?.error === "string" ? j.error : fallback);
        queueMicrotask(() => summaryRef.current?.focus());
        return null;
      }
      return (j ?? {}) as T;
    } catch {
      setGeneral("Tidak bisa terhubung. Periksa koneksi lalu coba lagi.");
      queueMicrotask(() => summaryRef.current?.focus());
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { busy, errors, general, summaryRef, submit };
}
