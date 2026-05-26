"use client";

import { Check, Minus } from "lucide-react";

type TierCell = "yes" | "no" | "addon" | "early";

interface TierComparisonRow {
  capability: string;
  starter: TierCell;
  professional: TierCell;
  enterprise: TierCell;
  note?: string;
}

/**
 * Matriks modul vs tier tanpa nominal harga — selaras pola konsultatif sales.
 */
const ROWS: TierComparisonRow[] = [
  {
    capability: "Core administrasi desa",
    starter: "yes",
    professional: "yes",
    enterprise: "yes",
  },
  {
    capability: "Portal warga & alur permohonan surat",
    starter: "yes",
    professional: "yes",
    enterprise: "yes",
  },
  {
    capability: "Keuangan & tagging belanja pada sasaran SDG",
    starter: "no",
    professional: "early",
    enterprise: "early",
    note: "Termasuk struktur tagging di bundel Profesi/Enterprise untuk early adopters.",
  },
  {
    capability: "Dashboard SDGs & RPJMDes",
    starter: "no",
    professional: "early",
    enterprise: "early",
  },
  {
    capability: "Program PKK & BUMDes",
    starter: "addon",
    professional: "early",
    enterprise: "yes",
    note: "Starter dapat aktivasi bertahap sebagai add-on; Profesional saat roadmap early access dibuka.",
  },
  {
    capability: "Adapter export & log audit integrasi Kemendesa",
    starter: "no",
    professional: "no",
    enterprise: "early",
    note:
      "Fokus export schema yang sudah dokumentasikan bersama Anda—bukan janji sinkron real-time ilegal tanpa akses sistim resmi.",
  },
  {
    capability: "GIS lingkungan & asisten AI",
    starter: "no",
    professional: "addon",
    enterprise: "early",
    note:
      "Modul sensitif wilayah & AI bisa ditambahkan di Profesi; Enterprise membundel akses eksploratif terkontrol.",
  },
  {
    capability: "Lane regional / multi-desa",
    starter: "no",
    professional: "no",
    enterprise: "yes",
  },
];

function TierCellBadge({ tier }: { tier: TierCell }) {
  switch (tier) {
    case "yes":
      return (
        <span className="inline-flex items-center justify-center rounded-full bg-[#0d9488]/10 p-2 text-[#0d9488]">
          <Check className="w-5 h-5" aria-label="Termasuk dalam paket" />
        </span>
      );
    case "addon":
      return (
        <span className="text-xs md:text-sm font-semibold uppercase tracking-wide text-amber-700">
          Add-on
        </span>
      );
    case "early":
      return (
        <span className="inline-flex items-center rounded-full border border-[#6366f1]/40 bg-[#6366f1]/10 px-2.5 py-1 text-[11px] font-semibold text-[#4338ca]">
          Early access
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center justify-center rounded-full bg-gray-100 p-2 text-gray-400">
          <Minus className="w-5 h-5" aria-label="Belum dalam lingkup paket" />
        </span>
      );
  }
}

export function TierComparison() {
  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-white border-y border-gray-100">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 md:mb-12 space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0d9488]">
            Pemetaan modul tanpa nominal
          </p>
          <h2 className="text-3xl md:text-4xl text-gray-900">
            Apa yang termasuk untuk tiap jenjang paket?
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Tidak ada angka rupiah publik — tim kami memetakan modul hidup versus early access,
            serta add-on penyimpanan &amp; presensi bersama struktur APBDes Anda.
          </p>
        </div>

        <div className="rounded-3xl border border-gray-100 shadow-xl overflow-hidden bg-linear-to-br from-gray-50 to-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left border-collapse">
              <thead>
                <tr className="bg-gray-900/95 text-white text-sm uppercase tracking-wide">
                  <th scope="col" className="px-4 md:px-6 py-4 font-semibold">
                    Kemampuan
                  </th>
                  <th scope="col" className="px-4 md:px-6 py-4 text-center font-semibold">
                    Starter
                  </th>
                  <th scope="col" className="px-4 md:px-6 py-4 text-center font-semibold bg-[#0d9488]/30">
                    Profesional
                  </th>
                  <th scope="col" className="px-4 md:px-6 py-4 text-center font-semibold">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.capability} className="border-t border-gray-100">
                    <th
                      scope="row"
                      className="align-top px-4 md:px-6 py-4 md:py-5 text-sm md:text-base text-gray-900 font-medium bg-white"
                    >
                      {row.capability}
                      {row.note ? (
                        <p className="mt-2 text-xs md:text-sm text-gray-500 font-normal">{row.note}</p>
                      ) : null}
                    </th>
                    <td className="align-top px-4 md:px-6 py-4 md:py-5 text-center">
                      <div className="flex justify-center">
                        <TierCellBadge tier={row.starter} />
                      </div>
                    </td>
                    <td className="align-top px-4 md:px-6 py-4 md:py-5 text-center bg-[#0d9488]/5 border-x border-[#0d9488]/10">
                      <div className="flex justify-center">
                        <TierCellBadge tier={row.professional} />
                      </div>
                    </td>
                    <td className="align-top px-4 md:px-6 py-4 md:py-5 text-center">
                      <div className="flex justify-center">
                        <TierCellBadge tier={row.enterprise} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-white/80 backdrop-blur text-xs md:text-sm text-gray-600 border-t border-gray-100">
            <strong className="text-gray-900">Legenda:</strong> tanda ✓ menyatakan inclusi utama; badge{" "}
            <span className="font-semibold text-[#4338ca]">Early access</span> menjelaskan jalur pra-GA atau beta
            bergantung kesiapan wilayah; opsi tambahan bermuatan komersial dijabarkan pada call konsultatif.
          </div>
        </div>
      </div>
    </section>
  );
}
