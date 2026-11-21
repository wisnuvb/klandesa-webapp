import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { SubmitForm } from "@/components/aspirasi/SubmitForm";

export const metadata: Metadata = {
  title: "Sampaikan Aspirasi Warga",
  description: "Formulir untuk melaporkan kondisi desa. Identitas Anda tidak ditampilkan dan laporan ditinjau lebih dulu sebelum tayang.",
  robots: { index: false, follow: true },
};

export default function AspirasiKirimPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-24 sm:px-6">
        <p className="text-sm font-medium text-teal-800">Aspirasi Warga</p>
        <h1 className="mt-1 text-balance text-3xl font-semibold text-gray-900">Sampaikan aspirasi</h1>
        <p className="mt-3 text-lg leading-relaxed text-gray-700">
          Laporkan kondisi desa Anda dengan fakta yang jelas. Laporan ditinjau tim kami lebih dulu, tayang tanpa nama dan kontak Anda, dan dapat ditanggapi pemerintah desa.
        </p>
        <div role="note" className="mt-5 flex gap-3 rounded-xl border border-amber-400 bg-amber-50 p-4 text-base leading-relaxed text-amber-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            <strong>Untuk keadaan darurat hubungi 112 atau pihak berwenang.</strong> Formulir ini bukan layanan darurat. Untuk pengaduan resmi kepada pemerintah gunakan juga{" "}
            <a href="https://lapor.go.id" target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">
              LAPOR! (lapor.go.id)
            </a>
            .
          </p>
        </div>
        <div className="mt-8">
          <SubmitForm />
        </div>
      </div>
    </main>
  );
}
