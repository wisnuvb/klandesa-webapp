"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { LarasAvatar } from "@/components/ai/LarasAvatar";
import { AI_ASSISTANT_NAME } from "@/lib/ai/persona";
import { cn } from "@/components/ui/utils";

type LarasFabProps = {
  className?: string;
};

export function LarasFab({ className }: LarasFabProps) {
  return (
    <motion.div
      className={cn("fixed bottom-6 right-6 z-40", className)}
      initial={{ opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{
          duration: 3.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <Link
          href="/asisten-ai"
          aria-label={`Buka ${AI_ASSISTANT_NAME} — Asisten Desa AI`}
          title={`Tanya ${AI_ASSISTANT_NAME}`}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg shadow-teal-900/20 ring-4 ring-teal-100/80 transition-transform hover:scale-105 hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-teal-400/30 animate-ping [animation-duration:2.8s]"
          />
          <LarasAvatar
            size={40}
            className="relative ring-2 ring-white/90"
          />
          <span className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            Tanya {AI_ASSISTANT_NAME}
          </span>
        </Link>
      </motion.div>
    </motion.div>
  );
}
