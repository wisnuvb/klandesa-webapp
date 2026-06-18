import Image from "next/image";
import { cn } from "@/components/ui/utils";
import { AI_ASSISTANT_AVATAR_SRC, AI_ASSISTANT_NAME } from "@/lib/ai/persona";

type LarasAvatarProps = {
  size?: number;
  className?: string;
};

export function LarasAvatar({ size = 32, className }: LarasAvatarProps) {
  return (
    <Image
      src={AI_ASSISTANT_AVATAR_SRC}
      alt={AI_ASSISTANT_NAME}
      width={size}
      height={size}
      className={cn("rounded-full shrink-0", className)}
      priority={size >= 48}
    />
  );
}
