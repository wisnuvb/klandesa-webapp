"use client";

import React, { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { getEffectiveReferralCode, trackReferralClient } from "@/lib/referrals/client";

function WhatsAppButtonInner() {
  const phone = "6282320337777";
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const refParam = searchParams.get("ref");

  const referralCode = React.useMemo(
    () => getEffectiveReferralCode(refParam),
    [refParam],
  );

  const sourcePath = React.useMemo(() => {
    const q = searchParams.toString();
    return q ? `${pathname}?${q}` : pathname;
  }, [pathname, searchParams]);

  const href = `https://wa.me/${phone}?text=${encodeURIComponent(
    `Halo, saya ingin bertanya tentang Klandesa${referralCode ? ` (ref: ${referralCode})` : ""}`,
  )}`;

  return (
    <div className="fixed bottom-6 right-6 z-50 group">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() =>
          void trackReferralClient("whatsapp_click", {
            refCode: getEffectiveReferralCode(refParam),
            phone,
            subject: "hubungi_cs_whatsapp",
            sourcePath,
            metadata: {
              destination: "cs_whatsapp",
              channel: "landing_whatsapp_float",
              waTarget: phone,
            },
          })
        }
        className="flex items-center justify-center bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:bg-[#20ba5a] transition-all hover:scale-110 relative"
        aria-label="Hubungi kami via WhatsApp"
      >
        {/* Ping animation */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-75"></span>
        <MessageCircle className="w-6 h-6 relative z-10" />
      </a>

      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap pointer-events-none shadow-lg">
        <span>Hubungi kami via WhatsApp</span>
        {/* Arrow */}
        <div className="absolute top-full right-4 -mt-1">
          <div className="border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    </div>
  );
}

export function WhatsAppButton() {
  return (
    <Suspense fallback={null}>
      <WhatsAppButtonInner />
    </Suspense>
  );
}
