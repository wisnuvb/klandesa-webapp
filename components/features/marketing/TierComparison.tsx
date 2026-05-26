"use client";

import { Check, Minus } from "lucide-react";
import { EARLY_ACCESS_LABEL } from "@/lib/marketing/copy";

type TierCell = "yes" | "no" | "addon" | "early";

interface TierComparisonRow {
  capability: string;
  starter: TierCell;
  professional: TierCell;
  enterprise: TierCell;
  note?: string;
}

const ROWS: TierComparisonRow[] = [
  {
    capability: "Administrasi desa inti",
    starter: "yes",
    professional: "yes",
    enterprise: "yes",
  },
  {
    capability: "Portal warga & permohonan surat",
    starter: "yes",
    professional: "yes",
    enterprise: "yes",
  },
  {
    capability: "Keuangan & penanda belanja per tujuan SDGs",
    starter: "no",
    professional: "early",
    enterprise: "early",
    note: "Tersedia di paket Profesional/Enterprise untuk desa yang ikut program akses awal.",
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
    note: "Paket Starter bisa menambah fitur ini; paket Profesional dibuka bertahap per wilayah.",
  },
  {
    capability: "Unduhan format Kemendesa + catatan riwayat",
    starter: "no",
    professional: "no",
    enterprise: "early",
    note:
      "Unduh data dalam format standar—bukan janji sinkron otomatis ke sistem pusat tanpa akses resmi.",
  },
  {
    capability: "Peta wilayah & Asisten AI",
    starter: "no",
    professional: "addon",
    enterprise: "early",
    note: "Bisa ditambahkan di paket Profesional; paket Enterprise menggabungkannya untuk pilot wilayah.",
  },
  {
    capability: "Pantau banyak desa (kabupaten/kecamatan)",
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
        <span className="text-xs md:text-sm font-semibold text-amber-700">
          Tambahan
        </span>
      );
    case "early":
      return (
        <span className="inline-flex items-center rounded-full border border-[#6366f1]/40 bg-[#6366f1]/10 px-2.5 py-1 text-[11px] font-semibold text-[#4338ca]">
          {EARLY_ACCESS_LABEL}
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
            Perbandingan paket
          </p>
          <h2 className="text-3xl md:text-4xl text-gray-900">
            Apa yang termasuk untuk tiap jenjang paket?
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Tanpa angka rupiah di website—tim kami menjelaskan fitur yang sudah siap pakai,
            yang masih akses awal, dan opsi tambahan penyimpanan atau absensi sesuai APBDes Anda.
          </p>
        </div>

        <div className="rounded-3xl border border-gray-100 shadow-xl overflow-hidden bg-linear-to-br from-gray-50 to-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left border-collapse">
              <thead>
                <tr className="bg-gray-900/95 text-white text-sm uppercase tracking-wide">
                  <th scope="col" className="px-4 md:px-6 py-4 font-semibold">
                    Fitur
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
            <strong className="text-gray-900">Legenda:</strong> tanda ✓ = termasuk paket; badge{" "}
            <span className="font-semibold text-[#4338ca]">{EARLY_ACCESS_LABEL}</span> = fitur uji coba
            dibuka bertahap; <em>Tambahan</em> = bisa diaktifkan dengan biaya terpisah setelah konsultasi.
          </div>
        </div>
      </div>
    </section>
  );
}
