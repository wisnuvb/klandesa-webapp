"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { badgeLabelForStatus } from "@/lib/marketing/modules";
import type { MarketingModuleItem } from "@/lib/marketing/modules";

type Props = {
  modules: MarketingModuleItem[];
  showAllHref?: string;
};

export function ModuleHighlightStrip({
  modules,
  showAllHref = "/platform",
}: Props) {
  return (
    <section className="py-16 md:py-20 bg-linear-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Fitur unggulan
            </h2>
            <p className="text-gray-600 max-w-xl">
              Fitur yang paling sering jadi alasan desa dan pemda memilih Klandesa—dari
              operasional harian, perencanaan SDGs, hingga unduhan format Kemendesa.
            </p>
          </div>
          <Link
            href={showAllHref}
            className="inline-flex items-center gap-2 text-[#0d9488] font-medium hover:underline shrink-0"
          >
            Lihat semua modul
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-[#0d9488]/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 text-sm leading-snug">
                  {m.label}
                </h3>
                {m.status === "beta" && (
                  <span className="shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-medium">
                    {badgeLabelForStatus(m.status)}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 line-clamp-3 mb-3">
                {m.marketingDescription}
              </p>
              <Link
                href="/platform"
                className="text-xs font-medium text-[#0d9488] hover:underline"
              >
                Detail →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
