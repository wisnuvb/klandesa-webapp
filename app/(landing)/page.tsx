"use client";

import React from "react";
import { AboutSection } from "@/components/features/AboutSection";
import { BenefitsSection } from "@/components/features/BenefitsSection";
import { CTASection } from "@/components/features/CTASection";
import { HeroSection } from "@/components/features/HeroSection";
import { StatsSection } from "@/components/features/StatsSection";
import { RegistrationModal } from "@/components/features/RegistrationModal";
import { ContactModal } from "@/components/features/ContactModal";

export default function HomePage() {
  const [showRegistration, setShowRegistration] = React.useState(false);
  const [showContact, setShowContact] = React.useState(false);

  return (
    <>

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
