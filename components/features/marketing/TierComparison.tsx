"use client";

import { Check, Minus } from "lucide-react";

type TierCell = "yes" | "no" | "addon";

interface TierComparisonRow {
  capability: string;
  starter: TierCell;
  professional: TierCell;
  enterprise: TierCell;
  note?: string;
}

/** Modul platform — sama di semua paket (strategi go-to-market). */
const PLATFORM_ROWS: TierComparisonRow[] = [
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
    starter: "yes",
    professional: "yes",
    enterprise: "yes",
  },
  {
    capability: "Dashboard SDGs & RPJMDes",
    starter: "yes",
    professional: "yes",
    enterprise: "yes",
  },
  {
    capability: "Program PKK & BUMDes",
    starter: "yes",
    professional: "yes",
    enterprise: "yes",
  },
  {
    capability: "Unduhan format Kemendesa + catatan riwayat",
    starter: "yes",
    professional: "yes",
    enterprise: "yes",
    note: "Ekspor data standar—bukan janji sinkron otomatis ke sistem pusat tanpa akses resmi.",
  },
  {
    capability: "Peta wilayah & Asisten AI",
    starter: "yes",
    professional: "yes",
    enterprise: "yes",
  },
];

/** Layanan premium — pembeda harga & margin. */
const PREMIUM_ROWS: TierComparisonRow[] = [
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
    capability: "Migrasi data awal dibantu tim teknis",
    starter: "no",
    professional: "yes",
    enterprise: "yes",
  },
  {
    capability: "Dukungan prioritas (telepon + SLA lebih cepat)",
    starter: "no",
    professional: "yes",
    enterprise: "yes",
  },
  {
    capability: "Pantau banyak desa (kabupaten/kecamatan)",
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
            Platform sama — layanan premium yang naik tier
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Modul inti Klandesa tersedia di semua paket agar desa bisa langsung
            go-live. Paket lebih tinggi menambah pendampingan, branding, aplikasi
            mobile, dan skala wilayah—bukan mengunci fitur operasional harian.
          </p>
        </div>

        <ComparisonTable
          title="Platform Klandesa (semua paket)"
          subtitle="Modul operasional desa—aktif sejak Starter."
          rows={PLATFORM_ROWS}
        />

        <ComparisonTable
          title="Layanan premium & skala"
          subtitle="Pembeda investasi dan margin layanan Klandesa."
          rows={PREMIUM_ROWS}
        />

        <p className="text-xs md:text-sm text-gray-600 text-center max-w-3xl mx-auto">
          <strong className="text-gray-900">Add-on terpisah:</strong> kuota arsip
          ekstra, absensi GPS, top-up kredit Asisten AI—bisa ditambahkan di paket
          manapun setelah konsultasi APBDes.
        </p>
      </div>
    </section>
  );
}
