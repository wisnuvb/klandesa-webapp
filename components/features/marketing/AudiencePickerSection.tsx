"use client";

import Link from "next/link";
import { Building2, Handshake, Landmark } from "lucide-react";

export function AudiencePickerSection() {
  const cards = [
    {
      href: "/solusi/desa",
      icon: Building2,
      title: "Untuk Desa",
      desc: "Operasional harian, program warga, SDGs dari data nyata satu desa.",
    },
    {
      href: "/solusi/pemerintah-daerah",
      icon: Landmark,
      title: "Pemerintah Daerah",
      desc: "Tata kelola lintas desa, pelaporan SDGs Desa, dan interoperabilitas data.",
    },
    {
      href: "/mitra-klandesa",
      icon: Handshake,
      title: "Program Mitra",
      desc: "Skala digitalisasi desa bersama struktur paket Starter–Enterprise.",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Untuk Siapa{" "}
            <span className="bg-linear-to-r from-[#0d9488] to-[#6366f1] bg-clip-text text-transparent">
              Klandesa?
            </span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Satu platform, tiga cara memakai narasi sesuai peran Anda.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {cards.map(({ href, icon: Icon, title, desc }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border border-gray-200 bg-linear-to-br from-gray-50 to-white p-6 shadow-sm hover:border-[#0d9488]/40 hover:shadow-lg transition-all"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0d9488]/10 text-[#0d9488] mb-4 group-hover:scale-105 transition-transform">
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              <span className="mt-4 inline-block text-sm font-medium text-[#0d9488]">
                Selengkapnya →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
