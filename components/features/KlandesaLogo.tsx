import Image from "next/image";
import { cn } from "../ui/utils";

interface KlandesaLogoProps {
  className?: string;
  variant?: "default" | "white";
}

export function KlandesaLogo({
  className,
  variant = "default",
}: KlandesaLogoProps) {
  const logoSrc =
    variant === "white"
      ? "/brand/klandesa-logo-white.svg"
      : "/brand/klandesa-logo.svg";

  return (
    <div className="flex items-center gap-3">
      <Image
        src={logoSrc}
        alt="Klandesa Logo"
        width={844}
        height={160}
        className={cn("w-auto h-[34px] object-contain", className)}
      />
    </div>
  );
}
