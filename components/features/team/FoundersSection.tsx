import { FOUNDERS } from "@/lib/team/founders";

import { FounderCard } from "./FounderCard";

export function FoundersSection() {
  return (
    <>
      <section className="bg-gray-50 py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 leading-relaxed text-base md:text-lg">
            Klandesa dibangun dengan satu keyakinan: digitalisasi desa tidak
            boleh berhenti di aplikasi. Platform yang tangguh, mudah diadopsi,
            dan mulus bagi warga maupun perangkat desa, agar manfaatnya hidup
            di lapangan.
          </p>
        </div>
      </section>

      <section className="bg-white py-12 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-3">
              Founder Klandesa
            </h2>
            <p className="text-gray-600">
              Dibangun dengan visi desa yang lebih transparan, efisien, dan
              dekat dengan warganya.
            </p>
          </div>

          <div className="space-y-6">
            {FOUNDERS.map((founder) => (
              <FounderCard key={founder.id} founder={founder} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
