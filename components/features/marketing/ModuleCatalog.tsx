"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { MarketingAudience, MarketingModuleItem } from "@/lib/marketing/modules";

type Props = { modules: MarketingModuleItem[] };

const AUDIENCE_FILTER: { id: "all" | MarketingAudience; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "desa", label: "Operasional desa" },
  { id: "pemda", label: "Lintas desa / pemda" },
  { id: "both", label: "Keduanya" },
];

export function ModuleCatalog({ modules }: Props) {
  const [q, setQ] = useState("");
  const [audience, setAudience] = useState<(typeof AUDIENCE_FILTER)[number]["id"]>(
    "all",
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return modules.filter((m) => {
      if (audience === "both" && m.audience !== "both") return false;
      if (audience === "desa" && m.audience === "pemda") return false;
      if (audience === "pemda" && m.audience === "desa") return false;
      if (!term) return true;
      return (
        m.label.toLowerCase().includes(term) ||
        m.marketingDescription.toLowerCase().includes(term) ||
        m.id.toLowerCase().includes(term)
      );
    });
  }, [modules, q, audience]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-12 md:py-16 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          Platform & modul
        </h1>
        <p className="text-gray-600 max-w-3xl">
          Daftar modul mengikuti produk aktual. Modul bertanda{" "}
          <span className="font-medium text-amber-800">Early Access</span> masih
          dalam tahap beta fitur di lingkungan desa.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <input
          type="search"
          placeholder="Cari modul…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30"
        />
        <div className="flex flex-wrap gap-2">
          {AUDIENCE_FILTER.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAudience(a.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                audience === a.id
                  ? "bg-[#0d9488] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((m) => (
          <article
            key={m.id}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-[#0d9488]/25 transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <h2 className="font-semibold text-gray-900">{m.label}</h2>
              {m.status === "beta" && (
                <span className="shrink-0 text-[10px] uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold tracking-wide">
                  Early Access
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              {m.marketingDescription}
            </p>
            {m.sdgGoals.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {m.sdgGoals.slice(0, 12).map((g) => (
                  <span
                    key={g}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 font-medium border border-teal-100"
                  >
                    SDG {g}
                  </span>
                ))}
                {m.sdgGoals.length > 12 && (
                  <span className="text-[10px] text-gray-500">+</span>
                )}
              </div>
            )}
            <div className="text-xs text-gray-500">
              Fokus utama:{" "}
              <span className="font-medium text-gray-700">
                {m.audience === "both"
                  ? "Desa & pemerintah daerah"
                  : m.audience === "pemda"
                    ? "Pemerintah daerah / agregasi"
                    : "Desa"}
              </span>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-500 py-12">Tidak ada modul yang cocok.</p>
      )}

      <div className="mt-14 flex flex-wrap gap-4 justify-center text-sm">
        <Link
          href="/platform/sdgs"
          className="text-[#0d9488] font-medium hover:underline"
        >
          ← Stack SDGs & RPJMDes
        </Link>
        <Link
          href="/platform/integrasi"
          className="text-[#0d9488] font-medium hover:underline"
        >
          Integrasi Kemendesa →
        </Link>
      </div>
    </div>
  );
}
