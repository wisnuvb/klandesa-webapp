/**
 * Halaman topik SEO (/fitur/[slug]): satu halaman per kebutuhan pencarian.
 * ATURAN ISI: klaim fitur hanya dari MARKETING_MODULE_COPY (lib/marketing/modules.ts) dan
 * klaim regulasi hanya yang sudah tertulis di sana. Jangan menambah angka tenggat, nominal,
 * atau nomor pasal baru di sini tanpa dicek ke teks resmi.
 */

export type TopicFaq = { question: string; answer: string };

export type TopicPage = {
  slug: string;
  /** Nama pendek untuk tautan dan breadcrumb. */
  shortName: string;
  h1: string;
  /** Tanpa akhiran merek: template root layout menambahkan " | Klandesa". */
  title: string;
  description: string;
  keywords: string[];
  intro: string;
  problems: { title: string; body: string }[];
  features: { title: string; body: string }[];
  steps: { title: string; body: string }[];
  faqs: TopicFaq[];
  related: string[];
};

const PRICE_FAQ: TopicFaq = {
  question: "Berapa biaya dan apakah bisa dicoba dulu?",
  answer:
    "Paket Lengkap Rp3.500.000 di awal, sudah termasuk tahun pertama, lalu Rp100.000 per bulan mulai tahun ke-2. Semua fitur termasuk dalam satu paket, dan setiap desa baru mendapat trial gratis 14 hari.",
};

export const TOPIC_PAGES: TopicPage[] = [
  {
    slug: "aplikasi-surat-desa",
    shortName: "Surat desa",
    h1: "Aplikasi Surat Desa: dari Permohonan Warga sampai Surat Tercetak",
    title: "Aplikasi Surat Desa — Surat Daring & Nomor Otomatis",
    description:
      "Aplikasi surat desa: warga mengajukan permohonan dari ponsel, staf menyusun 37 jenis surat dengan nomor otomatis dan kop desa. Coba gratis 14 hari.",
    keywords: [
      "aplikasi surat desa",
      "aplikasi surat menyurat desa",
      "surat keterangan desa online",
      "pelayanan surat desa",
      "nomor surat otomatis desa",
    ],
    intro:
      "Pelayanan surat adalah pekerjaan yang paling sering diminta warga dan paling banyak menyita waktu kantor desa. Aplikasi surat desa Klandesa menyatukan permohonan warga, penyusunan surat di lembar kertas, penomoran, dan buku agenda dalam satu alur, sehingga staf tidak lagi mengetik ulang data yang sama.",
    problems: [
      {
        title: "Data yang sama diketik berulang",
        body: "Nama, NIK, dan alamat warga biasanya diketik ulang di setiap surat. Di Klandesa, isian surat diambil dari data warga yang sudah tercatat.",
      },
      {
        title: "Warga harus datang untuk bertanya status",
        body: "Dengan permohonan daring, warga bisa melihat status pengajuannya sendiri tanpa menghubungi perangkat desa berulang kali.",
      },
      {
        title: "Nomor surat dan buku agenda sulit rapi",
        body: "Nomor surat dibuat otomatis, dan buku agenda surat masuk dan keluar memakai nomor berurutan yang aman meski dicatat oleh beberapa orang sekaligus.",
      },
    ],
    features: [
      {
        title: "Editor surat di lembar kertas",
        body: "Susun surat resmi langsung di lembar kertas, dengan 37 jenis surat siap pakai dan nomor surat otomatis.",
      },
      {
        title: "Permohonan surat daring",
        body: "Alur permohonan surat dari warga dengan status yang transparan, lengkap dengan layanan mandiri yang bisa diisi warga atau admin.",
      },
      {
        title: "Terhubung ke data warga dan perangkat",
        body: "Data warga dan KK terpusat (bisa diimpor dari Excel), serta daftar jabatan yang konsisten untuk penandatangan surat.",
      },
      {
        title: "Kop surat desa",
        body: "Kop surat memakai data desa Anda dan dapat dipilih tata letak logonya.",
      },
      {
        title: "Register surat masuk dan keluar",
        body: "Buku agenda dengan nomor agenda berurutan untuk surat masuk dan keluar.",
      },
      {
        title: "Hak akses per akun",
        body: "Admin mengatur siapa boleh masuk dan apa yang boleh dilakukan tiap perangkat desa, bahkan berbeda antar staf dengan peran yang sama.",
      },
    ],
    steps: [
      {
        title: "Warga mengajukan permohonan",
        body: "Dari aplikasi seluler atau layanan daring, warga memilih jenis surat dan mengisi data yang diperlukan.",
      },
      {
        title: "Staf memproses di antrean",
        body: "Staf membuka permohonan, memeriksa isiannya, dan menyusun surat di editor dengan data warga yang sudah terisi.",
      },
      {
        title: "Surat bernomor dan siap cetak",
        body: "Nomor surat dibuat otomatis, lalu surat dicetak di atas kop desa dan dicatat di register.",
      },
    ],
    faqs: [
      {
        question: "Ada berapa jenis surat yang tersedia?",
        answer:
          "Tersedia 37 jenis surat siap pakai, dan isinya dapat disesuaikan di editor sebelum dicetak.",
      },
      {
        question: "Apakah warga harus datang ke kantor desa?",
        answer:
          "Warga dapat mengajukan permohonan dan memantau statusnya dari aplikasi. Pencetakan dan penandatanganan surat tetap mengikuti tata cara yang berlaku di desa Anda.",
      },
      {
        question: "Apakah kop surat bisa memakai logo desa kami?",
        answer:
          "Bisa. Kop surat memakai data desa Anda, dan tata letak logonya dapat dipilih.",
      },
      PRICE_FAQ,
    ],
    related: ["aplikasi-lppd-lkppd", "aplikasi-rkp-desa", "aplikasi-apbdes"],
  },
  {
    slug: "aplikasi-apbdes",
    shortName: "APB Desa",
    h1: "Aplikasi APBDes: Penganggaran, SPP, dan Buku Kas Umum dalam Satu Alur",
    title: "Aplikasi APBDes — APB Desa, SPP & Buku Kas Umum",
    description:
      "Aplikasi APBDes untuk desa: APB Desa awal dan perubahan, DPA, SPP, dan Buku Kas Umum menurut Permendagri 20/2018. Belanja tidak melebihi pagu. Coba gratis.",
    keywords: [
      "aplikasi APBDes",
      "aplikasi keuangan desa",
      "APB Desa",
      "aplikasi buku kas umum desa",
      "aplikasi SPP desa",
      "Permendagri 20 2018",
    ],
    intro:
      "Pengelolaan keuangan desa menuntut ketertiban dari penganggaran sampai pertanggungjawaban. Klandesa mencatat APB Desa, DPA, SPP, dan Buku Kas Umum menurut Permendagri 20/2018, dengan pengaman yang mencegah belanja melampaui pagu.",
    problems: [
      {
        title: "Belanja melampaui pagu tanpa disadari",
        body: "Di Klandesa, belanja tidak bisa melebihi pagu anggaran, sehingga kelebihan terdeteksi sebelum tercatat.",
      },
      {
        title: "Laporan disusun ulang dari nol",
        body: "Transaksi yang dicatat sepanjang bulan menjadi bahan Buku Kas Umum dan pelaporan, tanpa rekap manual terpisah.",
      },
      {
        title: "Anggaran terlepas dari perencanaan",
        body: "Anggaran dihubungkan dengan kegiatan RKP Desa dan diberi penanda tujuan SDGs, sehingga jelas program mana yang dibiayai.",
      },
    ],
    features: [
      {
        title: "APB Desa awal dan perubahan",
        body: "Susun APB Desa awal maupun perubahan, lengkap dengan DPA, mengikuti Permendagri 20/2018.",
      },
      {
        title: "SPP dan Buku Kas Umum",
        body: "Catat permintaan pembayaran dan transaksi kas desa dalam Buku Kas Umum.",
      },
      {
        title: "Pagu yang menjaga belanja",
        body: "Belanja tidak bisa melebihi pagu, dan bulan berjalan dapat ditutup setelah pencatatan selesai.",
      },
      {
        title: "Penanda belanja SDGs",
        body: "Kas dan belanja dapat ditandai ke tujuan SDGs untuk membaca arah pembangunan desa.",
      },
      {
        title: "Kalender kepatuhan",
        body: "Tenggat laporan wajib per tahun anggaran lengkap dengan status otomatis dan pengingat.",
      },
      {
        title: "Hak akses menurut peran",
        body: "Pencatatan keuangan dibatasi untuk akun yang berwenang, dengan jejak audit tindakan tulis.",
      },
    ],
    steps: [
      {
        title: "Susun APB Desa",
        body: "Masukkan pagu pendapatan dan belanja, lalu hubungkan dengan kegiatan hasil perencanaan.",
      },
      {
        title: "Catat SPP dan transaksi",
        body: "Setiap pencairan dan transaksi dicatat ke Buku Kas Umum selama tahun berjalan.",
      },
      {
        title: "Tutup bulan dan laporkan",
        body: "Tutup bulan setelah pencatatan lengkap, lalu gunakan datanya untuk pelaporan desa.",
      },
    ],
    faqs: [
      {
        question: "Apakah aplikasi ini mengikuti Permendagri 20/2018?",
        answer:
          "Ya. Modul APB Desa menyusun APB Desa awal dan perubahan, DPA, SPP, dan Buku Kas Umum menurut Permendagri 20/2018.",
      },
      {
        question: "Apakah belanja bisa melebihi pagu anggaran?",
        answer:
          "Tidak. Belanja yang melampaui pagu tidak dapat dicatat, dan bulan yang sudah selesai dapat ditutup.",
      },
      {
        question: "Apakah data keuangan terhubung dengan perencanaan desa?",
        answer:
          "Ya. APB Desa dihubungkan dengan kegiatan RKP Desa, dan belanja dapat ditandai ke tujuan SDGs.",
      },
      PRICE_FAQ,
    ],
    related: ["aplikasi-dana-desa", "aplikasi-rkp-desa", "aplikasi-lppd-lkppd"],
  },
  {
    slug: "aplikasi-dana-desa",
    shortName: "Dana Desa",
    h1: "Aplikasi Dana Desa 2026: Kepatuhan, Penyaluran, BLT, dan Padat Karya Tunai",
    title: "Aplikasi Dana Desa 2026 — Kepatuhan & Penyaluran",
    description:
      "Aplikasi Dana Desa 2026: 8 fokus dan 8 larangan beserta dasar pasalnya, kesiapan penyaluran tahap I/II, BLT, dan Padat Karya Tunai. Coba gratis 14 hari.",
    keywords: [
      "aplikasi Dana Desa",
      "aplikasi Dana Desa 2026",
      "larangan penggunaan Dana Desa",
      "penyaluran Dana Desa tahap 1",
      "padat karya tunai desa",
    ],
    intro:
      "Dana Desa datang dengan aturan penggunaan yang terus diperbarui. Modul Dana Desa Klandesa memuat kepatuhan Dana Desa 2026: 8 fokus penggunaan, 8 larangan lengkap dengan dasar pasalnya, publikasi, dan kesiapan penyaluran tahap I dan II, supaya perangkat desa tidak harus menafsirkan aturan sendiri.",
    problems: [
      {
        title: "Aturan penggunaan sulit diingat",
        body: "Delapan fokus dan delapan larangan ditampilkan lengkap dengan dasar pasalnya, sehingga rujukannya jelas.",
      },
      {
        title: "Kesiapan penyaluran baru diketahui mendadak",
        body: "Kesiapan penyaluran tahap I dan II dipantau di aplikasi, jadi kekurangan terlihat lebih awal.",
      },
      {
        title: "BLT dan padat karya tercatat terpisah",
        body: "BLT Desa dan Padat Karya Tunai ada dalam satu aplikasi yang sama dengan APB Desa dan data warga.",
      },
    ],
    features: [
      {
        title: "Kepatuhan Dana Desa 2026",
        body: "8 fokus, 8 larangan lengkap dengan dasar pasal, publikasi, dan kesiapan penyaluran tahap I/II.",
      },
      {
        title: "BLT Desa",
        body: "Penerima per keluarga, batas nilai menurut aturan tahun berjalan, pembayaran per bulan, dan lampiran SK siap cetak.",
      },
      {
        title: "Padat Karya Tunai Desa",
        body: "Pekerja prioritas, upah harian, dan pemantau bagian upah minimal 50% dari biaya kegiatan.",
      },
      {
        title: "Pengadaan barang/jasa",
        body: "Catat pengadaan dengan tim pelaksana kegiatan (TPK) dan aturan swakelola menurut Peraturan LKPP 12/2019.",
      },
      {
        title: "Terhubung ke APB Desa",
        body: "Penggunaan Dana Desa berjalan di data keuangan yang sama dengan APB Desa dan Buku Kas Umum.",
      },
      {
        title: "Laporan dan kalender kepatuhan",
        body: "Tenggat laporan wajib dan rekap kepatuhan tersedia di satu kalender.",
      },
    ],
    steps: [
      {
        title: "Periksa kepatuhan",
        body: "Tinjau fokus penggunaan dan larangan beserta dasar pasalnya sebelum kegiatan dianggarkan.",
      },
      {
        title: "Jalankan kegiatan",
        body: "Catat BLT, Padat Karya Tunai, dan pengadaan pada kegiatan yang dibiayai Dana Desa.",
      },
      {
        title: "Pantau penyaluran dan laporan",
        body: "Lihat kesiapan penyaluran tahap I dan II serta tenggat laporan dari kalender kepatuhan.",
      },
    ],
    faqs: [
      {
        question: "Apakah aplikasi memuat larangan penggunaan Dana Desa?",
        answer:
          "Ya. Modul Dana Desa memuat 8 larangan lengkap dengan dasar pasalnya, di samping 8 fokus penggunaan untuk 2026.",
      },
      {
        question: "Apakah Padat Karya Tunai Desa didukung?",
        answer:
          "Ya. Anda dapat mencatat pekerja prioritas dan upah harian, serta memantau bagian upah minimal 50% dari biaya kegiatan.",
      },
      {
        question: "Apakah aturan Dana Desa diperbarui?",
        answer:
          "Modul disusun mengikuti teks peraturan tahun berjalan, termasuk batas nilai BLT menurut aturan tahun itu. Selalu rujuk peraturan resmi untuk keputusan akhir di desa Anda.",
      },
      PRICE_FAQ,
    ],
    related: ["aplikasi-blt-desa", "aplikasi-apbdes", "aplikasi-lppd-lkppd"],
  },
  {
    slug: "aplikasi-blt-desa",
    shortName: "BLT Desa",
    h1: "Aplikasi BLT Desa: Penerima per Keluarga, Pembayaran Bulanan, SK Siap Cetak",
    title: "Aplikasi BLT Desa — Penerima, Bayar Bulanan & SK",
    description:
      "Aplikasi BLT Desa: catat penerima per keluarga, batas nilai menurut aturan tahun berjalan, pembayaran per bulan, dan lampiran SK siap cetak.",
    keywords: [
      "aplikasi BLT Desa",
      "BLT Dana Desa",
      "pendataan penerima BLT desa",
      "SK penerima BLT desa",
      "bantuan langsung tunai desa",
    ],
    intro:
      "Penyaluran BLT Desa melibatkan banyak keluarga, banyak bulan, dan banyak lampiran. Modul BLT Klandesa mencatat penerima per keluarga, memeriksa batas nilai menurut aturan tahun berjalan, mencatat pembayaran per bulan, dan menyiapkan lampiran SK yang siap dicetak.",
    problems: [
      {
        title: "Daftar penerima tercecer di beberapa berkas",
        body: "Penerima dicatat per keluarga di aplikasi yang sama dengan data warga dan KK.",
      },
      {
        title: "Pembayaran bulanan sulit dilacak",
        body: "Setiap pembayaran dicatat per bulan sehingga riwayat tiap keluarga bisa ditelusuri.",
      },
      {
        title: "Lampiran SK disusun manual",
        body: "Lampiran SK dibuat dari data yang sudah tercatat dan siap cetak.",
      },
    ],
    features: [
      {
        title: "Penerima per keluarga",
        body: "Pencatatan penerima mengikuti struktur KK yang sudah ada di data desa.",
      },
      {
        title: "Batas nilai menurut aturan tahun berjalan",
        body: "Nilai bantuan diperiksa terhadap batas yang berlaku pada tahun tersebut.",
      },
      {
        title: "Pembayaran per bulan",
        body: "Catat realisasi pembayaran tiap bulan untuk setiap keluarga penerima.",
      },
      {
        title: "Lampiran SK siap cetak",
        body: "Hasilkan lampiran SK penerima dari data yang tercatat.",
      },
      {
        title: "Program keluarga lain",
        body: "Penerima program sosial lain dicatat di modul Bantuan Program Keluarga, terhubung dengan data warga.",
      },
      {
        title: "Satu paket dengan Dana Desa",
        body: "BLT berjalan bersama modul Dana Desa dan APB Desa dalam satu aplikasi.",
      },
    ],
    steps: [
      {
        title: "Tetapkan penerima",
        body: "Pilih keluarga penerima dari data warga setelah melalui proses penetapan di desa.",
      },
      {
        title: "Catat pembayaran bulanan",
        body: "Isi realisasi tiap bulan, dengan batas nilai yang diperiksa otomatis.",
      },
      {
        title: "Cetak lampiran SK",
        body: "Unduh dan cetak lampiran SK penerima untuk arsip dan pelaporan.",
      },
    ],
    faqs: [
      {
        question: "Apakah aplikasi menentukan siapa yang berhak menerima BLT?",
        answer:
          "Tidak. Penetapan penerima tetap melalui proses di desa; aplikasi membantu mencatat, memeriksa batas nilai, dan menyiapkan lampiran.",
      },
      {
        question: "Apakah batas nilai BLT diperbarui tiap tahun?",
        answer:
          "Pemeriksaan mengikuti batas nilai menurut aturan tahun berjalan. Rujuk peraturan resmi untuk keputusan akhir.",
      },
      {
        question: "Bisakah lampiran SK dicetak?",
        answer: "Bisa. Lampiran SK penerima tersedia dalam bentuk siap cetak.",
      },
      PRICE_FAQ,
    ],
    related: ["aplikasi-dana-desa", "aplikasi-apbdes", "aplikasi-surat-desa"],
  },
  {
    slug: "aplikasi-rkp-desa",
    shortName: "RKP Desa",
    h1: "Aplikasi RKP Desa: dari Musyawarah Desa sampai Dokumen Perencanaan",
    title: "Aplikasi RKP Desa — Musdes, RPJM Desa & Tenggat",
    description:
      "Aplikasi RKP Desa: catat Musyawarah Desa, siklus RKP Desa dengan tenggat dihitung otomatis, dan selaraskan dengan APB Desa dan RPJM Desa. Coba gratis.",
    keywords: [
      "aplikasi RKP Desa",
      "cara membuat RKP Desa",
      "aplikasi musyawarah desa",
      "aplikasi RPJM Desa",
      "perencanaan pembangunan desa",
    ],
    intro:
      "Perencanaan desa berjalan dalam siklus: Musyawarah Desa, RKP Desa, lalu APB Desa. Klandesa menghubungkan ketiganya, dengan tenggat RKP Desa yang dihitung otomatis dan keselarasan dengan anggaran yang bisa diperiksa.",
    problems: [
      {
        title: "Tenggat dokumen terlewat",
        body: "Tenggat dihitung otomatis: Perdes RKP Desa 30 September dan daftar usulan 31 Desember.",
      },
      {
        title: "Hasil musyawarah tidak terdokumentasi rapi",
        body: "Jadwal, peserta per unsur, daftar hadir, keputusan bernomor, dan berita acara tercatat dan bisa dicetak.",
      },
      {
        title: "Rencana dan anggaran berjalan sendiri-sendiri",
        body: "Keselarasan RKP Desa dengan APB Desa dapat diperiksa langsung di aplikasi.",
      },
    ],
    features: [
      {
        title: "Musyawarah Desa",
        body: "Jadwal, peserta per unsur, daftar hadir, keputusan bernomor, dan berita acara yang bisa dicetak.",
      },
      {
        title: "Siklus RKP Desa",
        body: "Tahapan RKP Desa dengan tenggat dihitung otomatis dan keselarasan dengan APB Desa.",
      },
      {
        title: "RPJM Desa",
        body: "Tahapan penyusunan RPJM Desa (periode 8 tahun) dari tim penyusun sampai ditetapkan.",
      },
      {
        title: "Usulan dengan bobot SDGs",
        body: "Rencana pembangunan, RKPDes, dan usulan Musdes dihubungkan dengan bobot SDGs.",
      },
      {
        title: "Kerja sama desa",
        body: "Catat kerja sama antar-desa dan dengan pihak ketiga menurut Permendagri 96/2017.",
      },
      {
        title: "Impor hasil IDM",
        body: "Impor hasil Indeks Desa Membangun untuk dipantau bersama perencanaan.",
      },
    ],
    steps: [
      {
        title: "Catat Musyawarah Desa",
        body: "Rekam jadwal, kehadiran, keputusan, dan berita acara musyawarah.",
      },
      {
        title: "Susun RKP Desa",
        body: "Jalankan tahapan RKP Desa mengikuti tenggat yang dihitung otomatis.",
      },
      {
        title: "Selaraskan dengan APB Desa",
        body: "Periksa kegiatan RKP Desa terhadap anggaran sebelum ditetapkan.",
      },
    ],
    faqs: [
      {
        question: "Kapan tenggat RKP Desa?",
        answer:
          "Aplikasi menghitung tenggat secara otomatis: Perdes RKP Desa pada 30 September dan daftar usulan pada 31 Desember. Pastikan juga mengacu pada peraturan daerah Anda.",
      },
      {
        question: "Apakah aplikasi mencatat berita acara Musyawarah Desa?",
        answer:
          "Ya. Jadwal, peserta per unsur, daftar hadir, keputusan bernomor, dan berita acara dapat dicetak.",
      },
      {
        question: "Apakah RPJM Desa juga tersedia?",
        answer:
          "Ya. Tahapan penyusunan RPJM Desa (periode 8 tahun) tersedia, dari tim penyusun sampai ditetapkan.",
      },
      PRICE_FAQ,
    ],
    related: ["aplikasi-apbdes", "aplikasi-dana-desa", "aplikasi-lppd-lkppd"],
  },
  {
    slug: "aplikasi-lppd-lkppd",
    shortName: "Laporan kepala desa",
    h1: "Aplikasi LPPD dan LKPPD Desa: Laporan Kepala Desa dari Data yang Sudah Ada",
    title: "Aplikasi LPPD & LKPPD Desa — Laporan Kepala Desa",
    description:
      "Aplikasi laporan desa: susun LPPD, LKPPD, dan LPPD akhir masa jabatan dengan data APB Desa dan penduduk terisi otomatis, plus kalender tenggat laporan wajib.",
    keywords: [
      "aplikasi LPPD desa",
      "aplikasi LKPPD desa",
      "laporan kepala desa",
      "tenggat laporan desa",
      "kalender laporan desa",
    ],
    intro:
      "Laporan kepala desa sebaiknya tidak disusun dari awal tiap tahun. Klandesa mengisi data APB Desa dan penduduk secara otomatis ke dalam LPPD, LKPPD, dan LPPD akhir masa jabatan, dan menyediakan kalender yang mengingatkan tenggat laporan wajib.",
    problems: [
      {
        title: "Menyusun laporan dari nol",
        body: "Data APB Desa dan penduduk terisi otomatis, sehingga laporan memakai data yang sama dengan operasional harian.",
      },
      {
        title: "Tenggat laporan terlewat",
        body: "Kalender laporan wajib per tahun anggaran menampilkan tenggat, status otomatis, dan pengingat.",
      },
      {
        title: "Kabupaten sulit memantau kepatuhan",
        body: "Rekap kepatuhan tersedia untuk kabupaten yang memantau banyak desa.",
      },
    ],
    features: [
      {
        title: "LPPD, LKPPD, dan LPPD akhir masa jabatan",
        body: "Susun ketiganya dengan data APB Desa dan penduduk yang terisi otomatis.",
      },
      {
        title: "Kalender laporan wajib",
        body: "Tenggat per tahun anggaran, status otomatis dari data aplikasi, dan pengingat.",
      },
      {
        title: "Rekap kepatuhan",
        body: "Ringkasan kepatuhan untuk kabupaten yang membina banyak desa.",
      },
      {
        title: "Statistik penduduk",
        body: "Ringkasan indikator penduduk dengan satu tombol Export ke Excel, CSV, atau PDF.",
      },
      {
        title: "Unduhan format Kemendesa",
        body: "Unduh data dalam format Kemendesa beserta riwayat unduhannya.",
      },
      {
        title: "Ringkasan SDGs desa",
        body: "Skor 18 tujuan SDGs dari data operasional sebagai bahan pembahasan bersama BPD.",
      },
    ],
    steps: [
      {
        title: "Catat data sepanjang tahun",
        body: "Kependudukan, keuangan, dan program tercatat dalam aktivitas harian.",
      },
      {
        title: "Pantau kalender tenggat",
        body: "Lihat status tiap laporan wajib dan terima pengingat sebelum tenggat.",
      },
      {
        title: "Susun dan unduh laporan",
        body: "Gunakan data yang sudah terisi untuk menyusun laporan, lalu unduh sesuai format yang dibutuhkan.",
      },
    ],
    faqs: [
      {
        question: "Laporan apa saja yang bisa disusun?",
        answer:
          "LPPD, LKPPD, dan LPPD akhir masa jabatan, dengan data APB Desa dan penduduk terisi otomatis.",
      },
      {
        question: "Apakah ada pengingat tenggat laporan?",
        answer:
          "Ya. Kalender laporan wajib menampilkan tenggat per tahun anggaran, status otomatis dari data aplikasi, dan pengingat.",
      },
      {
        question: "Apakah data bisa diunduh dalam format Kemendesa?",
        answer:
          "Ya. Unduhan format Kemendesa tersedia beserta riwayat unduhannya. Ini adalah unduhan data, bukan sinkronisasi langsung ke sistem Kemendesa.",
      },
      PRICE_FAQ,
    ],
    related: ["aplikasi-apbdes", "aplikasi-rkp-desa", "aplikasi-dana-desa"],
  },
];

export function getTopicPage(slug: string): TopicPage | undefined {
  return TOPIC_PAGES.find((t) => t.slug === slug);
}

export function listTopicPagePaths(): string[] {
  return ["/fitur", ...TOPIC_PAGES.map((t) => `/fitur/${t.slug}`)];
}
