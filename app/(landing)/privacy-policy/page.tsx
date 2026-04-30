import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentShell } from "@/components/features/LegalDocumentShell";
import { buildLandingSeo } from "@/lib/seo/landing";

const seo = buildLandingSeo(
  "/privacy-policy",
  "Kebijakan Privasi — Klandesa",
  "Penjelasan cara Klandesa mengumpulkan, menggunakan, menyimpan, dan melindungi data pribadi Anda serta hak-hak Anda sebagai pengguna platform digitalisasi desa.",
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

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentShell
      title="Kebijakan Privasi"
      description="Dokumen ini menjelaskan bagaimana Klandesa dan entitas hukum pengelola layanan (“kami”) memperlakukan informasi pribadi dalam penyediaan platform digitalisasi desa, portal, dan produk terkait."
      lastUpdatedIso="2026-04-30"
      lastUpdatedLabel="30 April 2026"
      currentSlug="privacy-policy"
    >
      <p>
        Kami menghargai privasi Anda. Dengan mengakses atau menggunakan layanan
        Klandesa, Anda dianggap telah membaca dan memahami Kebijakan Privasi
        ini bersama{" "}
        <Link href="/terms-of-service">Syarat &amp; Ketentuan Layanan</Link> serta{" "}
        <Link href="/cookie-policy">Kebijakan Cookie</Link> kami.
      </p>

      <h2 id="ruang-lingkup">Ruang lingkup</h2>
      <p>
        Kebijakan ini berlaku untuk penggunaan situs web, aplikasi, akun
        administrasi desa, serta layanan pendukung yang kami sediakan.
        Beberapa fitur dapat melibatkan pihak ketiga (misalnya penyedia
        pembayaran atau infrastruktur cloud); penggunaan data oleh pihak ketiga
        tersebut mengikuti kebijakan masing-masing, yang kami sarankan Anda
        baca secara mandiri.
      </p>

      <h2 id="definisi">Istilah penting</h2>
      <ul>
        <li>
          <strong>Pengguna</strong>: individu atau badan yang membuat akun,
          mengelola data desa, atau mengakses layanan atas nama pemerintahan
          desa atau mitra resmi.
        </li>
        <li>
          <strong>Data pribadi</strong>: setiap informasi yang secara langsung
          atau tidak langsung dapat mengidentifikasi seseorang, sepanjang
          diatur dalam peraturan perlindungan data yang berlaku di Indonesia.
        </li>
        <li>
          <strong>Pengendali data</strong>: Klandesa bertindak sebagai pengolah
          atas instruksi pemangku kepentingan desa untuk sebagian besar data
          operasional; untuk keperluan tertentu (misalnya akun internal Klandesa,
          pemasaran, atau dukungan teknis), Klandesa dapat bertindak sebagai
          pengendali sesuai konteks pemrosesan.
        </li>
      </ul>

      <h2 id="data-yang-kami-kumpulkan">Data yang kami kumpulkan</h2>
      <h3>Data akun dan administrasi</h3>
      <ul>
        <li>Nama, alamat surel (email), nomor telepon, dan jabatan;</li>
        <li>
          Kredensial masuk dan pengaturan keamanan yang Anda atau pengelola desa
          tetapkan;
        </li>
        <li>
          Informasi organisasi: nama desa, wilayah administratif, serta detail
          kontrak atau pemesanan paket layanan.
        </li>
      </ul>

      <h3>Data operasional desa</h3>
      <p>
        Melalui penggunaan platform, desa dapat menyimpan data penduduk,
        layanan surat, keuangan, aset, agenda kegiatan, dan dokumen lain yang
        dimasukkan secara sukarela ke dalam sistem. Klandesa memproses data
        tersebut semata-mata untuk menyediakan fitur yang Anda aktifkan dan
        meningkatkan keamanan serta keandalan layanan.
      </p>

      <h3>Data teknis dan penggunaan</h3>
      <ul>
        <li>
          Log sistem: alamat protokol internet (IP), jenis peramban (browser),
          waktu akses, serta ringkasan aktivitas untuk diagnosis gangguan dan
          audit keamanan;
        </li>
        <li>
          Informasi perangkat dan versi aplikasi guna kompatibilitas pembaruan;
        </li>
        <li>
          Cookie dan teknologi serupa — dijelaskan lebih rinci pada{" "}
          <Link href="/cookie-policy">Kebijakan Cookie</Link>.
        </li>
      </ul>

      <h2 id="tujuan-pemrosesan">Tujuan pemrosesan data</h2>
      <p>Kami memproses data pribadi untuk tujuan yang wajar dan relevan, antara lain:</p>
      <ul>
        <li>menyediakan, mengoperasikan, dan mengamankan layanan Klandesa;</li>
        <li>
          mengautentikasi pengguna, mencegah penyalahgunaan, serta mendeteksi
          ancaman siber;
        </li>
        <li>
          memberikan dukungan teknis, pelatihan, dan komunikasi terkait akun
          Anda;
        </li>
        <li>
          memenuhi kewajiban hukum, termasuk penyimpanan catatan sesuai ketentuan
          yang berlaku;
        </li>
        <li>
          meningkatkan produk melalui statistik agregat yang tidak mengidentifikasi
          individu secara langsung, kecuali Anda memberikan persetujuan tersendiri
          untuk penelitian atau survei tertentu.
        </li>
      </ul>

      <h2 id="dasar-hukum">Dasar hukum pemrosesan</h2>
      <p>
        Selaras dengan prinsip perlindungan data di Indonesia, pemrosesan dapat
        didasarkan pada pelaksanaan perjanjian layanan, pemenuhan kewajiban
        hukum, kepentingan sah yang seimbang dengan hak privasi Anda, atau
        persetujuan eksplisit apabila diwajibkan untuk aktivitas tertentu.
      </p>

      <h2 id="pembagian-kepada-pihak-ketiga">Pembagian kepada pihak ketiga</h2>
      <p>
        Kami dapat membagikan data kepada penyedia infrastruktur (hosting,
        basis data, jaringan pengiriman konten), penyedia komunikasi
        (surel, pesan), serta mitra pembayaran untuk penagihan yang sah.
        Pembagian dibatasi pada yang diperlukan, dengan perjanjian kerahasiaan
        dan standar keamanan yang wajar.
      </p>
      <p>
        Kami tidak menjual data pribadi Anda kepada pengiklan. Transfer lintas
        wilayah—apabila terjadi—akan dilakukan dengan perlindungan yang memadai
        sesuai regulasi yang berlaku.
      </p>

      <h2 id="retensi">Penyimpanan dan penghapusan</h2>
      <p>
        Data disimpan selama akun aktif atau selama diperlukan untuk memenuhi
        tujuan di atas, kecuali undang-undang mengharuskan periode lebih lama.
        Setelah tidak diperlukan, kami akan menghapus atau menganonimkan data
        secara proporsional sesuai kemampuan teknis dan kewajiban arsip desa.
      </p>

      <h2 id="keamanan">Keamanan</h2>
      <p>
        Klandesa menerapkan kontrol teknis dan organisasi yang wajar—seperti
        enkripsi pada saluran tertentu, pembatasan akses berbasis peran,
        pemantauan log, dan pembaruan berkala—untuk melindungi data dari akses
        tanpa izin, kehilangan, atau pengubahan yang melanggar hukum.
      </p>

      <h2 id="hak-pengguna">Hak Anda</h2>
      <p>
        Sesuai ketentuan yang berlaku, Anda dapat mengajukan permintaan untuk
        mengakses, memperbaiki, menghapus, membatasi pemrosesan, atau menarik
        persetujuan tertentu, serta mengajukan keberatan yang sah terhadap
        pemrosesan. Untuk data yang dikelola atas nama desa, permohonan dapat
        memerlukan koordinasi dengan perangkat desa sebagai pemilik kebijakan
        layanan publik setempat.
      </p>

      <h2 id="anak">Anak-anak</h2>
      <p>
        Layanan Klandesa ditujukan untuk keperluan administrasi pemerintahan
        desa dan bukan untuk dikonsumsi anak-anak secara langsung sebagai produk
        hiburan. Apabila terdapat data anak dalam sistem karena kewajiban
        registri penduduk, pemrosesan mengikuti ketentuan desa dan norma yang
        berlaku.
      </p>

      <h2 id="perubahan">Perubahan kebijakan</h2>
      <p>
        Kami dapat memperbarui Kebijakan Privasi untuk mencerminkan perubahan
        hukum atau layanan. Versi terbaru akan dipublikasikan di halaman ini
        dengan tanggal pembaruan; penggunaan berkelanjutan setelah perubahan
        dapat dianggap sebagai penerimaan sejauh diizinkan hukum.
      </p>

      <h2 id="kontak">Kontak</h2>
      <p>
        Untuk pertanyaan mengenai Kebijakan Privasi atau pelaksanaan hak Anda,
        silakan hubungi kami melalui kanal resmi yang tertera di situs Klandesa
        atau formulir kontak yang disediakan bagi pelanggan.
      </p>
    </LegalDocumentShell>
  );
}
