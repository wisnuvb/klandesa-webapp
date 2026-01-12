"use client";

import React from "react";
import Head from "next/head";
import { AboutSection } from "@/components/features/AboutSection";
import { BenefitsSection } from "@/components/features/BenefitsSection";
import { CTASection } from "@/components/features/CTASection";
import { HeroSection } from "@/components/features/HeroSection";
import { StatsSection } from "@/components/features/StatsSection";
import {
  DESCRIPTION_WEB,
  LOGO_SINGLE_BIG,
  TITLE_WEB,
} from "@/utils/constants/seo";
import { RegistrationModal } from "@/components/features/RegistrationModal";
import { ContactModal } from "@/components/features/ContactModal";

export default function HomePage() {
  const [showRegistration, setShowRegistration] = React.useState(false);
  const [showContact, setShowContact] = React.useState(false);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://klandesa.com";
  const pageUrl = `${siteUrl}/`;
  const ogImage = `${siteUrl}${LOGO_SINGLE_BIG}`;

  return (
    <>
      <Head>
        <title>{TITLE_WEB}</title>
        <meta name="description" content={DESCRIPTION_WEB} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={pageUrl} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={TITLE_WEB} />
        <meta property="og:description" content={DESCRIPTION_WEB} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={ogImage} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE_WEB} />
        <meta name="twitter:description" content={DESCRIPTION_WEB} />
        <meta name="twitter:image" content={ogImage} />

        <meta name="theme-color" content="#0d9488" />
      </Head>

      <HeroSection onRegisterClick={() => setShowRegistration(true)} />
      <AboutSection />
      <BenefitsSection />
      <StatsSection onRegisterClick={() => setShowRegistration(true)} />
      <CTASection
        onRegisterClick={() => setShowRegistration(true)}
        onContactClick={() => setShowContact(true)}
      />

      {showRegistration && (
        <RegistrationModal onClose={() => setShowRegistration(false)} />
      )}

      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
    </>
  );
}
