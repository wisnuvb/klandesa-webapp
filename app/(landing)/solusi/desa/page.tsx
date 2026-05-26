import Link from "next/link";
import type { Metadata } from "next";
import { getLandingPageMetadata } from "@/lib/seo/landing-pages";

export const metadata: Metadata = getLandingPageMetadata("solusiDesa");

const points = [
  {
    title: "Operasional harian satu login",
    body: "Data warga, KK, surat daring, pengumuman, pencatatan bansos, dan keuangan/APBDes dalam satu aplikasi—dengan hak akses berbeda untuk admin, Sekdes, Kades, dan staf.",
  },
  {
    title: "Program lapangan ada jejaknya",
    body: "PKK Dasawisma, posyandu, BUMDes, pertanian, dan kegiatan RT/RW tercatat terhubung—bukan lembar kerja terpisah tanpa hubungan ke pembangunan desa.",
  },
  {
    title: "SDGs menjadi kompas pembangunan",
    body: "Ringkasan 18 tujuan dan peta capaian per RT/RW membantu menentukan program yang tepat sasaran bersama BPD dan warga.",
  },
  {
    title: "Bersedia jadi desa percontohan",
    body: "Fitur SDGs lanjutan dan Asisten AI dibuka bertahap bersama tim pendamping Klandesa—bukan dijanjikan sekaligus tanpa pelatihan.",
  },
];

export default function SolusiDesaPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-20 md:py-28">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
        Untuk Pemerintah Desa &amp; perangkatnya
      </h1>
      <p className="text-gray-600 text-lg mb-10">
        Klandesa membantu desa merapikan administrasi sekaligus menyiapkan laporan
        SDGs dari data yang sudah Anda kelola sehari-hari.
      </p>
      <div className="space-y-6 mb-12">
        {points.map((p) => (
          <div key={p.title} className="rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-2">{p.title}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{p.body}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        <Link
          href="/demo"
          className="inline-flex rounded-xl bg-[#0d9488] px-6 py-3 text-white text-sm font-medium hover:bg-[#0f766e]"
        >
          Coba Demo
        </Link>
        <Link
          href="/platform"
          className="inline-flex rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium hover:bg-gray-50"
        >
          Lihat semua fitur
        </Link>
      </div>
    </article>
  );
}
