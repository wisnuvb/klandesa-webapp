"use client";

import React from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

type TurnstileWidgetProps = {
  onToken: (token: string | null) => void;
  className?: string;
};

export function TurnstileWidget({ onToken, className }: TurnstileWidgetProps) {
  const ref = React.useRef<TurnstileInstance | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();

  React.useEffect(() => {
    if (!siteKey) onToken(null);
  }, [onToken, siteKey]);

  if (!siteKey) {
    if (process.env.NODE_ENV === "development") {
      return (
        <p className="text-xs text-muted-foreground">
          Turnstile nonaktif (NEXT_PUBLIC_TURNSTILE_SITE_KEY kosong).
        </p>
      );
    }
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
