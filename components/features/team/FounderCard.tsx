"use client";

import Image from "next/image";
import { motion } from "motion/react";

import type { Founder, FounderAccent } from "@/lib/team/founders";

const accentPlaceholderClass: Record<FounderAccent, string> = {
  teal: "from-[#0d9488] to-[#0f766e]",
  indigo: "from-[#6366f1] to-[#4f46e5]",
  amber: "from-[#fbbf24] to-[#f59e0b]",
};

const accentBadgeClass: Record<FounderAccent, string> = {
  teal: "bg-[#0d9488]/10 text-[#0f766e] border-[#0d9488]/25",
  indigo: "bg-[#6366f1]/10 text-[#4f46e5] border-[#6366f1]/25",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
};

type Props = {
  founder: Founder;
  index: number;
};

export function FounderCard({ founder, index }: Props) {
  const placeholderGradient = accentPlaceholderClass[founder.accent];
  const badgeStyle = accentBadgeClass[founder.accent];

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-[#0d9488] hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col"
    >
      <div className="relative aspect-4/5 overflow-hidden bg-gray-100">
        {founder.image ? (
          <Image
            src={founder.image}
            alt={founder.name}
            fill
            sizes="(max-width: 1024px) 100vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div
            className={`absolute inset-0 bg-linear-to-br ${placeholderGradient} flex items-center justify-center`}
          >
            <span className="text-5xl md:text-6xl font-semibold text-white/95 tracking-tight">
              {founder.initials}
            </span>
          </div>
        )}
      </div>

      <div className="p-6 md:p-7 flex flex-col flex-1 gap-3">
        <span
          className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium ${badgeStyle}`}
        >
          Co-founder
        </span>
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900 leading-snug">
          {founder.name}
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed flex-1">
          {founder.role}
        </p>
      </div>
    </motion.article>
  );
}
