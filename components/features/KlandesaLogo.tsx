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
      ? "/images/klandesa-logo-white.png"
      : "/images/klandesa-logo.png";

  return (
    <div className="flex items-center gap-3">
      <Image
        src={logoSrc}
        alt="Klandesa Logo"
        width={300}
        height={150}
        className={cn("w-auto h-[30px] object-contain", className)}
      />
    </div>
  );
}
