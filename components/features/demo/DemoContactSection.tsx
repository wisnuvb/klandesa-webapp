"use client";

import * as React from "react";
import {
  CheckCircle2,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  User,
} from "lucide-react";
import { getStoredReferralCode } from "@/lib/referrals/client";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";

const intentOptions = [
  {
    id: "hubungi",
    label: "Minta dihubungi tim Klandesa",
    subject: "Demo - minta dihubungi",
  },
  {
    id: "harga",
    label: "Tanya harga & paket",
    subject: "Demo - tanya harga",
  },
  {
    id: "lainnya",
    label: "Pertanyaan lain",
    subject: "Demo - pertanyaan lain",
  },
] as const;

type IntentId = (typeof intentOptions)[number]["id"];

function normalizePhone(value: string): string {
  return value.replace(/\s/g, "").trim();
}

export function DemoContactSection() {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [village, setVillage] = React.useState("");
  const [intent, setIntent] = React.useState<IntentId>("hubungi");
  const [note, setNote] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);
  const turnstileRequired = Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim(),
  );

  const selectedIntent = intentOptions.find((o) => o.id === intent)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = normalizePhone(phone);
    const trimmedVillage = village.trim();
    const trimmedNote = note.trim();

    if (!trimmedName) {
      setSubmitError("Mohon isi nama Anda.");
      return;
    }
    if (trimmedPhone.length < 10) {
      setSubmitError("Mohon isi nomor WhatsApp yang benar (minimal 10 angka).");
      return;
    }
    if (!trimmedVillage) {
      setSubmitError("Mohon isi nama desa dan kabupaten.");
      return;
    }

    const messageLines = [`Desa: ${trimmedVillage}`];
    if (trimmedNote) {
      messageLines.push("", `Catatan: ${trimmedNote}`);
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      if (turnstileRequired && !turnstileToken) {
        setSubmitError("Selesaikan verifikasi keamanan terlebih dahulu");
        return;
      }

      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          phone: trimmedPhone,
          email: "",
          subject: selectedIntent.subject,
          message: messageLines.join("\n"),
          source: "demo",
          turnstileToken,
          referralCode: getStoredReferralCode(),
          sourcePath:
            typeof window === "undefined"
              ? "/demo"
              : `${window.location.pathname}${window.location.search}`,
        }),
      });

      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error || "Gagal mengirim. Coba lagi sebentar.");
      }

      setIsSubmitted(true);
      setName("");
      setPhone("");
      setVillage("");
      setNote("");
      setIntent("hubungi");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Gagal mengirim. Coba lagi sebentar.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="hubungi-tim"
      className="mx-auto mt-14 max-w-3xl scroll-mt-28"
      aria-labelledby="demo-contact-heading"
    >
      <div className="rounded-3xl border border-[#0d9488]/25 bg-gradient-to-b from-[#f0fdfa] to-white p-6 shadow-sm sm:p-10">
        <div className="text-center">
          <p className="text-sm font-medium text-[#0f766e]">Butuh bantuan lanjut?</p>
          <h2
            id="demo-contact-heading"
            className="mt-2 text-2xl text-gray-900 sm:text-3xl"
          >
            Minta Tim Klandesa Menghubungi Anda
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base">
            Isi formulir singkat ini. Cukup nama, nomor WhatsApp, dan desa Anda — tim
            kami akan menghubungi untuk bantu langkah berikutnya.
          </p>
        </div>

        {isSubmitted ? (
          <div
            className="mt-8 rounded-2xl border border-[#0d9488]/20 bg-white p-6 text-center sm:p-8"
            role="status"
          >
            <CheckCircle2 className="mx-auto h-12 w-12 text-[#0f766e]" />
            <p className="mt-4 text-lg text-gray-900">Terima kasih, pesan sudah kami terima.</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Tim Klandesa akan menghubungi Anda lewat WhatsApp sesegera mungkin pada jam
              kerja.
            </p>
            <button
              type="button"
              className="mt-6 text-sm text-[#0f766e] underline-offset-2 hover:underline"
              onClick={() => setIsSubmitted(false)}
            >
              Kirim pesan lagi
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="demo-contact-name"
                className="mb-2 block text-base text-gray-800"
              >
                Nama Anda <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                  aria-hidden
                />
                <input
                  id="demo-contact-name"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={255}
                  placeholder="Contoh: Bapak Sutrisno"
                  className="w-full rounded-2xl border border-gray-300 bg-white py-4 pl-12 pr-4 text-base text-gray-900 outline-none transition focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/25"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="demo-contact-phone"
                className="mb-2 block text-base text-gray-800"
              >
                Nomor WhatsApp <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                  aria-hidden
                />
                <input
                  id="demo-contact-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  maxLength={30}
                  placeholder="08xxxxxxxxxx"
                  className="w-full rounded-2xl border border-gray-300 bg-white py-4 pl-12 pr-4 text-base text-gray-900 outline-none transition focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/25"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Pastikan nomor aktif di WhatsApp agar tim kami bisa langsung chat.
              </p>
            </div>

            <div>
              <label
                htmlFor="demo-contact-village"
                className="mb-2 block text-base text-gray-800"
              >
                Nama desa & kabupaten <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                  aria-hidden
                />
                <input
                  id="demo-contact-village"
                  type="text"
                  required
                  maxLength={200}
                  placeholder="Contoh: Desa Sumberharjo, Kab. Sleman"
                  className="w-full rounded-2xl border border-gray-300 bg-white py-4 pl-12 pr-4 text-base text-gray-900 outline-none transition focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/25"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                />
              </div>
            </div>

            <fieldset>
              <legend className="mb-3 block text-base text-gray-800">
                Apa yang Anda butuhkan?
              </legend>
              <div className="grid gap-3 sm:grid-cols-1">
                {intentOptions.map((option) => {
                  const active = intent === option.id;
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                        active
                          ? "border-[#0d9488] bg-[#f0fdfa] ring-2 ring-[#0d9488]/20"
                          : "border-gray-200 bg-white hover:border-[#0d9488]/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="demo-intent"
                        value={option.id}
                        checked={active}
                        onChange={() => setIntent(option.id)}
                        className="mt-1 h-5 w-5 shrink-0 accent-[#0d9488]"
                      />
                      <span className="text-base leading-snug text-gray-800">
                        {option.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label
                htmlFor="demo-contact-note"
                className="mb-2 block text-base text-gray-800"
              >
                Catatan tambahan{" "}
                <span className="text-sm font-normal text-gray-500">(opsional)</span>
              </label>
              <div className="relative">
                <MessageCircle
                  className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-gray-400"
                  aria-hidden
                />
                <textarea
                  id="demo-contact-note"
                  rows={3}
                  maxLength={1000}
                  placeholder="Contoh: ingin demo langsung minggu depan"
                  className="w-full resize-none rounded-2xl border border-gray-300 bg-white py-4 pl-12 pr-4 text-base text-gray-900 outline-none transition focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/25"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            {submitError ? (
              <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                {submitError}
              </p>
            ) : null}

            <TurnstileWidget onToken={setTurnstileToken} />

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0d9488] to-[#0f766e] py-4 text-base text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                "Mengirim…"
              ) : (
                <>
                  <Send className="h-5 w-5" aria-hidden />
                  Kirim — tim akan hubungi saya
                </>
              )}
            </button>

            <p className="text-center text-xs leading-relaxed text-gray-500">
              Data hanya dipakai untuk menindaklanjuti permintaan Anda. Tidak perlu
              mengisi email.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
