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
};

export function TurnstileWidget({ onToken, className }: TurnstileWidgetProps) {
  const ref = React.useRef<TurnstileInstance | null>(null);
  const required = isTurnstileRequiredOnClient();
  const siteKey = getTurnstileSiteKey();

  React.useEffect(() => {
    if (!required) onToken(null);
  }, [onToken, required]);

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
