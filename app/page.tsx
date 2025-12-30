"use client";

import React from "react";
import Head from "next/head";

import { AboutSection } from "@/components/features/AboutSection";
import { BenefitsSection } from "@/components/features/BenefitsSection";
import { ContactModal } from "@/components/features/ContactModal";
import { CTASection } from "@/components/features/CTASection";
import { Footer } from "@/components/features/Footer";
import { HeroSection } from "@/components/features/HeroSection";
import { LoginModal } from "@/components/features/LoginModal";
import { Navbar } from "@/components/features/Navbar";
import { RegistrationModal } from "@/components/features/RegistrationModal";
import { StatsSection } from "@/components/features/StatsSection";
import { WhatsAppButton } from "@/components/features/WhatsAppButton";
import {
  DESCRIPTION_WEB,
  LOGO_SINGLE_BIG,
  TITLE_WEB,
} from "@/utils/constants/seo";

export default function HomePage() {
  const [showLogin, setShowLogin] = React.useState(false);
  const [showRegistration, setShowRegistration] = React.useState(false);
  const [showContact, setShowContact] = React.useState(false);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://klandesa.id";
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

      <div className="min-h-screen bg-white">
        <Navbar onLoginClick={() => setShowLogin(true)} />
        <HeroSection onRegisterClick={() => setShowRegistration(true)} />
        <AboutSection />
        <BenefitsSection />
        <StatsSection onRegisterClick={() => setShowRegistration(true)} />
        <CTASection
          onRegisterClick={() => setShowRegistration(true)}
          onContactClick={() => setShowContact(true)}
        />
        <Footer />
        <WhatsAppButton />

        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
        {showRegistration && (
          <RegistrationModal onClose={() => setShowRegistration(false)} />
        )}
        {showContact && <ContactModal onClose={() => setShowContact(false)} />}
      </div>
    </>
  );
}
