"use client";

import { useState } from "react";
import { PageStatus, InlinePageStatus, FullPageStatus } from "./PageStatus";

/**
 * Contoh Penggunaan Komponen PageStatus
 *
 * Komponen ini menyediakan 3 varian:
 * 1. PageStatus - Banner status (default)
 * 2. InlinePageStatus - Badge status compact
 * 3. FullPageStatus - Full page status overlay
 */

export default function PageStatusExample() {
  const [showDismissible, setShowDismissible] = useState(true);

  return (
    <div className="space-y-12 p-8 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          PageStatus Component Examples
        </h1>
        <p className="text-gray-600 mb-8">
          Contoh penggunaan komponen status halaman yang dapat digunakan di
          seluruh aplikasi
        </p>
      </div>

      {/* Basic Usage Examples */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          1. Basic Banner Status
        </h2>
        <div className="space-y-4">
          <PageStatus type="development" />

          <PageStatus type="maintenance" />

          <PageStatus type="coming-soon" />

          <PageStatus type="beta" />

          <PageStatus type="warning" />

          <PageStatus type="info" />

          <PageStatus type="locked" />

          <PageStatus type="success" />

          <PageStatus type="experimental" />
        </div>
      </section>

      {/* Custom Messages */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          2. Custom Title & Message
        </h2>
        <div className="space-y-4">
          <PageStatus
            type="development"
            title="Fitur Absensi Sedang Dikembangkan"
            message="Kami sedang mengembangkan fitur absensi dengan GPS tracking dan QR code. Estimasi selesai: Januari 2024."
          />

          <PageStatus
            type="warning"
            title="Data Akan Dihapus"
            message="Semua data yang tidak tersimpan akan hilang jika Anda meninggalkan halaman ini."
          />
        </div>
      </section>

      {/* Different Sizes */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Sizes</h2>
        <div className="space-y-4">
          <PageStatus
            type="info"
            size="sm"
            title="Small Size"
            message="Compact banner untuk ruang terbatas"
          />

          <PageStatus
            type="info"
            size="md"
            title="Medium Size (Default)"
            message="Ukuran standar untuk kebanyakan kasus"
          />

          <PageStatus
            type="info"
            size="lg"
            title="Large Size"
            message="Banner yang lebih besar untuk penekanan"
          />

          <PageStatus
            type="info"
            size="full"
            title="Full Size"
            message="Banner maksimal untuk halaman penting"
          />
        </div>
      </section>

      {/* With Children */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          4. With Custom Content
        </h2>
        <PageStatus
          type="coming-soon"
          title="Fitur Premium Segera Hadir"
          message="Daftarkan email Anda untuk mendapatkan notifikasi saat fitur ini tersedia."
        >
          <div className="flex gap-2 mt-3">
            <input
              type="email"
              placeholder="email@example.com"
              className="flex-1 px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
              Notify Me
            </button>
          </div>
        </PageStatus>
      </section>

      {/* Dismissible */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          5. Dismissible
        </h2>
        {showDismissible ? (
          <PageStatus
            type="info"
            title="Informasi Penting"
            message="Klik tombol X untuk menutup pesan ini."
            dismissible
            onDismiss={() => setShowDismissible(false)}
          />
        ) : (
          <div className="p-4 bg-white rounded-lg border-2 border-dashed border-gray-300 text-center text-gray-500">
            Banner telah ditutup.{" "}
            <button
              onClick={() => setShowDismissible(true)}
              className="text-teal-600 font-medium hover:underline"
            >
              Tampilkan kembali
            </button>
          </div>
        )}
      </section>

      {/* Without Icon */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          6. Without Icon
        </h2>
        <PageStatus
          type="development"
          showIcon={false}
          title="Banner Tanpa Icon"
          message="Untuk tampilan yang lebih minimalis"
        />
      </section>

      {/* Inline Status Badges */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          7. Inline Status Badges
        </h2>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-700">Halaman Dashboard:</span>
              <InlinePageStatus type="success" text="Ready" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-700">Halaman Absensi:</span>
              <InlinePageStatus type="development" text="In Development" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-700">Halaman Reports:</span>
              <InlinePageStatus type="beta" text="Beta" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-700">Halaman Analytics:</span>
              <InlinePageStatus type="coming-soon" text="Coming Soon" />
            </div>
          </div>
        </div>
      </section>

      {/* Full Page Status Examples */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          8. Full Page Status (untuk halaman kosong)
        </h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <FullPageStatus
            type="coming-soon"
            title="Fitur Ini Segera Hadir"
            message="Kami sedang bekerja keras untuk menghadirkan fitur terbaik untuk Anda."
            action={{
              label: "Kembali ke Dashboard",
              onClick: () => alert("Navigasi ke dashboard"),
            }}
          >
            <div className="text-sm text-purple-800">
              <p>Fitur yang akan datang:</p>
              <ul className="mt-2 space-y-1">
                <li>✅ Real-time notifications</li>
                <li>✅ Advanced analytics</li>
                <li>✅ Export to PDF</li>
              </ul>
            </div>
          </FullPageStatus>
        </div>
      </section>

      {/* Usage in Real Pages */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          9. Contoh Penggunaan di Halaman Nyata
        </h2>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Halaman Laporan
            </h3>
            <InlinePageStatus type="beta" />
          </div>

          <PageStatus
            type="beta"
            size="sm"
            title="Fitur Beta"
            message="Fitur ini masih dalam tahap beta. Silakan laporkan jika menemukan bug."
            className="mb-6"
          />

          <div className="space-y-4">
            <div className="h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
              Content Area
            </div>
            <div className="h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
              Content Area
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
