"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Search, XCircle } from "lucide-react";
import { MODERATION_LABELS, PROGRESS_LABELS, type AspirationProgress, type ModerationStatus } from "@/lib/aspirasi/catalog";
import { isAspirationCode } from "@/lib/aspirasi/slug";
import { btnPrimary } from "./ui";

type StatusResult = {
  code: string;
  status: string;
  rejectReason: string | null;
  progress: AspirationProgress;
  createdAt: string;
  publishedAt: string | null;
  path: string | null;
};

const inputClass =
  "block min-h-12 w-full rounded-xl border border-gray-400 bg-white px-4 py-3 text-base text-gray-900 outline-none transition focus:border-[#0f766e] focus:ring-4 focus:ring-[#0d9488]/30 aria-[invalid=true]:border-red-600";

const day = (iso: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(iso));

const EXPLAIN: Record<string, string> = {
  PENDING: "Laporan Anda sudah kami terima dan sedang menunggu tinjauan tim. Ini biasanya memerlukan beberapa hari kerja.",
  PUBLISHED: "Laporan Anda sudah tayang tanpa menampilkan identitas Anda.",
  REJECTED: "Laporan Anda belum dapat ditayangkan.",
  HIDDEN: "Laporan Anda disembunyikan sementara untuk ditinjau ulang.",
  REMOVED: "Laporan ini sudah dihapus dari halaman publik.",
};

export function StatusCheckForm() {
  const [code, setCode] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<StatusResult | null>(null);
  const errRef = React.useRef<HTMLParagraphElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const c = code.trim().toLowerCase();
    if (!isAspirationCode(c) || contact.trim().length < 5) {
      setError("Isi nomor laporan (10 karakter) dan nomor WhatsApp atau email yang Anda pakai saat mengirim.");
      requestAnimationFrame(() => errRef.current?.focus());
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/aspirasi/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: c, contact: contact.trim() }) });
      const data = (await res.json().catch(() => null)) as (StatusResult & { error?: string }) | null;
      if (!res.ok || !data) throw new Error(data?.error || "Gagal memeriksa status.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memeriksa status.");
      requestAnimationFrame(() => errRef.current?.focus());
    } finally {
      setBusy(false);
    }
  }

  const Icon = result?.status === "PUBLISHED" ? CheckCircle2 : result?.status === "PENDING" ? Clock : XCircle;

  return (
    <div className="space-y-6">
      <form onSubmit={submit} noValidate className="space-y-5" aria-label="Cek status laporan">
        {error ? (
          <p ref={errRef} tabIndex={-1} role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-base text-red-900 outline-none focus-visible:ring-4 focus-visible:ring-red-300">
            {error}
          </p>
        ) : null}
        <div>
          <label htmlFor="cek-code" className="mb-2 block text-base font-medium text-gray-900">
            Nomor laporan
          </label>
          <input id="cek-code" className={`${inputClass} font-mono tracking-wider`} value={code} onChange={(e) => setCode(e.target.value)} maxLength={12} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="mis. k7m2xq9r4t" aria-invalid={error ? true : undefined} />
        </div>
        <div>
          <label htmlFor="cek-contact" className="mb-2 block text-base font-medium text-gray-900">
            Nomor WhatsApp atau email saat mengirim
          </label>
          <input id="cek-contact" className={inputClass} value={contact} onChange={(e) => setContact(e.target.value)} maxLength={255} autoComplete="off" placeholder="08xxxxxxxxxx atau nama@email.com" aria-invalid={error ? true : undefined} aria-describedby="cek-contact-hint" />
          <p id="cek-contact-hint" className="mt-1 text-sm text-gray-700">Kontak ini dipakai untuk mencocokkan laporan; tidak pernah ditampilkan.</p>
        </div>
        <button type="submit" disabled={busy} className={`${btnPrimary} w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto`}>
          <Search className="h-5 w-5" aria-hidden="true" />
          {busy ? "Memeriksa…" : "Periksa status"}
        </button>
      </form>

      <div role="status" aria-live="polite">
        {result ? (
          <div className="rounded-2xl border border-gray-300 bg-white p-5">
            <p className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Icon className="h-5 w-5" aria-hidden="true" />
              {MODERATION_LABELS[result.status as ModerationStatus] ?? result.status}
            </p>
            <p className="mt-2 text-base leading-relaxed text-gray-800">{EXPLAIN[result.status] ?? ""}</p>
            {result.rejectReason ? (
              <p className="mt-3 rounded-xl bg-gray-50 p-3 text-base text-gray-900">
                <span className="font-semibold">Alasan: </span>
                {result.rejectReason}
              </p>
            ) : null}
            <dl className="mt-3 grid gap-1 text-sm text-gray-700">
              <div className="flex gap-2">
                <dt className="font-medium">Dikirim:</dt>
                <dd>{day(result.createdAt)}</dd>
              </div>
              {result.status === "PUBLISHED" ? (
                <div className="flex gap-2">
                  <dt className="font-medium">Tanggapan desa:</dt>
                  <dd>{PROGRESS_LABELS[result.progress]}</dd>
                </div>
              ) : null}
            </dl>
            {result.path ? (
              <Link href={result.path} className={`${btnPrimary} mt-4`}>
                Lihat halaman laporan
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
