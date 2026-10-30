"use client";

import React from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import {
  getTurnstileSiteKey,
  isTurnstileRequiredOnClient,
} from "@/lib/turnstile-config";

type TurnstileWidgetProps = {
  onToken: (token: string | null) => void;
  className?: string;
  /**
   * Naikkan nilai ini setelah token dipakai (mis. login gagal). Token Turnstile hanya
   * berlaku satu kali; tanpa reset, percobaan kedua selalu ditolak server.
   */
  resetSignal?: number;
};

export function TurnstileWidget({
  onToken,
  className,
  resetSignal = 0,
}: TurnstileWidgetProps) {
  const ref = React.useRef<TurnstileInstance | null>(null);
  const required = isTurnstileRequiredOnClient();
  const siteKey = getTurnstileSiteKey();

  React.useEffect(() => {
    if (!required) onToken(null);
  }, [onToken, required]);

  React.useEffect(() => {
    if (resetSignal === 0) return;
    onToken(null);
    ref.current?.reset();
  }, [resetSignal, onToken]);

  if (!required || !siteKey) {
    return null;
  }

  return (
    <div className={className}>
      <Turnstile
        ref={ref}
        siteKey={siteKey}
        onSuccess={(token) => onToken(token)}
        onExpire={() => onToken(null)}
        onError={() => onToken(null)}
        options={{ theme: "auto", size: "normal" }}
      />
    </div>
  );
}

export function useTurnstileReset() {
  const ref = React.useRef<TurnstileInstance | null>(null);
  return ref;
}
