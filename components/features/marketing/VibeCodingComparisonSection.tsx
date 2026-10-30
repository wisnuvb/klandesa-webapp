"use client";

import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";

import { LENGKAP_MONTHLY_FEE, LENGKAP_SETUP_FEE } from "@/lib/billing/lengkap";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

type Row = { aspect: string; diy: string; klandesa: string };

/**
 * Setiap sisi Klandesa harus bisa ditunjuk di kode (lihat catatan di PR/riwayat audit):
 * katalog surat v2 (37 jenis) + penomoran otomatis, impor Excel warga, 4 peran desa + RT + pemda,
 * penyamaran NIK & pencatatan reveal-nik (30/jam), QR verifikasi surat, aplikasi seluler, tes otomatis.
 * Jangan menambah klaim tanpa bukti di kode (mis. cadangan data, kode Dukcapil resmi).
 */
const ROWS: Row[] = [
  {
    aspect: "Aturan & format desa",
    diy: "Anda yang harus paham tata naskah surat desa dan format Kemendesa, lalu menjelaskannya ke AI sampai hasilnya benar.",
    klandesa:
      "Sudah ada: 37 jenis surat dengan nomor surat otomatis, impor Excel data warga yang mengenali kolom umum desa, skor 18 tujuan SDGs, dan 4 format unduhan Kemendesa.",
  },
  {
    aspect: "Peran & hak akses",
    diy: "Login sederhana cukup untuk satu pengguna. Peran Kades, Sekdes, staf, RT, dan pemda harus dirancang dan diuji sendiri.",
    klandesa:
      "Hak akses per jabatan (admin, Kades, Sekdes, staf), peran RT di aplikasi seluler, dan tampilan kabupaten/kecamatan sudah tersedia.",
  },
  {
    aspect: "Data pribadi warga",
    diy: "NIK dan KK adalah data pribadi. Penyamaran, pembatasan akses, dan pencatatan siapa membukanya perlu Anda bangun dan uji sendiri.",
    klandesa:
      "NIK disamarkan di aplikasi seluler. Membuka NIK lengkap dicatat dan dibatasi 30 kali per jam untuk tiap pengguna.",
  },
  {
    aspect: "Keaslian surat",
    diy: "Cara memastikan surat digital itu asli dan belum diubah harus dirancang sendiri.",
    klandesa:
      "Surat dari aplikasi seluler memuat QR ke halaman verifikasi publik (bukan tanda tangan elektronik tersertifikasi).",
  },
  {
    aspect: "Aplikasi seluler",
    diy: "Aplikasi web berhenti di browser. Aplikasi Android untuk warga dan RT, lengkap dengan notifikasi dan rilis, adalah proyek tersendiri.",
    klandesa:
      "Aplikasi seluler untuk warga, RT, dan perangkat desa sudah termasuk dalam paket.",
  },
  {
    aspect: "Perawatan jangka panjang",
    diy: "Server, pembaruan keamanan, perbaikan bug, dan siapa yang mengerti kodenya saat pembuatnya pindah tugas menjadi tanggungan desa.",
    klandesa:
      "Server, pembaruan, dan perbaikan ditangani tim Klandesa, dengan dukungan email & chat di jam kerja. Kode diuji lewat puluhan berkas uji otomatis (surat, impor warga, penagihan, akses seluler).",
  },
  {
    aspect: "Biaya sebenarnya",
    diy: "Langganan alat AI memang murah di awal. Biaya sesungguhnya ada di jam kerja, hosting, dan perawatan.",
    klandesa: `${rupiah(LENGKAP_SETUP_FEE)} sudah termasuk tahun pertama, lalu ${rupiah(LENGKAP_MONTHLY_FEE)} per bulan mulai tahun ke-2. Trial gratis 14 hari.`,
  },
];

const GRID = "md:grid md:grid-cols-[12rem_1fr_1fr]";

interface Props {
  onRegisterClick: () => void;
}

export function VibeCodingComparisonSection({ onRegisterClick }: Props) {
  return (
    <section
      id="vs-vibe-coding"
      aria-labelledby="vs-vibe-coding-title"
      className="py-20 md:py-28 bg-linear-to-b from-white to-slate-50 border-y border-gray-100"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-10 md:mb-12">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0d9488] mb-3">
            Bikin sendiri dengan AI?
          </p>
          <h2
            id="vs-vibe-coding-title"
            className="text-3xl md:text-4xl font-bold text-gray-900 text-balance mb-4"
          >
            Vibe coding bagus untuk prototipe. Data warga butuh lebih dari itu.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            Membuat aplikasi desa sendiri dengan alat AI kini cepat dan murah. Yang
            menentukan adalah apa yang terjadi setelah demonya jalan: aturan desa,
            keamanan data warga, dan siapa yang merawatnya.
          </p>
        </div>

        {/* Judul kolom (desktop). Di layar kecil, label ada di dalam tiap kartu. */}
        <div
          aria-hidden="true"
          className={`hidden ${GRID} px-5 pb-2 text-sm font-semibold`}
        >
          <span />
          <span className="text-gray-600">Bikin sendiri dengan AI (vibe coding)</span>
          <span className="text-[#0f766e]">Klandesa</span>
        </div>

        <ul className="space-y-3">
          {ROWS.map((row) => (
            <li
              key={row.aspect}
              className={`${GRID} overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm`}
            >
              <h3 className="px-5 pt-5 pb-1 md:py-5 font-semibold text-gray-900 md:bg-gray-50 md:border-r md:border-gray-100">
                {row.aspect}
              </h3>

              <div className="flex gap-3 px-5 py-3 md:py-5 text-gray-700">
                <Minus
                  className="mt-0.5 h-5 w-5 shrink-0 text-gray-400"
                  aria-hidden="true"
                />
                <div className="text-sm leading-relaxed">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 md:sr-only">
                    Bikin sendiri dengan AI
                  </p>
                  <p>{row.diy}</p>
                </div>
              </div>

              <div className="flex gap-3 px-5 py-4 md:py-5 bg-teal-50 text-teal-950 md:border-l md:border-teal-100">
                <Check
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#0f766e]"
                  aria-hidden="true"
                />
                <div className="text-sm leading-relaxed">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#0f766e] md:sr-only">
                    Klandesa
                  </p>
                  <p>{row.klandesa}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-5 py-4 text-sm text-indigo-950 leading-relaxed">
          <strong className="font-semibold">Kapan vibe coding sudah cukup?</strong>{" "}
          Untuk prototipe, alat bantu kecil, atau menjajal ide sebelum memutuskan.
          Bedanya mulai terasa saat aplikasi menyimpan data warga dan dipakai banyak
          orang. Perbandingan ini bersifat umum; hasil buatan sendiri bergantung pada
          kemampuan dan waktu pembuatnya.
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center">
          <button
            type="button"
            onClick={onRegisterClick}
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#0d9488] to-[#0f766e] px-7 py-3.5 font-medium text-white shadow-md transition-all hover:shadow-xl cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d9488]"
          >
            Coba gratis 14 hari
            <ArrowRight
              className="h-5 w-5 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </button>
          <Link
            href="/harga"
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-7 py-3.5 font-medium text-gray-900 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d9488]"
          >
            Lihat harga &amp; isi paket
          </Link>
        </div>
      </div>
    </section>
  );
}
