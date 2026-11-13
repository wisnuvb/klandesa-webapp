import Link from "next/link";
import type { Metadata } from "next";
import { getLandingPageMetadata } from "@/lib/seo/landing-pages";
import { getMainSiteOrigin } from "@/lib/seo/url";

export const metadata: Metadata = getLandingPageMetadata("solusiDesa");

const points = [
  {
    title: "Operasional harian satu login",
    body: "Data warga, KK, surat daring, pengumuman, dan pencatatan bansos dalam satu aplikasi seluler dan dashboard—dengan hak akses berbeda untuk admin, Sekdes, Kades, dan staf.",
  },
  {
    title: "Dari musyawarah sampai laporan",
    body: "Musyawarah Desa, RKP Desa dengan tenggat otomatis, APB Desa, SPP, Buku Kas Umum, Dana Desa (termasuk BLT dan Padat Karya Tunai), sampai LPPD/LKPPD—tertulis mengikuti teks peraturan, dengan temuan yang menyebut pasalnya.",
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
    title: "Fitur akses awal sudah termasuk",
    body: "SDGs lanjutan dan Asisten AI sudah termasuk Paket Lengkap. Keduanya masih berlabel akses awal dan disempurnakan bersama desa pengguna dengan pendampingan tim Klandesa.",
  },
];

const roles = [
  {
    role: "Kepala Desa",
    body: "Memantau ringkasan penduduk, status permohonan warga, dan progres perencanaan serta anggaran tanpa menunggu rekap manual, dengan hak akses yang sesuai jabatan.",
  },
  {
    role: "Sekretaris Desa",
    body: "Mengatur akun dan hak akses perangkat, memeriksa tenggat penyusunan dokumen perencanaan dan pelaporan, serta menjaga register surat tetap tertib.",
  },
  {
    role: "Kaur, Kasi, dan staf",
    body: "Mengerjakan bagian masing-masing: melayani surat warga, mencatat data kependudukan, menyusun kegiatan dan anggaran, serta mencatat kehadiran lewat absensi QR.",
  },
  {
    role: "RT, RW, dan warga",
    body: "Mengajukan permohonan dan pengaduan dari aplikasi seluler, lalu memantau statusnya—sehingga perangkat desa tidak perlu menjawab pertanyaan yang sama berulang.",
  },
];

const scenarios = [
  {
    title: "Warga meminta surat keterangan",
    steps:
      "Warga mengajukan permohonan dari aplikasi. Staf membuka antrean, memilih jenis surat dari 37 contoh yang tersedia, data warga terisi dari database, nomor surat dibuat otomatis, lalu surat dicetak di atas kop desa. Warga melihat status permohonannya tanpa datang dua kali.",
  },
  {
    title: "Menyusun RKP Desa dan APB Desa",
    steps:
      "Hasil Musyawarah Desa dicatat, kegiatan disusun ke dalam RKP Desa dengan pengingat tenggat, lalu dihubungkan ke APB Desa. Saat anggaran berjalan, SPP dan Buku Kas Umum mengikuti kegiatan yang sama, sehingga laporan tidak disusun ulang dari nol.",
  },
  {
    title: "Menyalurkan BLT Dana Desa",
    steps:
      "Penerima dicatat per keluarga dengan batas nilai menurut aturan tahun berjalan, pembayaran dicatat per bulan, dan lampiran SK siap cetak. Pencatatan tertelusur, bukan tercecer di beberapa lembar kerja.",
  },
  {
    title: "Menyiapkan laporan akhir tahun",
    steps:
      "Data kependudukan, keuangan, dan program yang sudah tercatat sepanjang tahun menjadi bahan LPPD/LKPPD dan ringkasan SDGs desa, dengan unduhan ke format yang dibutuhkan.",
  },
];

const faqs = [
  {
    question: "Apakah Klandesa cocok untuk desa dengan perangkat yang belum terbiasa komputer?",
    answer:
      "Ya. Alur utama dibuat bertahap dan memakai istilah yang dipakai di kantor desa. Setiap desa mendapat pelatihan daring dan panduan mandiri, serta dukungan email dan chat pada jam kerja.",
  },
  {
    question: "Apa saja yang bisa dikerjakan satu aplikasi ini untuk desa?",
    answer:
      "Administrasi kependudukan, layanan surat dan permohonan warga, pengaduan, pengumuman, keuangan desa (APB Desa, SPP, Buku Kas Umum, Dana Desa), perencanaan (RKP dan RPJM Desa), program lapangan, serta SDGs Desa. Daftar lengkapnya ada di halaman platform.",
  },
  {
    question: "Berapa biaya aplikasi desa Klandesa?",
    answer:
      "Paket Lengkap Rp3.500.000 di awal, sudah termasuk tahun pertama, lalu Rp100.000 per bulan mulai tahun ke-2. Setiap desa baru mendapat trial gratis 14 hari.",
  },
  {
    question: "Apakah bisa dicoba sebelum membeli?",
    answer:
      "Bisa. Anda dapat membuka akun demo untuk melihat alurnya, atau mendaftar trial gratis 14 hari dengan data desa sendiri.",
  },
  {
    question: "Apakah data warga aman?",
    answer:
      "Koneksi memakai HTTPS, akses dibatasi menurut peran akun, dan tindakan penting tercatat dalam jejak audit. Kebutuhan khusus bisa dibahas bersama tim kami.",
  },
];

export default function SolusiDesaPage() {
  const origin = getMainSiteOrigin();
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: origin },
      { "@type": "ListItem", position: 2, name: "Solusi untuk Desa", item: `${origin}/solusi/desa` },
    ],
  };

  return (
    <article className="max-w-3xl mx-auto px-4 py-20 md:py-28">
      {[faqJsonLd, breadcrumbJsonLd].map((ld) => (
        <script
          key={ld["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}

      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
        Aplikasi untuk Pemerintah Desa &amp; perangkatnya
      </h1>
      <p className="text-gray-600 text-lg mb-10">
        Klandesa adalah aplikasi desa yang membantu kepala desa, sekdes, dan perangkat
        merapikan administrasi sehari-hari sekaligus menyiapkan laporan dan SDGs dari
        data yang sudah Anda kelola.
      </p>

      <div className="space-y-6 mb-16">
        {points.map((p) => (
          <div key={p.title} className="rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-2">{p.title}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{p.body}</p>
          </div>
        ))}
      </div>

      <section className="mb-16" aria-labelledby="peran">
        <h2 id="peran" className="text-2xl font-bold text-gray-900 mb-2">
          Membantu setiap peran di kantor desa
        </h2>
        <p className="text-gray-600 mb-6">
          Satu data dipakai bersama, tetapi tiap akun hanya melihat dan mengubah bagian
          yang menjadi tanggung jawabnya.
        </p>
        <dl className="space-y-4">
          {roles.map((r) => (
            <div key={r.role} className="rounded-2xl bg-gray-50 p-5">
              <dt className="font-semibold text-gray-900 mb-1">{r.role}</dt>
              <dd className="text-sm text-gray-600 leading-relaxed">{r.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mb-16" aria-labelledby="skenario">
        <h2 id="skenario" className="text-2xl font-bold text-gray-900 mb-6">
          Contoh pekerjaan yang jadi lebih ringan
        </h2>
        <ol className="space-y-6">
          {scenarios.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span
                aria-hidden="true"
                className="shrink-0 w-8 h-8 rounded-full bg-[#0d9488]/10 text-[#0f766e] text-sm font-semibold flex items-center justify-center"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.steps}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-16" aria-labelledby="faq">
        <h2 id="faq" className="text-2xl font-bold text-gray-900 mb-6">
          Pertanyaan umum dari perangkat desa
        </h2>
        <div className="space-y-5">
          {faqs.map((f) => (
            <div key={f.question}>
              <h3 className="font-semibold text-gray-900 mb-1">{f.question}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-sm text-gray-600 mb-8">
        Panduan per kebutuhan:{" "}
        <Link href="/fitur/aplikasi-surat-desa" className="text-[#0f766e] underline underline-offset-4">
          surat desa
        </Link>
        ,{" "}
        <Link href="/fitur/aplikasi-apbdes" className="text-[#0f766e] underline underline-offset-4">
          APBDes
        </Link>
        ,{" "}
        <Link href="/fitur/aplikasi-dana-desa" className="text-[#0f766e] underline underline-offset-4">
          Dana Desa
        </Link>
        , dan{" "}
        <Link href="/fitur/aplikasi-rkp-desa" className="text-[#0f766e] underline underline-offset-4">
          RKP Desa
        </Link>
        . Pelajari juga{" "}
        <Link href="/harga" className="text-[#0f766e] underline underline-offset-4">
          harga Paket Lengkap
        </Link>
        ,{" "}
        <Link href="/platform/sdgs" className="text-[#0f766e] underline underline-offset-4">
          dashboard SDGs Desa
        </Link>
        , atau{" "}
        <Link href="/solusi/pemerintah-daerah" className="text-[#0f766e] underline underline-offset-4">
          solusi untuk pemerintah daerah
        </Link>
        .
      </p>

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
