"use client";

import Link from "next/link";
import {
  BUILDING_NOTE,
  KEMENDESA_HUB_NOTE,
  listIntegrationAdapters,
} from "./integration-copy";

/** Ringkas untuk landing (empat adaptor). */
export function IntegrationStrip() {
  const adapters = listIntegrationAdapters();
  return (
    <section className="py-16 md:py-20 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Siap interoperability Kemendesa
            </h2>
            <p className="text-gray-600 mb-4">{BUILDING_NOTE}</p>
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              {KEMENDESA_HUB_NOTE}
            </p>
            <Link
              href="/platform/integrasi"
              className="text-[#0d9488] font-medium hover:underline"
            >
              Detail integrasi dan format ekspor →
            </Link>
          </div>
          <ul className="space-y-3">
            {adapters.map((a) => (
              <li
                key={a.id}
                className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
              >
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#0d9488]" />
                <div>
                  <div className="font-medium text-gray-900">{a.label}</div>
                  <div className="text-sm text-gray-600">{a.description}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
