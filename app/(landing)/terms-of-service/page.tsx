import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentShell } from "@/components/features/LegalDocumentShell";
import { buildLandingSeo } from "@/lib/seo/landing";

const seo = buildLandingSeo(
  "/terms-of-service",
  "Syarat & Ketentuan Layanan — Klandesa",
  "Ketentuan penggunaan platform Klandesa: hak dan kewajiban pengguna, batasan tanggung jawab, serta tata cara layanan digitalisasi desa.",
);

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
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

export default function TermsOfServicePage() {
  return (
    <LegalDocumentShell
      title="Syarat & Ketentuan Layanan"
      description="Perjanjian ini mengatur penggunaan layanan Klandesa oleh pemerintahan desa, perangkat daerah terkait, atau mitra yang ditunjuk secara sah untuk mengoperasikan platform."
      lastUpdatedIso="2026-04-30"
      lastUpdatedLabel="30 April 2026"
      currentSlug="terms-of-service"
    >
      <p>
        Selamat datang di Klandesa. Dengan mendaftar, mengakses, atau
        menggunakan layanan kami, Anda menyetujui Syarat &amp; Ketentuan Layanan
        (“S&amp;K”) ini. Jika Anda tidak setuju, mohon tidak menggunakan layanan
        Klandesa. S&amp;K ini berlaku bersama{" "}
        <Link href="/privacy-policy">Kebijakan Privasi</Link> dan{" "}
        <Link href="/cookie-policy">Kebijakan Cookie</Link>.
      </p>

      <h2 id="definisi-dan-pihak">Definisi dan pihak yang terikat</h2>
      <ul>
        <li>
          <strong>“Klandesa”</strong> menyebut penyedia platform dan entitas
          hukum pengelola merek tersebut.
        </li>
        <li>
          <strong>“Pelanggan” atau “Anda”</strong> menyebut organisasi desa,
          kecamatan, atau badan hukum lain yang mengadakan hubungan kontraktual
          dengan Klandesa.
        </li>
        <li>
          <strong>“Pengguna akhir”</strong> menyebut perorangan yang diberi akses
          oleh Pelanggan (misalnya perangkat desa atau staf administrasi).
        </li>
      </ul>

      <h2 id="deskripsi-layanan">Deskripsi layanan</h2>
      <p>
        Klandesa menyediakan perangkat lunak berbasis langganan untuk membantu
        digitalisasi administrasi desa, antara lain modul data kependudukan,
        layanan surat-menyurat, keuangan desa, portal informasi, laporan, dan
        fitur lain yang dijelaskan pada dokumentasi resmi serta paket yang Anda
        pilih. Fitur dapat berubah seiring pengembangan produk dengan pemberitahuan
        wajar kepada Pelanggan aktif.
      </p>

      <h2 id="pendaftaran-akun">Pendaftaran dan akun</h2>
      <ul>
        <li>
          Anda wajib memberikan informasi yang benar, lengkap, dan mutakhir saat
          pendaftaran.
        </li>
        <li>
          Anda bertanggung jawab atas kerahasiaan kredensial akun dan aktivitas
          yang terjadi melalui akun Anda.
        </li>
        <li>
          Klandesa dapat menangguhkan atau menutup akun yang mencurigakan,
          melanggar hukum, atau menggunakan layanan melampaui ruang lingkup yang
          disepakati.
        </li>
      </ul>

      <h2 id="lisensi-penggunaan">Lisensi penggunaan</h2>
      <p>
        Klandesa memberikan lisensi terbatas, tidak eksklusif, tidak dapat
        dialihkan, dan dapat dicabut untuk menggunakan layanan sesama durasi
        berlangganan yang sah. Anda tidak boleh menyalin, membalikkan rekayasa
        (reverse engineer), mendistribusikan, atau menyewakan platform kepada pihak
        lain tanpa izin tertulis dari Klandesa, kecuali diizinkan secara tegas
        dalam perjanjian terpisah.
      </p>

      <h2 id="konten-dan-data-des">Konten dan data desa</h2>
      <p>
        Data dan dokumen yang Anda unggah atau input tetap menjadi tanggung jawab
        Pelanggan dari sisi kebenaran dan kepatuhan hukum setempat. Anda memberi
        Klandesa hak non-eksklusif untuk memproses data tersebut semata-mata guna
        menyediakan layanan, dukungan, serta pemenuhan hukum sebagaimana diatur
        dalam perjanjian dan Kebijakan Privasi.
      </p>

      <h2 id="pembayaran">Biaya dan pembayaran</h2>
      <p>
        Tarif mengikuti paket dan ketentuan penawaran yang berlaku pada saat
        pemesanan. Keterlambatan pembayaran dapat mengakibatkan pembatasan akses
        hingga penyelesaian tagihan. Harga dapat disesuaikan dengan pemberitahuan
        sebelumnya untuk periode perpanjangan berikutnya.
      </p>

      <h2 id="larangan">Larangan penggunaan</h2>
      <p>Anda dilarang menggunakan layanan untuk:</p>
      <ul>
        <li>
          melanggar hukum Indonesia atau hak pihak ketiga, termasuk privasi dan
          kekayaan intelektual;
        </li>
        <li>
          mengirimkan malware, melakukan serangan siber, atau mengganggu stabilitas
          infrastruktur Klandesa;
        </li>
        <li>
          mengekstraksi data secara otomatis tanpa izin di luar API atau fitur
          ekspor yang disediakan;
        </li>
        <li>
          menggunakan merek atau nama Klandesa secara menyesatkan publik.
        </li>
      </ul>

      <h2 id="sla-dan-ketersediaan">Ketersediaan layanan</h2>
      <p>
        Klandesa berupaya menjaga ketersediaan layanan sesuai deskripsi paket,
        namun tidak menjamin operasi bebas gangguan sepenuhnya. Pemeliharaan
        terjadwal akan diinformasikan bila memungkinkan. Force majeure dan
        gangguan pada penyedia infrastruktur pihak ketiga dapat mempengaruhi
        layanan di luar kendali wajar Klandesa.
      </p>

      <h2 id="batasan-tanggung-jawab">Batasan tanggung jawab</h2>
      <p>
        Sepanjang diizinkan hukum yang berlaku, tanggung jawab Klandesa terhadap
        klaim yang timbul dari atau terkait layanan dibatasi pada jumlah biaya
        berlangganan yang Anda bayarkan kepada Klandesa dalam periode dua belas
        (12) bulan terakhir sebelum kejadian, atau nominal lain yang disepakati
        secara tertulis dalam kontrak enterprise. Klandesa tidak bertanggung jawab
        atas kerugian tidak langsung, kehilangan keuntungan, atau gangguan reputasi.
      </p>

      <h2 id="ganti-rugi">Ganti rugi</h2>
      <p>
        Anda setuju untuk mengganti rugi dan membebaskan Klandesa dari klaim
        pihak ketiga yang timbul akibat penyalahgunaan layanan oleh Pengguna akhir,
        pelanggaran S&amp;K oleh Anda, atau sengketa data yang disebabkan oleh
        ketidakpatuhan Pelanggan terhadap peraturan desa atau daerah.
      </p>

      <h2 id="kekayaan-intelektual">Kekayaan intelektual</h2>
      <p>
        Hak atas perangkat lunak, merek, dokumentasi, dan antarmuka Klandesa
        adalah milik Klandesa atau pemberi lisensinya. Tidak ada hak kepemilikan
        yang dialihkan kepada Anda melalui S&amp;K ini selain lisensi penggunaan
        terbatas tersebut di atas.
      </p>

      <h2 id="pengakhiran">Pengakhiran</h2>
      <p>
        Anda dapat menghentikan langganan sesuai ketentuan kontrak. Klandesa dapat
        mengakhiri akses dengan pemberitahuan apabila Anda melanggar S&amp;K
        secara material dan tidak memperbaikinya dalam batas waktu yang wajar.
        Ketentuan yang secara natur tetap berlaku—misalnya pembatasan tanggung
        jawab, hukum yang mengatur, dan sengketa—tetap berlaku setelah berakhirnya
        hubungan kontraktual.
      </p>

      <h2 id="hukum-dan-sengketa">Hukum yang mengatur dan penyelesaian sengketa</h2>
      <p>
        S&amp;K ini diatur oleh hukum Negara Republik Indonesia. Para pihak
        akan terlebih dahulu berupaya menyelesaikan sengketa melalui musyawarah.
        Apabila tidak tercapai, penyelesaian dilakukan melalui pengadilan yang
        berwenang di Indonesia sesuai ketentuan yang berlaku, kecuali ditentukan
        lain secara tertulis dalam perjanjian komersial antara Anda dan Klandesa.
      </p>

      <h2 id="perubahan-syarat">Perubahan syarat</h2>
      <p>
        Klandesa dapat merevisi S&amp;K ini sewaktu-waktu. Perubahan material akan
        dikomunikasikan melalui surel ke kontak administratif Pelanggan atau
        pemberitahuan dalam aplikasi. Penggunaan layanan setelah tanggal efektif
        dapat dianggap sebagai persetujuan terhadap revisi tersebut sepanjang
        diperbolehkan hukum.
      </p>

      <h2 id="kontak-snk">Kontak</h2>
      <p>
        Untuk pertanyaan mengenai Syarat &amp; Ketentuan ini, silakan hubungi tim
        hukum atau dukungan pelanggan Klandesa melalui kanal resmi yang disediakan
        di situs web kami.
      </p>
    </LegalDocumentShell>
  );
}
