import { FOUNDERS } from "@/lib/team/founders";

import { FounderCard } from "./FounderCard";

export function FoundersSection() {
  return (
    <>
      <section className="bg-gray-50 py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 leading-relaxed text-base md:text-lg">
            Arsitektur platform yang tangguh, jejaring institusi dan komunikasi
            publik yang memperlancar adopsi, serta pengalaman web yang mulus
            untuk warga dan perangkat desa — ketiganya bekerja sama agar
            digitalisasi desa tidak berhenti di aplikasi, tetapi hidup di
            lapangan.
          </p>
        </div>
      </section>

      <section className="bg-white py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 md:mb-14">
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-3">
              Founder{" "}
              <span className="bg-linear-to-r from-[#0d9488] to-[#6366f1] bg-clip-text text-transparent">
                Klandesa
              </span>
            </h2>
            <p className="text-gray-600">
              Tiga pendiri yang membawa visi yang sama: desa yang lebih
              transparan, efisien, dan dekat dengan warganya.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
            {FOUNDERS.map((founder, index) => (
              <FounderCard key={founder.id} founder={founder} index={index} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
