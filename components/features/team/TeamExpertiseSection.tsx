"use client";

import { Code2, Globe, Network } from "lucide-react";
import { motion } from "motion/react";

const pillars = [
  {
    icon: Code2,
    title: "Platform & skalabilitas",
    description:
      "Menjamin fondasi teknis yang kuat sehingga layanan desa tetap stabil saat data dan pengguna bertumbuh.",
    bgColor: "bg-teal-50",
    iconColor: "text-teal-600",
    borderColor: "border-teal-100",
  },
  {
    icon: Network,
    title: "Relasi & adopsi desa",
    description:
      "Menjembatani pemangku kepentingan agar transformasi digital dipahami, dipercaya, dan dipakai nyata di komunitas.",
    bgColor: "bg-indigo-50",
    iconColor: "text-indigo-600",
    borderColor: "border-indigo-100",
  },
  {
    icon: Globe,
    title: "Pengalaman digital warga",
    description:
      "Menyederhanakan antarmuka dan alur sehingga layanan online benar-benar ramah untuk semua kalangan.",
    bgColor: "bg-amber-50",
    iconColor: "text-amber-700",
    borderColor: "border-amber-100",
  },
];

export function TeamExpertiseSection() {
  return (
    <section className="relative py-14 md:py-20 bg-linear-to-b from-gray-50 via-white to-gray-50 overflow-hidden">
      <div className="absolute top-12 right-0 w-72 h-72 bg-[#0d9488]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 left-0 w-72 h-72 bg-[#6366f1]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-sm font-medium text-[#0d9488]">
            Keahlian tim
          </span>
          <h2 className="mt-2 text-3xl md:text-4xl font-semibold text-gray-900">
            Yang kami bawa ke setiap desa
          </h2>
          <p className="mt-3 text-gray-600">
            Kombinasi keahlian ini membentuk produk yang tidak hanya canggih di
            backend, tetapi juga relevan dan mudah dijangkau di lapangan.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {pillars.map((pillar, index) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: index * 0.06 }}
              className={`${pillar.bgColor} rounded-2xl border ${pillar.borderColor} p-6 md:p-8 shadow-sm hover:shadow-md hover:border-[#0d9488]/40 transition-all duration-300`}
            >
              <div
                className={`w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-5 ${pillar.iconColor}`}
              >
                <pillar.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {pillar.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {pillar.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
