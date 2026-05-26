import Link from "next/link";
import type { Metadata } from "next";
import { getLandingPageMetadata } from "@/lib/seo/landing-pages";

export const metadata: Metadata = getLandingPageMetadata("solusiPemda");

const points = [
  {
    title: "Hak akses per jabatan",
    body: "Sekdes, Kades, dan staf desa melihat menu yang berbeda—setiap perubahan data penting dapat dilacak untuk keperluan audit internal.",
  },
  {
    title: "Format laporan siap Kemendesa",
    body: "Unduh data penduduk, ringkasan APBDes, paket portal SDGs, dan cuplikan Prodeskel dalam format CSV/JSON standar—plus catatan kapan data diunduh.",
  },
  {
    title: "Peta untuk perencanaan",
    body: "Infrastruktur, titik risiko lingkungan, dan peta capaian SDGs membantu membaca prioritas pembangunan per wilayah desa.",
  },
  {
    title: "Pantau banyak desa",
    body: "Akun kabupaten/kecamatan untuk supervisi tanpa harus masuk ke setiap transaksi sensitif di tingkat desa secara sembarangan.",
  },
];

export default function SolusiPemdaPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-20 md:py-28">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
        Untuk Pemerintah Daerah &amp; provinsi pembina
      </h1>
      <p className="text-gray-600 text-lg mb-10">
        Digitalisasi desa harus bisa dipertanggungjawabkan dan selaras dengan
        instrumen pusat—bukan sekadar mengganti formulir kertas dengan formulir online.
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
          Format unduhan Kemendesa
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
