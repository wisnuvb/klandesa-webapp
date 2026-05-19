import Image from "next/image";
import React from "react";

export function KlandesaLogo() {
  return (
    <div className="flex items-center gap-3">
      {/* Logo Icon */}
      <Image
        src="/images/klandesa-logo.png"
        alt="Klandesa Logo"
        width={300}
        height={150}
        className="w-auto h-[30px] object-contain"
      />
    </div>
  );
}
