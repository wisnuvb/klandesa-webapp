"use client";

import * as React from "react";
import { CheckCircle2, Send } from "lucide-react";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";
import { isTurnstileRequiredOnClient } from "@/lib/turnstile-config";
import { getStoredReferralCode } from "@/lib/referrals/client";
import { newMetaEventId, trackMeta } from "@/lib/marketing/meta-pixel";
import { ADS_FORM_ID, summarizeAdAttribution } from "@/lib/marketing/ads-landing";

type FieldErrors = Partial<Record<"name" | "phone" | "village", string>>;

const inputClass =
  "block min-h-12 w-full rounded-xl border border-gray-400 bg-white px-4 py-3 text-base text-gray-900 outline-none transition focus:border-[#0f766e] focus:ring-4 focus:ring-[#0d9488]/30 aria-[invalid=true]:border-red-600";

export function LeadForm() {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [village, setVillage] = React.useState("");
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);
  const turnstileRequired = isTurnstileRequiredOnClient();
  const errorSummaryRef = React.useRef<HTMLDivElement>(null);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Isi nama Anda.";
    if (phone.replace(/\D/g, "").length < 10) {
      next.phone = "Isi nomor WhatsApp yang benar, minimal 10 angka (contoh 081234567890).";
    }
    if (!village.trim()) next.village = "Isi nama desa dan kabupaten, contoh: Desa Sumberharjo, Kab. Sleman.";
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }
    if (turnstileRequired && !turnstileToken) {
      setSubmitError("Selesaikan verifikasi keamanan di atas terlebih dahulu.");
      return;
    }

    const attribution = summarizeAdAttribution(window.location.search);
    const message = [`Desa: ${village.trim()}`, "", `Sumber: iklan Meta${attribution ? ` (${attribution})` : ""}`].join("\n");

    try {
      setSubmitting(true);
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.replace(/\s/g, "").trim(),
          email: "",
          subject: "Iklan Meta - minta dihubungi",
          message,
          source: "iklan-meta",
          turnstileToken,
          referralCode: getStoredReferralCode(),
          sourcePath: `${window.location.pathname}${window.location.search}`,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "Gagal mengirim. Coba lagi sebentar.");

      // Hanya nama event + label konten; tanpa nama, nomor, atau nama desa.
      trackMeta("Lead", { content_name: "minta-dihubungi" }, newMetaEventId());
      setDone(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Gagal mengirim. Coba lagi sebentar.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div role="status" className="rounded-2xl border border-[#0f766e]/30 bg-white p-6 text-center sm:p-8">
        <CheckCircle2 className="mx-auto h-12 w-12 text-[#0f766e]" aria-hidden="true" />
        <p className="mt-4 text-xl font-semibold text-gray-900">Terima kasih, data Anda sudah kami terima.</p>
        <p className="mt-2 text-base leading-relaxed text-gray-700">
          Tim Klandesa akan menghubungi Anda lewat WhatsApp pada jam kerja.
        </p>
      </div>
    );
  }

  const errorList = Object.entries(errors) as Array<[keyof FieldErrors, string]>;
  const fieldId = (k: keyof FieldErrors) => `lead-${k}`;

  return (
    <form id={ADS_FORM_ID} onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="Formulir minta dihubungi">
      {errorList.length > 0 ? (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 outline-none focus-visible:ring-4 focus-visible:ring-red-300"
        >
          <p className="font-semibold">Periksa isian berikut:</p>
          <ul className="mt-1 list-disc pl-5">
            {errorList.map(([key, text]) => (
              <li key={key}>
                <a href={`#${fieldId(key)}`} className="underline underline-offset-2">
                  {text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <label htmlFor={fieldId("name")} className="mb-2 block text-base font-medium text-gray-900">
          Nama Anda
        </label>
        <input
          id={fieldId("name")}
          type="text"
          autoComplete="name"
          maxLength={255}
          required
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "lead-name-err" : undefined}
          placeholder="Contoh: Bapak Sutrisno"
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {errors.name ? <p id="lead-name-err" className="mt-1 text-sm text-red-700">{errors.name}</p> : null}
      </div>

      <div>
        <label htmlFor={fieldId("phone")} className="mb-2 block text-base font-medium text-gray-900">
          Nomor WhatsApp
        </label>
        <input
          id={fieldId("phone")}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={30}
          required
          aria-invalid={errors.phone ? true : undefined}
          aria-describedby={errors.phone ? "lead-phone-err" : "lead-phone-hint"}
          placeholder="08xxxxxxxxxx"
          className={inputClass}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        {errors.phone ? (
          <p id="lead-phone-err" className="mt-1 text-sm text-red-700">{errors.phone}</p>
        ) : (
          <p id="lead-phone-hint" className="mt-1 text-sm text-gray-700">Pastikan nomor aktif di WhatsApp.</p>
        )}
      </div>

      <div>
        <label htmlFor={fieldId("village")} className="mb-2 block text-base font-medium text-gray-900">
          Nama desa dan kabupaten
        </label>
        <input
          id={fieldId("village")}
          type="text"
          autoComplete="off"
          maxLength={200}
          required
          aria-invalid={errors.village ? true : undefined}
          aria-describedby={errors.village ? "lead-village-err" : undefined}
          placeholder="Contoh: Desa Sumberharjo, Kab. Sleman"
          className={inputClass}
          value={village}
          onChange={(e) => setVillage(e.target.value)}
        />
        {errors.village ? <p id="lead-village-err" className="mt-1 text-sm text-red-700">{errors.village}</p> : null}
      </div>

      <TurnstileWidget onToken={setTurnstileToken} />

      {submitError ? (
        <p role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          {submitError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0f766e] px-6 text-lg font-semibold text-white transition hover:bg-[#115e59] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0d9488]/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          "Mengirim…"
        ) : (
          <>
            <Send className="h-5 w-5" aria-hidden="true" />
            Hubungi saya
          </>
        )}
      </button>

      <p className="text-center text-sm leading-relaxed text-gray-700">
        Data hanya dipakai tim Klandesa untuk menghubungi Anda. Tidak perlu mengisi email.
      </p>
    </form>
  );
}
