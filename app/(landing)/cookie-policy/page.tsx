import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentShell } from "@/components/features/LegalDocumentShell";
import { buildLandingSeo } from "@/lib/seo/landing";

const seo = buildLandingSeo(
  "/cookie-policy",
  "Kebijakan Cookie — Klandesa",
  "Informasi tentang cookie dan teknologi serupa di platform Klandesa, tujuan penggunaannya, serta cara mengelola preferensi Anda.",
);

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  robots: "index, follow",
  alternates: { canonical: seo.canonical },
  openGraph: {
    type: "website",
    locale: "id_ID",
    title: seo.title,
    description: seo.description,
    url: seo.canonical,
    images: [{ url: seo.ogImage }],
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
    images: [seo.ogImage],
  },
};

export default function CookiePolicyPage() {
  return (
    <LegalDocumentShell
      title="Kebijakan Cookie"
      description="Kebijakan ini menjelaskan bagaimana situs web dan aplikasi Klandesa menggunakan cookie serta teknologi penyimpanan setempat lainnya untuk meningkatkan pengalaman Anda dan mendukung keamanan layanan."
      lastUpdatedIso="2026-04-30"
      lastUpdatedLabel="30 April 2026"
      currentSlug="cookie-policy"
    >
      <p>
        Dokumen ini melengkapi{" "}
        <Link href="/privacy-policy">Kebijakan Privasi</Link> kami. Dengan terus
        menggunakan layanan Klandesa, Anda menyetujui penggunaan cookie sebagaimana
        dijelaskan di halaman ini, kecuali Anda mengubah pengaturan peramban atau
        preferensi yang kami sediakan (jika ada).
      </p>

      <h2 id="apa-itu-cookie">Apa itu cookie?</h2>
      <p>
        Cookie adalah berkas teks berukuran kecil yang disimpan pada perangkat
        Anda ketika Anda mengunjungi suatu situs web. Cookie membantu situs
        mengingat preferensi Anda, menjaga sesi masuk tetap aman, serta
        memahami bagaimana halaman digunakan secara agregat. Teknologi serupa
        meliputi penyimpanan lokal (local storage), penyimpanan sesi (session
        storage), dan penanda pelacakan dalam konteks aplikasi web modern.
      </p>

      <h2 id="jenis-cookie">Jenis cookie yang kami gunakan</h2>

      <h3>Cookie penting (esensial)</h3>
      <p>
        Diperlukan agar situs dan aplikasi berfungsi dengan benar, misalnya untuk
        menjaga sesi autentikasi pengguna, mencegah penipuan pada formulir, atau
        mengingat pilihan bahasa dasar. Cookie ini biasanya tidak dapat dimatikan
        tanpa mempengaruhi fungsi inti layanan.
      </p>

      <h3>Cookie kinerja dan analitik</h3>
      <p>
        Membantu kami memahami kunjungan secara anonim atau pseudonim—seperti
        halaman yang populer, waktu muat, dan pola kesalahan teknis—guna
        meningkatkan stabilitas dan pengalaman pengguna. Apabila kami menggunakan
        penyedia analitik pihak ketiga, pemrosesan mereka mengikuti kebijakan
        privasi masing-masing penyedia tersebut.
      </p>

      <h3>Cookie fungsionalitas</h3>
      <p>
        Menyimpan pilihan Anda—misalnya tema tampilan, penyaringan yang terakhir
        digunakan, atau pengaturan antarmuka—agar Anda tidak perlu mengatur ulang
        setiap kali mengakses.
      </p>

      <h3>Cookie pemasaran dan sosial (jika digunakan)</h3>
      <p>
        Apabila pada titik tertentu Klandesa menampilkan konten promosi atau
        menyematkan layanan dari jejaring sosial, cookie terkait dapat dipasang
        oleh pihak ketiga untuk mengukur interaksi atau menampilkan konten yang
        relevan. Kami akan memberi tahu Anda secara jelas ketika fitur tersebut
        aktif dan bagaimana cara menolaknya.
      </p>

      <h2 id="durasi">Durasi penyimpanan</h2>
      <ul>
        <li>
          <strong>Cookie sesi</strong>: dihapus ketika Anda menutup peramban atau
          keluar dari aplikasi.
        </li>
        <li>
          <strong>Cookie tetap</strong>: tetap ada sampai kedaluwarsa atau Anda
          menghapusnya secara manual; digunakan untuk mengingat preferensi di
          kunjungan mendatang.
        </li>
      </ul>

      <h2 id="pengelolaan">Mengelola cookie dan preferensi</h2>
      <p>Anda dapat mengontrol cookie melalui berbagai cara:</p>
      <ul>
        <li>
          Mengatur peramban untuk menolak atau menghapus cookie — lihat menu bantuan
          pada Chrome, Safari, Firefox, Edge, atau peramban lain yang Anda gunakan.
        </li>
        <li>
          Menggunakan mode penyamaran/private browsing untuk membatasi penyimpanan
          persisten (dengan catatan beberapa fitur layanan mungkin tidak optimal).
        </li>
        <li>
          Mematikannya untuk cookie non-esensial melalui panel preferensi cookie,
          bilamana Klandesa menyediakannya di versi terbaru situs atau aplikasi.
        </li>
      </ul>
      <p>
        Mohon diperhatikan bahwa memblokir cookie esensial dapat menghambat masuk
        ke akun atau menggunakan bagian tertentu dari platform secara normal.
      </p>

      <h2 id="sinyal-do-not-track">Sinyal “Do Not Track”</h2>
      <p>
        Standar industri untuk menanggapi sinyal Do Not Track belum seragam.
        Saat ini Klandesa mengikuti pendekatan pengaturan peramban dan preferensi
        eksplisit yang Anda pilih di dalam layanan kami ketika tersedia.
      </p>

      <h2 id="perubahan-cookie">Perubahan kebijakan</h2>
      <p>
        Kami dapat memperbarui Kebijakan Cookie ini untuk mencerminkan perubahan
        teknologi atau regulasi. Tanggal pembaruan akan dicantumkan di bagian atas
        dokumen. Disarankan Anda meninjau halaman ini secara berkala.
      </p>

      <h2 id="kontak-cookie">Kontak</h2>
      <p>
        Jika Anda memiliki pertanyaan tentang penggunaan cookie di layanan
        Klandesa, silakan hubungi kami melalui kontak resmi yang tercantum pada
        portal Klandesa atau melalui saluran dukungan pelanggan.
      </p>
    </LegalDocumentShell>
  );
}
