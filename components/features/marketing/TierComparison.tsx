"use client";

import { Check, Minus } from "lucide-react";
import { MODULE_TIER_COMPARISON_ROWS } from "@/lib/modules/tier-marketing";

type TierCell = "yes" | "no" | "addon";

interface TierComparisonRow {
  capability: string;
  starter: TierCell;
  professional: TierCell;
  enterprise: TierCell;
  note?: string;
}

/** Layanan premium — pembeda harga & margin. */
const PREMIUM_ROWS: TierComparisonRow[] = [
  {
    capability: "Migrasi data awal dibantu tim teknis",
    starter: "yes",
    professional: "yes",
    enterprise: "yes",
  },
  {
    capability: "Pantau banyak desa (kabupaten/kecamatan)",
    starter: "yes",
    professional: "yes",
    enterprise: "yes",
  },
  {
    capability: "Pelatihan on-site & pendamping go-live",
    starter: "no",
    professional: "yes",
    enterprise: "yes",
  },
  {
    capability: "Branding portal (logo, warna, subdomain/domain)",
    starter: "no",
    professional: "yes",
    enterprise: "yes",
  },
  {
    capability: "Aplikasi seluler bermerek desa",
    starter: "no",
    professional: "yes",
    enterprise: "yes",
    note: "Profesional: shell bermerek desa. Enterprise: modul & alur bisa disesuaikan.",
  },
  {
    capability: "Dukungan prioritas (telepon + SLA lebih cepat)",
    starter: "no",
    professional: "no",
    enterprise: "yes",
  },
  {
    capability: "Integrasi SSO / sistem pemda & custom development",
    starter: "no",
    professional: "no",
    enterprise: "yes",
  },
  {
    capability: "SLA, engineer dedicated & review berkala",
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
          <Check className="w-5 h-5" aria-label="Termasuk" />
        </span>
      );
    case "addon":
      return (
        <span className="text-xs md:text-sm font-semibold text-amber-700">
          Add-on
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center justify-center rounded-full bg-gray-100 p-2 text-gray-400">
          <Minus className="w-5 h-5" aria-label="Tidak termasuk paket" />
        </span>
      );
  }
}

function ComparisonTable({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: TierComparisonRow[];
}) {
  return (
    <div className="rounded-3xl border border-gray-100 shadow-xl overflow-hidden bg-linear-to-br from-gray-50 to-white">
      <div className="px-6 py-4 border-b border-gray-100 bg-white">
        <h3 className="text-lg text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left border-collapse">
          <thead>
            <tr className="bg-gray-900/95 text-white text-sm uppercase tracking-wide">
              <th scope="col" className="px-4 md:px-6 py-4 font-semibold">
                Item
              </th>
              <th scope="col" className="px-4 md:px-6 py-4 text-center font-semibold">
                Starter
              </th>
              <th
                scope="col"
                className="px-4 md:px-6 py-4 text-center font-semibold bg-[#0d9488]/30"
              >
                Profesional
              </th>
              <th scope="col" className="px-4 md:px-6 py-4 text-center font-semibold">
                Enterprise
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.capability} className="border-t border-gray-100">
                <th
                  scope="row"
                  className="align-top px-4 md:px-6 py-4 md:py-5 text-sm md:text-base text-gray-900 font-medium bg-white"
                >
                  {row.capability}
                  {row.note ? (
                    <p className="mt-2 text-xs md:text-sm text-gray-500 font-normal">
                      {row.note}
                    </p>
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
    </div>
  );
}

export function TierComparison() {
  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-white border-y border-gray-100">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0d9488]">
            Perbandingan paket
          </p>
          <h2 className="text-3xl md:text-4xl text-gray-900">
            Modul inti di Starter — fitur lanjutan naik tier
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Operasional harian desa (administrasi, surat, portal warga, absensi)
            aktif sejak Starter. Modul perencanaan, keuangan, dan integrasi
            wilayah tersedia di paket lebih tinggi atau sebagai add-on bulanan.
          </p>
        </div>

        <ComparisonTable
          title="Modul platform Klandesa"
          subtitle="Selaras dengan pembatasan paket di aplikasi — ✓ termasuk, Add-on = langganan bulanan terpisah."
          rows={MODULE_TIER_COMPARISON_ROWS}
        />

        <ComparisonTable
          title="Layanan premium & skala"
          subtitle="Pembeda investasi dan margin layanan Klandesa."
          rows={PREMIUM_ROWS}
        />

        <p className="text-xs md:text-sm text-gray-600 text-center max-w-3xl mx-auto">
          <strong className="text-gray-900">Add-on terpisah:</strong> modul di
          luar paket (mis. Keuangan, SDGs, Peta), kuota arsip ekstra, absensi
          GPS, dan top-up kredit Asisten AI—bisa ditambahkan di paket manapun
          setelah konsultasi APBDes.
        </p>
      </div>
    </section>
  );
}
