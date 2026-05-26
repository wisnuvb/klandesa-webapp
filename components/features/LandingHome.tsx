"use client";

import React from "react";

import { AboutSection } from "@/components/features/AboutSection";
import { BenefitsSection } from "@/components/features/BenefitsSection";
import { CTASection } from "@/components/features/CTASection";
import { HeroSection } from "@/components/features/HeroSection";
import { StatsSection } from "@/components/features/StatsSection";
import { RegistrationModal } from "@/components/features/RegistrationModal";
import { ContactModal } from "@/components/features/ContactModal";

import { AudiencePickerSection } from "@/components/features/marketing/AudiencePickerSection";
import { GovernanceStrip } from "@/components/features/marketing/GovernanceStrip";
import { IntegrationStrip } from "@/components/features/marketing/IntegrationStrip";
import { ModuleHighlightStrip } from "@/components/features/marketing/ModuleHighlightStrip";
import { PilotSpotlightSection } from "@/components/features/marketing/PilotSpotlightSection";
import { ProductShowcaseSection } from "@/components/features/marketing/ProductShowcaseSection";
import { SdgsValueChainSection } from "@/components/features/marketing/SdgsValueChainSection";

import type { MarketingModuleItem } from "@/lib/marketing/modules";
import { trackReferralClient } from "@/lib/referrals/client";

export function LandingHome({
  flagshipModules,
}: {
  flagshipModules: MarketingModuleItem[];
}) {
  const [showRegistration, setShowRegistration] = React.useState(false);
  const [showContact, setShowContact] = React.useState(false);

  const openRegistration = () => {
    void trackReferralClient("register_open");
    setShowRegistration(true);
  };

  const openContact = () => {
    void trackReferralClient("contact_open", { subject: "hubungi_cs" });
    setShowContact(true);
  };

  return (
    <>
      <HeroSection
        onRegisterClick={openRegistration}
        onContactClick={openContact}
      />
      <AudiencePickerSection />
      <SdgsValueChainSection />
      <ModuleHighlightStrip modules={flagshipModules} />
      <IntegrationStrip />
      <ProductShowcaseSection />
      <PilotSpotlightSection />
      <AboutSection />
      <BenefitsSection />
      <GovernanceStrip />
      <StatsSection onRegisterClick={openRegistration} />
      <CTASection
        onRegisterClick={openRegistration}
        onContactClick={openContact}
      />

      {showRegistration && (
        <RegistrationModal onClose={() => setShowRegistration(false)} />
      )}
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
    </>
  );
}
