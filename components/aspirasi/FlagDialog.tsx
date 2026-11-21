"use client";

import * as React from "react";
import { Flag, X } from "lucide-react";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";
import { isTurnstileRequiredOnClient } from "@/lib/turnstile-config";
import { FLAG_REASONS, FLAG_REASON_LABELS, type FlagReason } from "@/lib/aspirasi/catalog";
import { btnOutline, btnPrimary, focusRing } from "./ui";

const inputClass =
  "block min-h-12 w-full rounded-xl border border-gray-400 bg-white px-4 py-3 text-base text-gray-900 outline-none transition focus:border-[#0f766e] focus:ring-4 focus:ring-[#0d9488]/30 aria-[invalid=true]:border-red-600";

/** Tombol + dialog "Laporkan konten ini". Memakai <dialog> bawaan (fokus terperangkap, Esc menutup). */
export function FlagDialog({ code }: { code: string }) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const [reason, setReason] = React.useState<FlagReason | "">("");
  const [detail, setDetail] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState<{ hidden: boolean } | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [resetSignal, setResetSignal] = React.useState(0);
  const required = isTurnstileRequiredOnClient();
  const errRef = React.useRef<HTMLParagraphElement>(null);

  const open = () => ref.current?.showModal();
  const close = () => ref.current?.close();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fail = (m: string) => {
      setError(m);
      requestAnimationFrame(() => errRef.current?.focus());
    };
    if (!reason) return fail("Pilih alasan laporan Anda.");
    if (reason === "OTHER" && detail.trim().length < 10) return fail("Jelaskan alasannya (minimal 10 karakter).");
    if (required && !token) return fail("Selesaikan verifikasi keamanan terlebih dahulu.");
    setBusy(true);
    try {
      const res = await fetch(`/api/aspirasi/${encodeURIComponent(code)}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, detail: detail.trim(), contact: contact.trim(), turnstileToken: token }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; hidden?: boolean } | null;
      if (!res.ok) throw new Error(data?.error || "Gagal mengirim laporan konten.");
      setDone({ hidden: !!data?.hidden });
    } catch (err) {
      fail(err instanceof Error ? err.message : "Gagal mengirim laporan konten.");
      setResetSignal((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={open} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-base text-gray-800 underline underline-offset-2 hover:text-gray-950 ${focusRing}`}>
        <Flag className="h-4 w-4" aria-hidden="true" />
        Laporkan konten ini
      </button>
      <dialog
        ref={ref}
        aria-labelledby="flag-title"
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl p-0 text-gray-900 shadow-2xl backdrop:bg-black/50"
        onClose={() => {
          setError(null);
        }}
      >
        <div className="max-h-[85vh] overflow-y-auto p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 id="flag-title" className="text-xl font-semibold">
              Laporkan konten ini
            </h2>
            <button type="button" onClick={close} aria-label="Tutup" className={`-mr-2 -mt-2 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl hover:bg-gray-100 ${focusRing}`}>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {done ? (
            <div role="status" className="mt-4 space-y-3">
              <p className="text-base leading-relaxed text-gray-800">
                Terima kasih. Laporan Anda sudah masuk ke tim peninjau Klandesa.{" "}
                {done.hidden ? "Karena menyangkut data pribadi, laporan ini disembunyikan sementara sampai ditinjau." : "Kami akan meninjaunya dan mengambil tindakan bila diperlukan."}
              </p>
              <button type="button" onClick={close} className={btnPrimary}>
                Tutup
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="mt-4 space-y-4">
              {error ? (
                <p ref={errRef} tabIndex={-1} role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-base text-red-900 outline-none focus-visible:ring-4 focus-visible:ring-red-300">
                  {error}
                </p>
              ) : null}
              <fieldset>
                <legend className="mb-2 text-base font-medium">Apa masalahnya?</legend>
                <div className="space-y-2">
                  {FLAG_REASONS.map((r) => (
                    <label key={r} className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border-2 p-3 text-base ${reason === r ? "border-[#0f766e] bg-teal-50" : "border-gray-300"}`}>
                      <input type="radio" name="flag-reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="mt-1 h-4 w-4 accent-[#0f766e]" />
                      <span>{FLAG_REASON_LABELS[r]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor="flag-detail" className="mb-2 block text-base font-medium">
                  Penjelasan {reason === "OTHER" ? "" : "(opsional)"}
                </label>
                <textarea id="flag-detail" rows={3} maxLength={1000} value={detail} onChange={(e) => setDetail(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="flag-contact" className="mb-2 block text-base font-medium">
                  Kontak Anda (opsional)
                </label>
                <input id="flag-contact" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={255} autoComplete="off" className={inputClass} aria-describedby="flag-contact-hint" />
                <p id="flag-contact-hint" className="mt-1 text-sm text-gray-700">Hanya dilihat tim peninjau bila perlu bertanya. Tidak ditampilkan.</p>
              </div>
              <TurnstileWidget onToken={setToken} resetSignal={resetSignal} />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={close} className={btnOutline}>
                  Batal
                </button>
                <button type="submit" disabled={busy} className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-60`}>
                  {busy ? "Mengirim…" : "Kirim laporan"}
                </button>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
