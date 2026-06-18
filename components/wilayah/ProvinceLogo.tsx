"use client";

import * as React from "react";

import { cn } from "@/components/ui/utils";
import { getProvinceLogoUrl } from "@/lib/wilayah/province-logo";

type Props = {
  kodeProvinsi: string;
  name?: string;
  size?: number;
  className?: string;
};

export function ProvinceLogo({
  kodeProvinsi,
  name,
  size = 32,
  className,
}: Props) {
  const [failed, setFailed] = React.useState(false);
  const src = getProvinceLogoUrl(kodeProvinsi, size);
  const initials = (name ?? kodeProvinsi).slice(0, 2).toUpperCase();

  if (!src || failed) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-teal-100 text-[10px] font-semibold text-teal-800",
          className,
        )}
        style={{ width: size, height: size }}
        aria-hidden
      >
        {initials}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name ? `Lambang ${name}` : ""}
      width={size}
      height={size}
      className={cn("shrink-0 rounded object-contain", className)}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
