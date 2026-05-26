"use client";

import { Shield, UsersRound, Layers } from "lucide-react";

export function GovernanceStrip() {
  return (
    <section className="py-14 md:py-18 bg-linear-to-br from-[#f8fafc] to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">
          Tata kelola terbaik untuk pemerintahan desa
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">RBAC peran desa</h3>
            <p className="text-sm text-gray-600">
              Admin desa, Kepala Desa, Sekretaris, dan staf mempunyai ruang akses
              berbeda; API utama dilindungi matriks permission terpusat.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Multi-lane</h3>
            <p className="text-sm text-gray-600">
              Jalur aplikasi untuk desa, koperasi, BUMDes, regional, serta admin
              platform terpisah agar tidak tercampur data maupun akses.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <UsersRound className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Keamanan cloud</h3>
            <p className="text-sm text-gray-600">
              Infrastruktur terkelola penyedia cloud pada layer transport dan
              storage standar industri—tanpa mengklaim kemampuan kriptografi tertentu
              kecuali disediakan secara terbuka di produk klien.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
