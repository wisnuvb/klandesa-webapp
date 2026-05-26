import { Database, Landmark, Layers, Smartphone } from "lucide-react";

interface StatsSectionProps {
  onRegisterClick: () => void;
}

export function StatsSection({ onRegisterClick }: StatsSectionProps) {
  const stats = [
    {
      icon: Layers,
      number: "18",
      label: "Sasaran SDGs dibaca engine platform",
      color: "bg-[#6366f1]",
    },
    {
      icon: Landmark,
      number: "4",
      label: "Adapter export Kemendesa + log audit",
      color: "bg-[#0d9488]",
    },
    {
      icon: Database,
      number: "4",
      label: "Peran utama desa terikat RBAC (admin/pemimpin/sekdes/staff)",
      color: "bg-[#f59e0b]",
    },
    {
      icon: Smartphone,
      number: "100%",
      label: "Akses aplikasi daring responsif lintas layar",
      color: "bg-slate-600",
      note: "(tanpa aplikasi seluler tambahan dalam janji utama)",
    },
  ];

  return (
    <section
      id="statistik"
      className="relative py-20 md:py-32 bg-linear-to-b from-white via-gray-50 to-white overflow-hidden"
    >
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#6366f1] rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-[#0d9488]/20 mb-4">
            <span className="text-sm text-[#0d9488]">Komitmen produk</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl text-gray-900 mb-4 leading-tight">
            Fakta struktur{' '}
            <span className="bg-gradient-to-r from-[#0d9488] to-[#6366f1] bg-clip-text text-transparent">
              platformnya
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Kami mengganti angka &quot;dibuat-buat&quot; dengan indikator teknologi yang Anda dapat audit sendiri bersama demo.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center hover:shadow-2xl transition-all duration-500 hover:scale-105 border border-white overflow-hidden"
            >
              <div
                className={`relative w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg ${stat.color}`}
              >
                <stat.icon className="w-9 h-9 text-white" aria-hidden />
              </div>

              <div className="text-4xl md:text-5xl text-gray-900 mb-2 group-hover:scale-105 transition-transform duration-300">
                {stat.number}
              </div>

              <div className="text-base text-gray-600 group-hover:text-gray-900 transition-colors">
                {stat.label}
              </div>
              {"note" in stat && stat.note ? (
                <p className="text-xs text-gray-500 mt-3">{stat.note}</p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 bg-gradient-to-r from-[#0d9488]/10 via-[#6366f1]/10 to-[#f59e0b]/10 backdrop-blur-sm px-8 py-6 rounded-2xl border border-white shadow-lg">
            <div className="text-center sm:text-left">
              <p className="text-gray-900 mb-1">Siap mencocokannya dengan paket Anda?</p>
              <p className="text-sm text-gray-600">
                Tim kami akan memetakan modul live versus early access serta add-on penyimpanan &amp; absensi.
              </p>
            </div>
            <button
              type="button"
              onClick={onRegisterClick}
              className="bg-gradient-to-r from-[#0d9488] to-[#0f766e] text-white px-6 py-3 rounded-xl hover:shadow-xl transition-all hover:scale-105 shadow-md whitespace-nowrap cursor-pointer"
            >
              Jadwalkan konsultasi
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
