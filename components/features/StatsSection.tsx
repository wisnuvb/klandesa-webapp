import React from 'react';
import { Award, MapPin, TrendingUp, Users } from 'lucide-react';

interface StatsSectionProps {
  onRegisterClick: () => void;
}

export function StatsSection({ onRegisterClick }: StatsSectionProps) {
  const stats = [
    {
      icon: MapPin,
      number: '500+',
      label: 'Desa Terdaftar',
      color: 'bg-[#6366f1]',
    },
    {
      icon: TrendingUp,
      number: '50+',
      label: 'Kabupaten',
      color: 'bg-[#0d9488]',
    },
    {
      icon: Users,
      number: '100,000+',
      label: 'Pengguna Aktif',
      color: 'bg-[#f59e0b]',
    },
  ];

  return (
    <section
      id="statistik"
      className="relative py-20 md:py-32 bg-gradient-to-b from-white via-gray-50 to-white overflow-hidden"
    >
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#6366f1] rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#0d9488] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-[#f59e0b] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Dot Pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle, #0d9488 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        ></div>
      </div>

      {/* Decorative Lines */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#0d9488]/20 to-transparent"></div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#6366f1]/20 to-transparent"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-[#0d9488]/20 mb-4">
            <div className="w-2 h-2 bg-[#0d9488] rounded-full animate-pulse"></div>
            <span className="text-sm text-[#0d9488]">Data Real-Time</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl text-gray-900 mb-4 leading-tight">
            Statistik{' '}
            <span className="bg-gradient-to-r from-[#0d9488] to-[#6366f1] bg-clip-text text-transparent">
              Pengguna
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Dipercaya oleh ribuan desa di seluruh Indonesia
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center hover:shadow-2xl transition-all duration-500 hover:scale-105 border border-white overflow-hidden"
            >
              {/* Animated background gradient */}
              <div
                className={`absolute inset-0 ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
              ></div>

              {/* Decorative corner */}
              <div
                className={`absolute top-0 right-0 w-24 h-24 ${stat.color} opacity-5 rounded-bl-full`}
              ></div>

              {/* Icon with animated ring */}
              <div className="relative inline-flex mb-6">
                {/* Outer animated ring */}
                <div
                  className={`absolute inset-0 ${stat.color} rounded-full opacity-20 animate-ping`}
                ></div>

                {/* Icon container */}
                <div
                  className={`relative ${stat.color} w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}
                >
                  <stat.icon className="w-10 h-10 text-white" />
                </div>
              </div>

              {/* Number with gradient on hover */}
              <div className="relative">
                <div className="text-5xl md:text-6xl text-gray-900 mb-2 group-hover:scale-110 transition-transform duration-300">
                  {stat.number}
                </div>

                {/* Progress bar decoration */}
                <div className="w-20 h-1 bg-gray-200 rounded-full mx-auto mb-4 overflow-hidden">
                  <div
                    className={`h-full ${stat.color} rounded-full group-hover:w-full transition-all duration-1000 w-0`}
                  ></div>
                </div>

                <div className="text-lg text-gray-600 group-hover:text-gray-900 transition-colors">
                  {stat.label}
                </div>
              </div>

              {/* Growth indicator */}
              <div className="mt-4 inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
                <span>Terus Bertumbuh</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 bg-gradient-to-r from-[#0d9488]/10 via-[#6366f1]/10 to-[#f59e0b]/10 backdrop-blur-sm px-8 py-6 rounded-2xl border border-white shadow-lg">
            <div className="text-center sm:text-left">
              <p className="text-gray-900 mb-1">
                Ingin bergabung dengan mereka?
              </p>
              <p className="text-sm text-gray-600">
                Daftar sekarang dan rasakan kemudahan digitalisasi desa
              </p>
            </div>
            <button
              onClick={onRegisterClick}
              className="bg-gradient-to-r from-[#0d9488] to-[#0f766e] text-white px-6 py-3 rounded-xl hover:shadow-xl transition-all hover:scale-105 shadow-md whitespace-nowrap"
            >
              Daftar Sekarang
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
