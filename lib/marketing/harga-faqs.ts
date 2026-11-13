import { AI_CREDIT_PACKAGES, AI_FREE_CREDITS } from "@/lib/ai/credit-packages";
import { BILLING_CATALOG, formatIdr } from "@/lib/billing/catalog";

/** FAQ halaman /harga: satu sumber untuk tampilan (DOM) dan JSON-LD FAQPage. */
const LENGKAP = BILLING_CATALOG.desa_package.tiers.lengkap;
const INCLUDED_STORAGE_GB = BILLING_CATALOG.arsip.tiers.starter.storageGb;
const FIRST_AI_PACKAGE = AI_CREDIT_PACKAGES[0];

export const HARGA_FAQS: { question: string; answer: string }[] = [
  {
    question: "Berapa biaya yang harus dibayar desa?",
    answer: `Biaya awal ${formatIdr(LENGKAP.setupFee)} sudah termasuk 12 bulan pertama. Mulai tahun ke-2 desa membayar ${formatIdr(LENGKAP.monthlyFee)} per bulan (setara ${formatIdr(LENGKAP.annualFee)} per tahun). Tidak ada biaya awal kedua saat perpanjangan.`,
  },
  {
    question: "Apakah ada fitur yang harus dibayar terpisah?",
    answer: `Tidak. Semua fitur modul sudah termasuk di Paket Lengkap, tanpa batas jumlah data dan tanpa paket bertingkat. Yang dibayar terpisah hanya hal yang memang menimbulkan biaya dan bisa diukur: penyimpanan arsip di atas ${INCLUDED_STORAGE_GB} GB, kredit Asisten Desa AI, GPS radius untuk absensi, dan layanan Website Desa kustom.`,
  },
  {
    question: "Berapa perangkat desa yang bisa memakai absensi?",
    answer:
      "Paket Lengkap mencakup absensi QR untuk hingga 10 perangkat desa dengan riwayat 30 hari. Absensi GPS radius tersedia sebagai add-on terpisah.",
  },
  {
    question: "Bagaimana cara kerja kredit Asisten Desa AI?",
    answer: `Setiap pengguna mendapat ${AI_FREE_CREDITS.toLocaleString("id-ID")} kredit gratis. Satu pertanyaan memakai 1 kredit, dan kredit tidak dipotong bila jawaban gagal dibuat. Jika habis, kredit bisa diisi ulang mulai ${formatIdr(FIRST_AI_PACKAGE.price)} untuk ${FIRST_AI_PACKAGE.credits} kredit.`,
  },
  {
    question: "Bagaimana cara perpanjangan di tahun ke-2?",
    answer:
      "Perpanjangan dilakukan dari halaman Tagihan di aplikasi, dengan pilihan 1, 3, 6, atau 12 bulan. Sisa masa berlaku tidak hangus: perpanjangan disambung dari tanggal berakhir yang masih berjalan.",
  },
  {
    question: "Apakah tersedia trial?",
    answer:
      "Ya. Setiap desa baru mendapat trial gratis 14 hari tanpa perlu membayar di muka. Setelah trial, desa bisa membeli Paket Lengkap atau menghubungi tim kami untuk demo.",
  },
  {
    question: "Bagaimana dengan desa yang sudah memakai paket Starter, Profesional, atau Enterprise?",
    answer:
      "Tidak ada perubahan. Desa yang sudah aktif tetap memakai paket dan harganya masing-masing. Paket Lengkap berlaku untuk desa baru.",
  },
  {
    question: "Bagaimana cara pembayarannya?",
    answer:
      "Pembayaran melalui transfer bank atau metode yang tersedia di halaman Tagihan. Kami juga bisa membantu kebutuhan administrasi untuk pencairan APBDes.",
  },
  {
    question: "Apakah data desa kami aman?",
    answer:
      "Kami menerapkan praktik keamanan cloud standar: koneksi HTTPS, kontrol akses berbasis peran, serta jejak audit untuk tindakan tulis di dashboard dan aplikasi seluler. Kebutuhan compliance khusus dibahas bersama tim IT/wilayah Anda.",
  },
  {
    question: "Bagaimana dengan kabupaten atau kecamatan yang ingin memantau banyak desa?",
    answer:
      "Untuk pemantauan lintas desa dan dashboard akuntabilitas wilayah, hubungi tim kami. Skema lisensi kabupaten dibahas langsung sesuai jumlah desa dan kebutuhan.",
  },
];
