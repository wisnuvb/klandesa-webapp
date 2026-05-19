import Link from 'next/link';
import React from 'react';
import { Database, Layers, Lightbulb, Users } from 'lucide-react';

export function AboutSection() {
  const features = [
    {
      icon: Layers,
      title: 'Layanan Terintegrasi',
      description:
        'Dari administrasi hingga kegiatan komunitas, Klandesa menyatukan berbagai aspek kehidupan desa dalam satu platform, meningkatkan transparansi, keterlibatan, dan pengelolaan yang lebih baik.',
      bgColor: 'bg-gradient-to-br from-purple-50 to-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-400',
    },
    {
      icon: Users,
      title: 'Ramah Pengguna',
      description:
        'Desain yang intuitif memungkinkan warga desa untuk dengan mudah mengakses layanan tanpa memerlukan keterampilan teknis khusus, memudahkan proses pelayanan dan partisipasi dalam kebijakan desa.',
      bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-400',
    },
    {
      icon: Database,
      title: 'Manajemen Data Terpadu',
      description:
        'Mendukung pemerintah desa dengan solusi manajemen data yang efektif, Klandesa memungkinkan pengambilan keputusan berbasis data yang lebih cerdas dan strategis.',
      bgColor: 'bg-gradient-to-br from-teal-50 to-teal-100',
      iconColor: 'text-teal-600',
      borderColor: 'border-teal-400',
    },
    {
      icon: Lightbulb,
      title: 'Solusi Lengkap & Praktis',
      description:
        'Dengan pendekatan yang modern dan inovatif, Klandesa merancang solusi praktis untuk melayani desa secara efektif, membawa desa menuju era baru pelayanan yang lebih efisien dan inklusif.',
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
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#0d9488]/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#6366f1]/5 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {/* Left Content - Description */}
          <div className="md:col-span-1 space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#0d9488]/10 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-[#0d9488] rounded-full animate-pulse"></div>
              <span className="text-sm text-[#0d9488]">Tentang Kami</span>
            </div>

            <h2 className="text-4xl md:text-5xl text-gray-900 leading-tight">
              Tentang{' '}
              <span className="bg-gradient-to-r from-[#0d9488] to-[#6366f1] bg-clip-text text-transparent">
                Klandesa
              </span>
            </h2>

            <p className="text-gray-600 leading-relaxed">
              Klandesa adalah inovasi terkini dalam layanan desa modern,
              menghadirkan solusi terpadu yang praktis dan mudah diakses oleh
              semua lapisan masyarakat. Kami bertujuan menyederhanakan proses
              layanan desa dengan pendekatan yang efisien, memudahkan warga
              dalam mendapatkan informasi dan pelayanan.
            </p>

            <p className="pt-2">
              <Link
                href="/tim"
                className="text-sm font-medium text-[#0d9488] hover:text-[#0f766e] hover:underline inline-flex items-center gap-1"
              >
                Kenali tim kami
                <span aria-hidden>→</span>
              </Link>
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="text-3xl text-[#0d9488] mb-1">500+</div>
                <div className="text-sm text-gray-600">Desa Aktif</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="text-3xl text-[#6366f1] mb-1">98%</div>
                <div className="text-sm text-gray-600">Kepuasan</div>
              </div>
            </div>
          </div>

          {/* Right Content - Feature Cards */}
          <div className="md:col-span-2 grid sm:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`${feature.bgColor} group relative p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border ${feature.borderColor} border-opacity-20`}
              >
                {/* Icon */}
                <div
                  className={`w-12 h-12 ${feature.iconColor} bg-white rounded-xl shadow-md flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className="w-6 h-6" />
                </div>

                <h3 className="text-xl mb-3 text-gray-900">{feature.title}</h3>

                <p className="text-gray-700 text-sm leading-relaxed">
                  {feature.description}
                </p>

                {/* Decorative corner */}
                <div
                  className={`absolute top-0 right-0 w-20 h-20 ${feature.iconColor} opacity-5 rounded-bl-full`}
                ></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
