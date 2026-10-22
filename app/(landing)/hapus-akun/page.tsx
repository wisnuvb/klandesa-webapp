import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentShell } from "@/components/features/LegalDocumentShell";
import { buildLandingSeo } from "@/lib/seo/landing";

const seo = buildLandingSeo(
  "/hapus-akun",
  "Hapus Akun & Data — Klandesa",
  "Cara menghapus akun warga Klandesa beserta data terkait, dan data apa yang dihapus atau tetap disimpan oleh desa.",
);

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  robots: "index, follow",
  alternates: { canonical: seo.canonical },
};

export default function HapusAkunPage() {
  return (
    <LegalDocumentShell
      title="Hapus Akun & Data"
      description="Panduan menghapus akun warga di aplikasi Klandesa dan penjelasan data yang dihapus atau tetap disimpan."
      lastUpdatedIso="2026-10-22"
      lastUpdatedLabel="22 Oktober 2026"
      currentSlug="privacy-policy"
    >
      <h2 id="di-aplikasi">Hapus akun lewat aplikasi (paling cepat)</h2>
      <ol>
        <li>Buka aplikasi Klandesa dan masuk dengan akun Anda.</li>
        <li>Buka tab <strong>Saya</strong>, lalu pilih <strong>Hapus akun</strong>.</li>
        <li>Masukkan password Anda untuk konfirmasi, lalu ketuk <strong>Hapus akun saya</strong>.</li>
      </ol>

      <h2 id="tanpa-aplikasi">Jika tidak bisa masuk ke aplikasi</h2>
      <p>
        Minta bantuan kantor desa Anda: perangkat desa dapat mereset akses Anda
        dengan kode reset, sehingga Anda bisa masuk lalu menghapus akun sendiri.
        Anda juga dapat menghubungi kami melalui halaman{" "}
        <Link href="/privacy-policy">Kebijakan Privasi</Link> untuk permintaan
        penghapusan data pribadi.
      </p>

      <h2 id="yang-dihapus">Data yang dihapus</h2>
      <ul>
        <li>Akun, username, dan password (terenkripsi) Anda.</li>
        <li>Sesi masuk dan token notifikasi pada semua perangkat.</li>
        <li>Kotak masuk notifikasi dan kode aktivasi/reset yang terkait.</li>
      </ul>

      <h2 id="yang-disimpan">Data yang tetap disimpan</h2>
      <ul>
        <li>
          Data kependudukan dan arsip permohonan surat tetap berada pada
          pemerintah desa sebagai catatan administrasi yang dikelola desa;
          permohonan tersebut tidak lagi terhubung ke akun Anda.
        </li>
        <li>
          Laporan pengaduan tetap tersimpan sebagai arsip desa, tetapi nama dan
          NIK pelapor dikosongkan.
        </li>
      </ul>

      <p>
        Setelah akun dihapus, Anda dapat mendaftar kembali kapan saja dengan
        kode dari desa atau data diri.
      </p>
    </LegalDocumentShell>
  );
}
