"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useLandingModals } from "@/app/(landing)/layout";
import {
  desaValuePoints,
  featureHighlights,
  pemdaValuePoints,
} from "@/components/features/partner-public/content";
import type { PartnerPublicProfile } from "@/lib/partner/public-page";
import { buildWhatsappUrl } from "@/lib/partner/public-page";
import {
  captureReferralFromPartnerPage,
  trackReferralClient,
} from "@/lib/referrals/client";

type Props = {
  profile: PartnerPublicProfile;
};

type Segment = "desa" | "pemda";

export function PartnerPublicPageClient({ profile }: Props) {
  const { setShowRegistration, setShowContact } = useLandingModals();
  const [segment, setSegment] = useState<Segment>("desa");

  const sourcePath = `/m/${profile.slug}`;
  const headline =
    profile.publicHeadline?.trim() ||
    "Digitalisasi desa & pemda bersama Klandesa";
  const bio =
    profile.publicBio?.trim() ||
    `${profile.name} siap mendampingi desa dan pemda di wilayah Anda memilih platform operasional yang terintegrasi dan selaras dengan SDGs.`;

  const whatsappUrl = useMemo(() => {
    const digits = profile.publicWhatsapp?.replace(/\D/g, "") ?? "";
    if (!digits) return null;
    const message = `Halo ${profile.name}, saya tertarik dengan Klandesa dan ingin diskusi lebih lanjut.`;
    return buildWhatsappUrl(digits, message);
  }, [profile.name, profile.publicWhatsapp]);

  useEffect(() => {
    captureReferralFromPartnerPage(profile.referralCode, sourcePath);
  }, [profile.referralCode, sourcePath]);

  const openRegistration = () => {
    void trackReferralClient("register_open", {
      refCode: profile.referralCode,
      sourcePath,
    });
    setShowRegistration(true);
  };

  const openContact = () => {
    void trackReferralClient("contact_open", {
      refCode: profile.referralCode,
      sourcePath,
      subject: "hubungi_cs",
    });
    setShowContact(true);
  };

  const openWhatsapp = () => {
    if (!whatsappUrl) return;
    void trackReferralClient("whatsapp_click", {
      refCode: profile.referralCode,
      sourcePath,
      subject: "mitra_whatsapp",
    });
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const points = segment === "desa" ? desaValuePoints : pemdaValuePoints;

  return (
    <div className="min-h-[calc(100vh-80px)]">
      <section className="relative bg-linear-to-br from-[#0d9488] via-[#0f766e] to-[#0d9488] px-4 sm:px-6 lg:px-8 pt-28 pb-16 md:pt-36 md:pb-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto text-center text-white space-y-5">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30 text-sm">
              <Users className="w-4 h-4 text-[#fbbf24]" />
              Mitra Resmi Klandesa
            </span>
            {profile.region ? (
              <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full text-sm border border-white/20">
                <MapPin className="w-3.5 h-3.5" />
                {profile.region}
              </span>
            ) : null}
          </div>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight leading-tight">
            {headline}
          </h1>
          <p className="text-white/90 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
            {bio}
          </p>
          <p className="text-white/80 text-sm md:text-base">
            Diperkenalkan oleh{" "}
            <span className="font-semibold text-white">{profile.name}</span>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={openRegistration}
              className="inline-flex items-center justify-center gap-2 bg-white text-[#0f766e] px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all w-full sm:w-auto"
            >
              Daftar Sekarang
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              href="/demo"
              onClick={() =>
                void trackReferralClient("page_view", {
                  refCode: profile.referralCode,
                  sourcePath: `${sourcePath}#demo`,
                })
              }
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium border border-white/40 text-white hover:bg-white/10 transition-colors w-full sm:w-auto"
            >
              <Sparkles className="w-4 h-4" />
              Coba Demo
            </Link>
            {whatsappUrl ? (
              <button
                type="button"
                onClick={openWhatsapp}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium border border-white/40 text-white hover:bg-white/10 transition-colors w-full sm:w-auto"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp Mitra
              </button>
            ) : (
              <button
                type="button"
                onClick={openContact}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium border border-white/40 text-white hover:bg-white/10 transition-colors w-full sm:w-auto"
              >
                <MessageCircle className="w-4 h-4" />
                Hubungi CS
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 py-16 md:py-20 max-w-5xl mx-auto">
        <div className="text-center mb-8 space-y-2">
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">
            Solusi untuk desa dan pemda
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Pilih perspektif yang paling relevan — platform yang sama mendukung
            operasional harian desa sekaligus supervisi wilayah.
          </p>
        </div>
        <div className="flex justify-center gap-2 mb-8">
          <button
            type="button"
            onClick={() => setSegment("desa")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              segment === "desa"
                ? "bg-[#0d9488] text-white"
                : "border border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Untuk Desa
          </button>
          <button
            type="button"
            onClick={() => setSegment("pemda")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              segment === "pemda"
                ? "bg-[#0d9488] text-white"
                : "border border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Untuk Pemda
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {points.map((point) => (
            <div
              key={point.title}
              className="rounded-2xl border border-gray-200 p-6 bg-white"
            >
              <h3 className="font-semibold text-gray-900 mb-2">{point.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{point.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-16 md:pb-20 max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 text-center mb-8">
          Fitur unggulan Klandesa
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {featureHighlights.map((item, index) => {
            const Icon =
              index === 0
                ? ClipboardList
                : index === 1
                  ? ShieldCheck
                  : Sparkles;
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-200 p-6 bg-gray-50"
              >
                <Icon className="w-8 h-8 text-[#0d9488] mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {profile.acquiredVillageCount > 0 ? (
        <section className="px-4 sm:px-6 lg:px-8 pb-8 max-w-5xl mx-auto">
          <div className="rounded-2xl border border-[#0d9488]/20 bg-[#0d9488]/5 px-6 py-5 text-center">
            <p className="text-gray-800">
              <span className="font-semibold">{profile.name}</span> telah
              membantu{" "}
              <span className="font-semibold text-[#0f766e]">
                {profile.acquiredVillageCount} desa
              </span>{" "}
              menggunakan Klandesa.
            </p>
          </div>
        </section>
      ) : null}

      <section className="px-4 sm:px-6 lg:px-8 pb-16 md:pb-24 max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-10 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="space-y-3 max-w-xl">
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">
                Siap mulai?
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Jadwalkan demo, ajukan pendaftaran desa, atau hubungi mitra Anda
                langsung untuk diskusi kebutuhan wilayah.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <button
                type="button"
                onClick={openRegistration}
                className="inline-flex items-center justify-center gap-2 bg-linear-to-r from-[#0d9488] to-[#0f766e] text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all"
              >
                Daftar Sekarang
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                href="/platform"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-medium border border-gray-300 text-gray-800 hover:bg-gray-50 transition-colors"
              >
                Lihat fitur
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
