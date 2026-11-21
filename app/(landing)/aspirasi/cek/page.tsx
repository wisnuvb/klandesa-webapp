import type { Metadata } from "next";
import Link from "next/link";
import { StatusCheckForm } from "@/components/aspirasi/StatusCheckForm";

export const metadata: Metadata = {
  title: "Cek Status Laporan Aspirasi",
  description: "Periksa apakah laporan aspirasi Anda sudah tayang, dan bagaimana tanggapan pemerintah desa.",
  robots: { index: false, follow: true },
};

export default function AspirasiCekPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-xl px-4 pb-16 pt-24 sm:px-6">
        <p className="text-sm font-medium text-teal-800">Aspirasi Warga</p>
        <h1 className="mt-1 text-balance text-3xl font-semibold text-gray-900">Cek status laporan</h1>
        <p className="mt-3 text-lg leading-relaxed text-gray-700">Masukkan nomor laporan yang Anda terima saat mengirim, dan kontak yang Anda pakai (nomor WhatsApp atau email).</p>
        <div className="mt-8">
          <StatusCheckForm />
        </div>
        <p className="mt-8 text-base text-gray-700">
          Belum punya nomor laporan?{" "}
          <Link href="/aspirasi/kirim" className="font-medium text-teal-800 underline underline-offset-2">
            Sampaikan aspirasi
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
