"use client";

import React from "react";
import { AppDialogProvider } from "@/components/providers/AppDialogProvider";
import { Footer } from "@/components/features/Footer";
import { LoginModal } from "@/components/features/LoginModal";
import { Navbar } from "@/components/features/Navbar";
import { RegistrationModal } from "@/components/features/RegistrationModal";
import { ContactModal } from "@/components/features/ContactModal";
import { WhatsAppButton } from "@/components/features/WhatsAppButton";
import { captureReferralFromUrl, trackReferralClient } from "@/lib/referrals/client";

// Create a context to share modal state across pages
const ModalContext = React.createContext<{
  setShowLogin: (show: boolean) => void;
  setShowRegistration: (show: boolean) => void;
  setShowContact: (show: boolean) => void;
} | null>(null);

export function useLandingModals() {
  const context = React.useContext(ModalContext);
  if (!context) {
    throw new Error("useLandingModals must be used within LandingLayout");
  }
  return context;
}

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showLogin, setShowLogin] = React.useState(false);
  const [showRegistration, setShowRegistration] = React.useState(false);
  const [showContact, setShowContact] = React.useState(false);

  React.useEffect(() => {
    captureReferralFromUrl();
  }, []);

  return (
    <ModalContext.Provider
      value={{
        setShowLogin,
        setShowRegistration,
        setShowContact,
      }}
    >
      <AppDialogProvider>
        <div className="min-h-screen bg-white">
        <Navbar
          onLoginClick={() => setShowLogin(true)}
          onRegisterClick={() => {
            void trackReferralClient("register_open");
            setShowRegistration(true);
          }}
        />
        {children}
        <Footer />
        <WhatsAppButton />

        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
        {showRegistration && (
          <RegistrationModal
            onClose={() => setShowRegistration(false)}
            onOpenLogin={() => {
              setShowRegistration(false);
              setShowLogin(true);
            }}
          />
        )}
        {showContact && <ContactModal onClose={() => setShowContact(false)} />}
        </div>
      </AppDialogProvider>
    </ModalContext.Provider>
  );
}
