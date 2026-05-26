"use client";

import Link from 'next/link';
import React from 'react';
import { Database, Landmark, Layers, Rocket } from 'lucide-react';

export function AboutSection() {
  const features = [
    {
      icon: Layers,
      title: 'Rantai pembangunan',
      description:
        'Menghubungkan data warga/APBDes, RPJMDes, program lapangan seperti PKK & BUMDes, hingga skor SDGs 18 sasaran serta export format interoperability.',
      bgColor: 'bg-gradient-to-br from-purple-50 to-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-400',
    },
    {
      icon: Database,
      title: 'Governance akses nyata',
      description:
        'Role admin desa dibedakan dari Sekdes maupun kepala desa; API utama dilengkapi matriks permission sehingga setiap akses bisa dipertanggungjawabkan.',
      bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-400',
    },
    {
      icon: Landmark,
      title: 'Siap Pemda lintas wilayah',
      description:
        'Skenario monitoring kabupaten/kecamatan, export ke format Kemendesa, spasial pembangunan, tanpa mengharuskan akses sensitif secara manual ilegal pada setiap desa.',
      bgColor: 'bg-gradient-to-br from-teal-50 to-teal-100',
      iconColor: 'text-teal-600',
      borderColor: 'border-teal-400',
    },
    {
      icon: Rocket,
      title: 'Rilis modular & cepat berevolusi',
      description:
        'Lebih dari 30 struktur aplikasi mencakup inti administratif dan modul early access baru—marketing dan produk menggunakan registri sama agar konsisten.',
      bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-400',
    },
  ];

  return (
    <section
      id="tentang"
      className="relative py-20 md:py-32 bg-gradient-to-b from-white via-gray-50 to-white overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#0d9488]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#6366f1]/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          <div className="md:col-span-1 space-y-6">
            <div className="inline-flex items-center gap-2 bg-[#0d9488]/10 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-[#0d9488] rounded-full animate-pulse" />
              <span className="text-sm text-[#0d9488]">Tentang Kami</span>
            </div>

            <h2 className="text-4xl md:text-5xl text-gray-900 leading-tight">
              Mengapa{' '}
              <span className="bg-gradient-to-r from-[#0d9488] to-[#6366f1] bg-clip-text text-transparent">
                Klandesa?
              </span>
            </h2>

            <p className="text-gray-600 leading-relaxed">
              Kami bukan lagi sekadar formulir daring: Klandesa adalah stack produk bagi
              desa pemerintah yang kini harus menghubungkan operasional, perencanaan,
              serta pelaporan SDGs secara berkelanjutan.
            </p>

            <p className="pt-2">
              <Link
                href="/tim"
                className="text-sm font-medium text-[#0d9488] hover:text-[#0f766e] hover:underline inline-flex items-center gap-1"
              >
                Kenali tim pendiri Klandesa
                <span aria-hidden>→</span>
              </Link>
              {' '}·{' '}
              <Link
                href="/platform"
                className="text-sm font-medium text-[#6366f1] hover:underline inline-flex items-center gap-1"
              >
                Lihat katalog platform
              </Link>
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="text-2xl text-[#0d9488] mb-1">30+</div>
                <div className="text-sm text-gray-600">Struktur modul aplikasi</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="text-2xl text-[#6366f1] mb-1">18</div>
                <div className="text-sm text-gray-600">Sasaran dalam engine SDGs</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 grid sm:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`${feature.bgColor} group relative p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border ${feature.borderColor} border-opacity-20`}
              >
                <div
                  className={`w-12 h-12 ${feature.iconColor} bg-white rounded-xl shadow-md flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className="w-6 h-6" aria-hidden />
                </div>

                <h3 className="text-xl mb-3 text-gray-900">{feature.title}</h3>

                <p className="text-gray-700 text-sm leading-relaxed">
                  {feature.description}
                </p>

                <div
                  className={`absolute top-0 right-0 w-20 h-20 ${feature.iconColor} opacity-5 rounded-bl-full`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
