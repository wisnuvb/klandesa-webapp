import Link from "next/link";
import type { Metadata } from "next";
import { getLandingPageMetadata } from "@/lib/seo/landing-pages";

export const metadata: Metadata = getLandingPageMetadata("solusiPemda");

const points = [
  {
    title: "Tata kelola akses peran",
    body: "Matriks permission desa memisahkan apa yang boleh dibaca Sekdes dibanding kepala desa—API otomatis memverifikasi aksi konsisten dengan hukum akses aplikasi Anda.",
  },
  {
    title: "Komparabilitas Kemendesa (export-ready)",
    body: "Schema CSV/JSON standar bagi penduduk, APBDes-compatible export, paket portal SDGs, serta ringkasan Prodeskel—ditambah audit trail sink.",
  },
  {
    title: "Konteks spasial untuk perencanaan",
    body: "Peta infrastruktur, titiko risiko lingkungan, dan heatmap SDGs menghubungkan capaian indikator dengan geografis wilayah desa dampingan.",
  },
  {
    title: "Insinyur regional & multi-dinas",
    body: "Akun regional kabupaten/kecamatan memfasilitasi supervisi wilayah tanpa memaksakan akses transaksi sensitif secara tidak terkontrol pada setiap desa.",
  },
];

export default function SolusiPemdaPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-20 md:py-28">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
        Untuk Pemerintah Daerah &amp; provinsi pembina
      </h1>
      <p className="text-gray-600 text-lg mb-10">
        Digitalisasi desa harus bisa diaudit serta diselaraskan dengan instrumen pusat —
        itu inti valuasi enterprise Klandesa, bukan sekadar formulir daring.
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
          href="/platform/integrasi"
          className="inline-flex rounded-xl bg-[#0d9488] px-6 py-3 text-white text-sm font-medium hover:bg-[#0f766e]"
        >
          Rincian integrasi format
        </Link>
        <Link
          href="/mitra-klandesa"
          className="inline-flex rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium hover:bg-gray-50"
        >
          Kerja sama wilayah
        </Link>
      </div>
    </article>
  );
}
